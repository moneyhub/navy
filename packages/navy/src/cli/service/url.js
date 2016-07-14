/* @flow */

import {runCLI} from '../util/helper'
import {getNavy} from '../../'

const definition = `
usage: navy service [-n NAVY] url [-h] <SERVICE>

Options:
  -n, --navy NAVY      Specifies the navy to use [env: NAVY_NAME] [default: dev]
  -h, --help           Shows usage
`

export default async function () {
  const args = runCLI(definition)
  const navy = getNavy(args['--navy'])

  console.log(await navy.url(args['<SERVICE>']))
}
