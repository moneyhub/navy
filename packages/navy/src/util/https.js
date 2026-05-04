/* @flow */

import path from 'path'
import crypto from 'crypto'
import net from 'net'
import { URL } from 'url'
import { getConfig, getConfigDir, DEFAULT_TLS_ROOT_CA_DIR } from '../config'
import { NavyError } from '../errors'
import chalk from 'chalk'
import fs from 'fs'
import { pki, md } from 'node-forge'
import { getNavy } from '../navy'
const debug = require('debug')('navy:https')

/** Random positive DER INTEGER serial (hex), for unique X.509 serialNumber fields. */
function randomSerialHex(numBytes: number = 16): string {
  const buf = crypto.randomBytes(numBytes)
  buf[0] &= 0x7f
  return buf.toString('hex')
}

/** Hostname (or IP string) from a user-supplied URL for TLS CN/SAN. */
export function hostNameFromIssueUrl(urlString: string): string {
  const trimmed = (urlString || '').trim()
  if (!trimmed) {
    throw new NavyError('URL for --issue must not be empty.')
  }
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`
  let parsed
  try {
    parsed = new URL(withScheme)
  } catch (e) {
    throw new NavyError(`Invalid URL for --issue: ${urlString}`)
  }
  if (!parsed.hostname) {
    throw new NavyError(`Could not determine a hostname from URL: ${urlString}`)
  }
  return parsed.hostname
}

function safeCertFileBase(host: string): string {
  return host.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function subjectAltNamesForHost(host: string): Array<Object> {
  if (net.isIP(host)) {
    return [{ type: 7, ip: host }]
  }
  return [{ type: 2, value: host }]
}

function buildSignedLeafPems(certName: string, tlsRootCaDir: string, sanAltNames: Array<Object>): { privateKey: string, certificate: string } {
  const caCertString = fs.readFileSync(`${tlsRootCaDir}/ca.crt`, 'utf8')
  const caKeyString = fs.readFileSync(`${tlsRootCaDir}/ca.key`, 'utf8')

  const privateCAKey = pki.privateKeyFromPem(caKeyString)
  const keys = pki.rsa.generateKeyPair(2048)
  const cert = pki.createCertificate()

  const caCert = pki.certificateFromPem(caCertString)

  cert.publicKey = keys.publicKey
  cert.serialNumber = randomSerialHex(16)
  cert.validity.notBefore = new Date()
  cert.validity.notBefore.setDate(cert.validity.notBefore.getDate() - 1)
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 2)
  const attrs = [{
    name: 'commonName',
    value: certName,
  }, {
    name: 'organizationName',
    value: 'navy-dev',
  }]
  cert.setSubject(attrs)
  cert.setIssuer(caCert.subject.attributes)
  const caSubjectKeyId = caCert.generateSubjectKeyIdentifier().getBytes()
  cert.setExtensions([{
    name: 'basicConstraints',
    cA: false,
    critical: true,
  }, {
    name: 'keyUsage',
    digitalSignature: true,
    keyEncipherment: true,
    critical: true,
  }, {
    name: 'extKeyUsage',
    serverAuth: true,
  }, {
    name: 'subjectAltName',
    altNames: sanAltNames,
  }, {
    name: 'subjectKeyIdentifier',
  }, {
    name: 'authorityKeyIdentifier',
    keyIdentifier: caSubjectKeyId,
  }])

  cert.sign(privateCAKey, md.sha256.create())

  return {
    privateKey: pki.privateKeyToPem(keys.privateKey),
    certificate: pki.certificateToPem(cert),
  }
}

/**
 * Issues a leaf TLS certificate and key for an arbitrary host, signed with the Navy root CA,
 * plus a copy of the root CA PEM for configuring trust / full chain on a non-Navy service.
 */
export async function issueLeafCertForUrl(urlString: string, outputDir: string): Promise<{
  certPath: string,
  keyPath: string,
  caCopyPath: string,
}> {
  const certName = hostNameFromIssueUrl(urlString)
  const tlsRootCaDir = getConfig().tlsRootCaDir || DEFAULT_TLS_ROOT_CA_DIR
  await generateRootCa()

  const out = path.resolve(outputDir)
  // $FlowIgnore
  fs.mkdirSync(out, { recursive: true })

  const base = safeCertFileBase(certName)
  const san = subjectAltNamesForHost(certName)
  let pem
  try {
    pem = buildSignedLeafPems(certName, tlsRootCaDir, san)
  } catch (e) {
    throw new NavyError(e instanceof Error ? e.message : String(e))
  }

  const certPath = path.join(out, `${base}.crt`)
  const keyPath = path.join(out, `${base}.key`)
  const caCertSrc = path.join(tlsRootCaDir, 'ca.crt')
  const caCopyPath = path.join(out, 'navy-root-ca.crt')

  fs.writeFileSync(keyPath, pem.privateKey, { mode: 0o600 })
  fs.writeFileSync(certPath, pem.certificate, { mode: 0o644 })
  fs.copyFileSync(caCertSrc, caCopyPath)

  return { certPath, keyPath, caCopyPath }
}

export function getCertsPath(create: boolean = false): string {

  const certsPath = path.join(getConfigDir(), 'tls-certs')
  if (!fs.existsSync(certsPath)) {
    if (create) {
      debug(`Create ${certsPath} dir`)
      fs.mkdirSync(certsPath, { recursive: true })
    } else {
      return ''
    }

  }
  return certsPath
}

export async function removeCert(opts: Object): Promise<void> {
  const certsPath = getCertsPath()
  const navy = await getNavy(opts.navy)
  const serviceUrl = await navy.url(opts.disable)
  const baseName = serviceUrl.split('//')[1]
  const extensions = ['crt', 'key']

  for (const ext of extensions) {
    const file = `${certsPath}/${baseName}.${ext}`
    if (fs.existsSync(file)) {
      try {
        await fs.unlinkSync(file)
        debug(`File ${file} removed.`)
      } catch (err) {
        throw new NavyError(err)
      }
    }
  }
}

export async function generateRootCa(): Promise<void> {
  const tlsRootCaDir = getConfig().tlsRootCaDir || DEFAULT_TLS_ROOT_CA_DIR
  if (!fs.existsSync(tlsRootCaDir)) {
    debug(`Creating ${tlsRootCaDir} Root CA dir`)
    try {
      fs.mkdirSync(tlsRootCaDir, { recursive: true })
    } catch (err) {
      throw new NavyError(err)
    }
  }

  if (fs.existsSync(`${tlsRootCaDir}/ca.crt`) && fs.existsSync(`${tlsRootCaDir}/ca.key`)) {
    debug('Root CA already exists, skipping generation')
    return
  }

  debug('Generating Root CA')
  debug('Generating 2048-bit key-pair...')
  const keys = pki.rsa.generateKeyPair(2048)
  debug('Creating self-signed certificate...')
  const cert = pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = randomSerialHex(8)
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 5)
  const attrs = [{
    name: 'commonName',
    value: 'navy-dev-ca.local',
  }, {
    name: 'organizationName',
    value: 'navy-dev',
  }]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)

  // Trust stores (macOS keychain, NSS, Windows) expect a CA to assert keyCertSign (and
  // usually cRLSign) on the issuer; leaf certs need SAN + keyUsage for modern TLS clients.
  cert.setExtensions([{
    name: 'basicConstraints',
    cA: true,
    critical: true,
    pathLenConstraint: 0,
  }, {
    name: 'keyUsage',
    keyCertSign: true,
    cRLSign: true,
    critical: true,
  }, {
    name: 'subjectKeyIdentifier',
  }, {
    name: 'authorityKeyIdentifier',
    keyIdentifier: true,
  }])

  try {
    // self-sign certificate
    cert.sign(keys.privateKey, md.sha256.create())

    // PEM-format keys and cert
    const pem = {
      privateKey: pki.privateKeyToPem(keys.privateKey),
      publicKey: pki.publicKeyToPem(keys.publicKey),
      certificate: pki.certificateToPem(cert),
    }

    fs.writeFileSync(tlsRootCaDir + '/ca.key', pem.privateKey, { mode: 0o400 })
    fs.writeFileSync(tlsRootCaDir + '/ca.pub.key', pem.publicKey, { mode: 0o640 })
    fs.writeFileSync(tlsRootCaDir + '/ca.crt', pem.certificate, { mode: 0o640 })

    console.log(chalk.green(`✅ CA Certificate created at ${tlsRootCaDir}/ca.crt`))
    console.log(chalk.yellow('⚠️  Importing a self-signed CA into a browser/truststore/keychain is not advisable ⚠️'))
  } catch (e) {
    throw new NavyError(e)
  }
}

export async function createCert(opts: Object): Promise<void> {
  const tlsRootCaDir = getConfig().tlsRootCaDir || DEFAULT_TLS_ROOT_CA_DIR
  const certName = opts.hostName || opts.serviceUrl.split('//')[1]
  const certsPath = getCertsPath(true)

  if (fs.existsSync(`${certsPath}/${certName}.crt`)) {
    debug(`Certificate for ${certName} already exists, skipping generation`)
    return
  }

  await generateRootCa()

  debug(`Generating cert for ${certName} in ${certsPath}`)

  let commonName = certName
  if (opts.serviceUrl && !opts.hostName) {
    try {
      const hostname = new URL(opts.serviceUrl).hostname
      if (hostname) {
        commonName = hostname
      }
    } catch (e) {
      // keep commonName as certName
    }
  }
  const san = subjectAltNamesForHost(commonName)
  let pem
  try {
    pem = buildSignedLeafPems(commonName, tlsRootCaDir, san)
  } catch (e) {
    throw new NavyError(e instanceof Error ? e.message : String(e))
  }

  fs.writeFileSync(`${certsPath}/${certName}.key`, pem.privateKey)
  fs.writeFileSync(`${certsPath}/${certName}.crt`, pem.certificate)

}
