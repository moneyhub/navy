import {execAsync} from '../util/exec-async'
import path from 'path'
import {getConfig} from '../config'
import invariant from 'invariant'
import {NavyError} from '../errors'
const fs = require('fs')

export async function getTlsConfigPath(create: boolean = false): string {

  const home = process.env.HOME
  invariant(home, 'NO_HOME_DIRECTORY')

  const tlsConfigPath = path.join(home, '.navy', 'certs')
  if (!fs.existsSync(tlsConfigPath)) {
    if (create) {
      fs.mkdirSync(tlsConfigPath, { recursive: true })
    } else {
      return null
    }

  }
  return tlsConfigPath
}

export async function generateRootCA(): Promise<void> {
  const config = getConfig()

  try {
    await execAsync('openssl', ['ecparam', '-out', `${config.tlsCaDir}/ca.key`, '-name', 'prime256v1', '-genkey'])
    await execAsync('openssl', ['req', '-new', '-sha256', '-key', `${config.tlsCaDir}/ca.key`,
      '-subj', '/CN=moneyhub-dev-ca.local', '-out', `${config.tlsCaDir}/ca.csr`,
      '-config', path.join(__dirname, '../../resources/service.cnf')])
    await execAsync('openssl', ['x509', '-req', '-sha256', '-days', '10000', '-in', `${config.tlsCaDir}/ca.csr`,
      '-signkey', `${config.tlsCaDir}/ca.key`, '-out', `${config.tlsCaDir}/ca.crt`])
    console.log(`🔐 Self-signed CA generated, path ${config.tlsCaDir}/ca.crt`)
  } catch (e) {
    throw new NavyError(e)
  }
}
export async function createTlsCert(tlsCaDir: string, serviceUrl: string): Promise<void> {
  const certName = serviceUrl.split('//')[1]
  const tlsConfigPath = await getTlsConfigPath(true)

  try {
    await execAsync('openssl', ['ecparam', '-out', `${tlsConfigPath}/${certName}.key`,
      '-name', 'prime256v1', '-genkey'])

    await execAsync('openssl', ['req', '-new', '-sha256', '-key', `${tlsConfigPath}/${certName}.key`,
      '-subj', `/CN=${certName}`, '-out', `${tlsConfigPath}/${certName}.csr`,
      '-config', path.join(__dirname, '../../resources/service.cnf')])

    await execAsync('openssl', ['x509', '-req', '-in', `${tlsConfigPath}/${certName}.csr`, '-CA', `${tlsCaDir}/ca.crt`,
      '-CAkey', `${tlsCaDir}/ca.key`, '-CAcreateserial',
      '-out', `${tlsConfigPath}/${certName}.crt`, '-days', '365', '-sha256'])
  } catch (e) {
    throw new NavyError(e)
  }

}
