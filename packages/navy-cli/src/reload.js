/* @flow */

import chalk from 'chalk'
import {getNavy} from 'navy'
import {NavyError} from 'navy/lib/errors'
import {runCLI} from './util/helper'

const definition = `
usage: navy reload [-h] [-n NAVY]

Options:
  -n, --navy NAVY      Specifies the navy to use [env: NAVY_NAME] [default: dev]
  -h, --help           Shows usage
`

export default async function (): Promise<void> {
  const args = runCLI(definition)
  const navy = getNavy(args['--navy'])

  const configProvider = await navy.getConfigProvider()

  if (!configProvider) {
    throw new NavyError('Could not resolve config provider')
  }

  if (!await configProvider.refreshConfig()) {
    return console.log(chalk.dim('Nothing to do'))
  }

  console.log(chalk.green(`Reloaded formation for Navy "${navy.name}"`))
}
