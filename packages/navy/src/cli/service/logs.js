/* @flow */

import {getNavy} from '../../'
import {runCLI} from '../util/helper'

const definition = `
usage: navy service|s [-n NAVY] logs [-h] [<SERVICE>...]

Options:
  -n, --navy NAVY      Specifies the navy to use [env: NAVY_NAME] [default: dev]
  -h, --help           Shows usage
`

export default async function (): Promise<void> {
  const args = runCLI(definition)
  const env = getNavy(args['--navy'])

  await env.spawnLogStream(args['<SERVICE>'])
}
