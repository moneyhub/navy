/* @flow */

import chalk from 'chalk'
import {runCLI} from '../util/helper'
import {getNavy} from 'navy'

const definition = `
usage: navy service [-n NAVY] use-tag [-h] <SERVICE> <TAG>

Options:
  -n, --navy NAVY      Specifies the navy to use [env: NAVY_NAME] [default: dev]
  -h, --help           Shows usage
`

export default async function () {
  const args = runCLI(definition)
  const navy = getNavy(args['--navy'])

  console.log(chalk.dim('Overriding tags...'))

  const service = args['<SERVICE>']
  const tag = args['<TAG>']

  await navy.useTag(service, tag)

  console.log(chalk.green('✔ ' + chalk.bold(service) + ' is now running ' + chalk.cyan('@ ' + tag)))
}
