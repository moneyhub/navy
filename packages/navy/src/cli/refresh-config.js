/* @flow */

import chalk from 'chalk'
import invariant from 'invariant'
import {getNavy} from '../'

export default async function (opts: Object): Promise<void> {
  const navy = getNavy(opts.navy)

  const configProvider = await navy.getConfigProvider()

  invariant(configProvider, 'NO_CONFIG_PROVIDER', navy.name)

  if (!await configProvider.refreshConfig()) {
    return console.log(chalk.dim('Nothing to do'))
  }

  console.log(chalk.green(`Config refreshed for Navy "${opts.navy}"`))
}
