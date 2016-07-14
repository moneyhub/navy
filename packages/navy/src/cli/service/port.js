/* @flow */

import {runCLI} from '../util/helper'
import {getNavy} from '../../'

const definition = `
usage: navy service [-n NAVY] port [-h] <SERVICE> <PORT>

Options:
  -n, --navy NAVY      Specifies the navy to use [env: NAVY_NAME] [default: dev]
  -h, --help           Shows usage
`

export default async function () {
  const args = runCLI(definition)
  const navy = getNavy(args['--navy'])

  console.log(await navy.port(args['<SERVICE>'], args['<PORT>']))
}
