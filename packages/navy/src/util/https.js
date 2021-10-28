/* @flow */

import path from 'path'
import { getConfig, getConfigDir, DEFAULT_TLS_ROOT_CA_DIR } from '../config'
import { NavyError } from '../errors'
import chalk from 'chalk'
import fs from 'fs'
import { pki, md } from 'node-forge'
import { getNavy } from '../navy'
const debug = require('debug')('navy:https')

export function getCertsPath(create: boolean = false): string {

  const certsPath = path.join(getConfigDir(), 'tls-certs')
  if (!fs.existsSync(certsPath)) {
    if (create) {
      debug(`Create ${certsPath} dir`)
      // $FlowIgnore
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
      // $FlowIgnore
      fs.mkdirSync(tlsRootCaDir, { recursive: true })
    } catch (err) {
      throw new NavyError(err)
    }
  }

  if (fs.existsSync(`${tlsRootCaDir}/ca.crt`) && fs.existsSync(`${tlsRootCaDir}/ca.key`)) {
    debug(`Root CA already exists, skipping generation`)
    return
  }

  debug('Generating Root CA')
  debug('Generating 2048-bit key-pair...')
  const keys = pki.rsa.generateKeyPair(2048)
  debug('Creating self-signed certificate...')
  const cert = pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 5)
  const attrs = [{
    name: 'commonName',
    value: 'navy-dev-ca.local ',
  }, {
    name: 'organizationName',
    value: 'navy-dev',
  }]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)

  cert.setExtensions([{
    name: 'basicConstraints',
    cA: true,

  }, {
    name: 'subjectKeyIdentifier',
  }, {
    name: 'authorityKeyIdentifier',
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

    fs.writeFileSync(tlsRootCaDir + '/ca.key', pem.privateKey)
    fs.writeFileSync(tlsRootCaDir + '/ca.pub.key', pem.publicKey)
    fs.writeFileSync(tlsRootCaDir + '/ca.crt', pem.certificate)

    console.log(chalk.green(`✅ CA Certificate created`))
    console.log(chalk.green(`📜 Import ${tlsRootCaDir}/ca.crt to your browser to remove 'insecure connection' warning`))
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
  const caCertString = fs.readFileSync(`${tlsRootCaDir}/ca.crt`, 'utf8')
  const caKeyString = fs.readFileSync(`${tlsRootCaDir}/ca.key`, 'utf8')

  debug(`Generating cert for ${certName} in ${certsPath}`)

  const privateCAKey = pki.privateKeyFromPem(caKeyString)
  const keys = pki.rsa.generateKeyPair(2048)
  const cert = pki.createCertificate()

  const caCert = pki.certificateFromPem(caCertString)

  cert.publicKey = keys.publicKey
  cert.serialNumber = Math.floor(Math.random() * (99 - 2) + 2).toString()
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
  try {
    cert.setSubject(attrs)
    cert.setIssuer(caCert.subject.attributes)
    cert.setExtensions([{
      name: 'extKeyUsage',
      serverAuth: true,
    }])

    cert.sign(privateCAKey, md.sha256.create())

    // PEM-format keys and cert
    const pem = {
      privateKey: pki.privateKeyToPem(keys.privateKey),
      certificate: pki.certificateToPem(cert),
      // publicKey: pki.publicKeyToPem(keys.publicKey),
    }

    fs.writeFileSync(`${certsPath}/${certName}.key`, pem.privateKey)
    fs.writeFileSync(`${certsPath}/${certName}.crt`, pem.certificate)
    // fs.writeFileSync(`${certsPath}/${certName}.pub.key`, pem.publicKey)

  } catch (e) {
    throw new NavyError(e)
  }

}
