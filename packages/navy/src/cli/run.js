/* @flow */

import {getNavy} from '../'
import {runCLI} from './util/helper'

const definition = `
usage: navy run [-h] [-n NAVY] [<command> [<args>...]]

Options:
  -n, --navy NAVY      Specifies the navy to use [env: NAVY_NAME] [default: dev]
  -h, --help           Shows usage
`

export default async function (): Promise<void> {
  const args = runCLI(definition)
  const navy = getNavy(args['--navy'])
  await navy.ensurePluginsLoaded()

  if (!args['<command>']) {
    console.log('No command specified, available commands:')
    console.log(Object.keys(navy._registeredCommands).join('\n'))
    return
  }

  await navy.invokeCommand(args['<command>'], args['<args>'])
}
