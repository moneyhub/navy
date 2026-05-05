/* @flow */

import chalk from 'chalk'
import { NavyError } from '../errors'
import { getNavy } from '../navy'
import { getConfig, getConfigDir, DEFAULT_TLS_ROOT_CA_DIR } from '../config'
import { reconfigureHTTPProxy } from '../http-proxy'
import { createCert, generateRootCa, removeCert } from '../util/https'
import fs from 'fs'


export default async function (services: Array<string>, opts: Object): Promise<void> {
  const tlsRootCaDir = getConfig().tlsRootCaDir || DEFAULT_TLS_ROOT_CA_DIR
  const configDir = getConfigDir()

  if (opts.disable) {
    await removeCert(opts)

    // Guard isInitialised so `--disable` still works when the navy has
    // never been launched (otherwise getNavyFile throws).
    const navy = await getNavy(opts.navy)
    const navyFile = (await navy.isInitialised()) ? await navy.getNavyFile() : undefined
    await reconfigureHTTPProxy({ restart: true, navyFile })

    console.log()
    console.log(chalk.green(`✅ HTTPS for service ${opts.disable} is now disabled`))
    console.log()
    return
  }

  if (!services || services.length === 0) {
    if (!fs.existsSync(`${configDir}/tls-certs`)) return

    const files = fs.readdirSync(`${configDir}/tls-certs`)
    const urls = files.filter((file) => file.endsWith('.crt'))
      .map((crt) => { return `https://${crt.replace('.crt', '')}` })
    for (const url of urls) {
      console.log(`${url}`)
    }
    return
  }

  if (!fs.existsSync(`${tlsRootCaDir}/ca.crt`) || !fs.existsSync(`${tlsRootCaDir}/ca.key`)) {
    await generateRootCa()
  }

  const navy = await getNavy(opts.navy)
  await navy.ensurePluginsLoaded()
  const availableServices = await navy.getAvailableServiceNames()

  const httpsReadyServices = []
  for (const service of services) {
    if (!availableServices.includes(service)) {
      console.log(`❌ ${service} not found, skipping`)
      continue
    }
    const serviceUrl = await navy.url(service)
    try {
      await createCert({ serviceUrl })
      httpsReadyServices.push(service)
    } catch (error) {
      console.log(error)
      throw new NavyError(`Could not generate TLS cert for ${service}`)
    }
  }

  await reconfigureHTTPProxy({ restart: true, navyFile: await navy.getNavyFile() })

  console.log()
  console.log(chalk.green(`✅ Service(s) ${httpsReadyServices.join(', ')} now accessible via HTTPS🔒`))
  console.log()
}
