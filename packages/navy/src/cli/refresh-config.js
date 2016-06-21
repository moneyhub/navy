/* @flow */

import chalk from 'chalk'
import {getNavy} from '../'
import {NavyError} from '../errors'

export default async function (opts: Object): Promise<void> {
  const navy = getNavy(opts.navy)

  const configProvider = await navy.getConfigProvider()

  if (!configProvider) {
    throw new NavyError('Could not resolve config provider')
  }

  if (!await configProvider.refreshConfig()) {
    return console.log(chalk.dim('Nothing to do'))
  }

  console.log(chalk.green(`Config refreshed for Navy "${opts.navy}"`))
}
