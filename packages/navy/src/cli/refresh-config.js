/* @flow */

import chalk from 'chalk'
import invariant from 'invariant'
import {getNavy} from '../'
import {startDriverLogging, stopDriverLogging} from '../driver-logging'

export default async function (opts: Object): Promise<void> {
  const navy = getNavy(opts.navy)

  const configProvider = await navy.getConfigProvider()

  invariant(configProvider, 'NO_CONFIG_PROVIDER', navy.name)

  await configProvider.refreshConfig()

  startDriverLogging('Ensuring services are up to date...')
  await navy.reconfigure()
  stopDriverLogging()

  console.log(chalk.green(`Config refreshed for Navy "${opts.navy}"`))
}
