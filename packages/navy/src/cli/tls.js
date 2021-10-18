/* @flow */

import chalk from 'chalk'
import {NavyError} from '../errors'
import {getNavy} from '../navy'
import {getConfig} from '../config'
import {reconfigureHTTPProxy} from '../http-proxy'
import {createTlsCert} from '../util/tls'
const fs = require('fs')


export default async function (services: Array<string>, opts: Object): Promise<void> {
  if (!services || services.length === 0) {
    throw new NavyError('At least one service needed')
  }
  const navy = await getNavy(opts.navy)
  await navy.ensurePluginsLoaded()

  const config = await getConfig()
  if (!config.tlsCaDir) {
    throw new NavyError('tlsCaDir config value not set')
  }
  if (!fs.existsSync(`${config.tlsCaDir}/ca.crt`) || !fs.existsSync(`${config.tlsCaDir}/ca.key`)) {
    throw new NavyError(`${config.tlsCaDir}/ca.crt or ${config.tlsCaDir}/ca.key missing!`)
  }

  for (const service of services) {
    const serviceUrl = await navy.url(service)
    try {
      await createTlsCert(config.tlsCaDir, serviceUrl)
    } catch (error) {
      console.log(error)
      throw new NavyError(`Could not generate TLS cert for ${service}`)
    }
  }

  await reconfigureHTTPProxy({restart: true})

  console.log()
  console.log(chalk.green(`Services ${services.join(',')} now accessible via HTTPS`))
  console.log()
}
