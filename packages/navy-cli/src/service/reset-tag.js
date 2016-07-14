/* @flow */

import chalk from 'chalk'
import {runCLI} from '../util/helper'
import {getNavy} from 'navy'

const definition = `
usage: navy service [-n NAVY] reset-tag [-h] <SERVICE>

Options:
  -n, --navy NAVY      Specifies the navy to use [env: NAVY_NAME] [default: dev]
  -h, --help           Shows usage
`

export default async function () {
  const args = runCLI(definition)
  const navy = getNavy(args['--navy'])

  console.log(chalk.dim('Resetting tags...'))

  const service = args['<SERVICE>']

  await navy.resetTag(service)

  console.log(chalk.green('✔ ' + chalk.bold(service) + ' is no longer using a tag override'))
}
