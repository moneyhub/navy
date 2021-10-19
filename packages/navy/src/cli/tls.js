/* @flow */

import chalk from 'chalk'
import {NavyError} from '../errors'
import {getNavy} from '../navy'
import {getConfig} from '../config'
import {reconfigureHTTPProxy} from '../http-proxy'
import {createTlsCert, generateRootCA} from '../util/tls'
const fs = require('fs')


export default async function (services: string, opts: Object): Promise<void> {
  if (!services || services.length === 0) {
    throw new NavyError('At least one service needed')
  }
  const navy = await getNavy(opts.navy)
  await navy.ensurePluginsLoaded()
  const availableServices = await navy.getAvailableServiceNames()

  const config = await getConfig()
  if (!config.tlsCaDir) {
    throw new NavyError('tlsCaDir config value not set')
  }
  if (!fs.existsSync(`${config.tlsCaDir}/ca.crt`) || !fs.existsSync(`${config.tlsCaDir}/ca.key`)) {
    if (opts.generateca) {
      await generateRootCA()
    } else {
      throw new NavyError(`${config.tlsCaDir}/ca.crt or ${config.tlsCaDir}/ca.key missing! ${opts}`)
    }
  }
  const httpsReadyServices = []
  for (const service of services) {
    if (!availableServices.includes(service)) {
      console.log(`❌ ${service} not found, skipping`)
      continue
    }
    const serviceUrl = await navy.url(service)
    try {
      await createTlsCert(config.tlsCaDir, serviceUrl)
      httpsReadyServices.push(service)
    } catch (error) {
      console.log(error)
      throw new NavyError(`Could not generate TLS cert for ${service}`)
    }
  }

  await reconfigureHTTPProxy({restart: true})

  console.log()
  console.log(chalk.green(`✅ Services ${httpsReadyServices.join(', ')} now accessible via HTTPS🔒`))
  console.log(chalk.green(`📜 Import ${config.tlsCaDir}/ca.crt to your browser to remove 'insecure connection' warning`))
  console.log()
}
