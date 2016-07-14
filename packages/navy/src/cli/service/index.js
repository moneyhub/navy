/* @flow */

import {runAndInvokeCLI} from '../util/helper'

const definition = `
usage: navy service [-n NAVY] [-h] [<command> [<args>]...]

All service commands operate on services belonging to a Navy.

Commands:
  ls           List all the launched services
  launch       Launches the given services
  start        Starts the given services
  stop         Stops the given services
  restart      Restarts the given services
  kill         Instantly kills the given services
  rm           Removes the given services if they are stopped
  update       Pulls the given services' images from their respective registries and relaunches them
  updates      Lists all the launched services and whether they have upstream updates available
  logs         Streams the logs for the given services
  use-tag      Uses a specific tag for the given service
  reset-tag    Resets any tag override on the given service
  port         Prints the external port which corresponds to the given internal port of a service
  url          Prints the external URL for the given service if it is a web service

Options:
  -n, --navy NAVY            Specifies the navy to use [env: NAVY_NAME] [default: dev]
  -h, --help                 Shows usage
`

const commandMap = {
  'ls': require('./ls'),
  'launch': require('./launch'),
  'start': require('./start'),
  'stop': require('./stop'),
  'restart': require('./restart'),
  'kill': require('./kill'),
  'rm': require('./rm'),
  'update': require('./update'),
  'updates': require('./updates'),
  'logs': require('./logs'),
  'use-tag': require('./use-tag'),
  'reset-tag': require('./reset-tag'),
  'port': require('./port'),
  'url': require('./url'),
}

export default async function (args: Object) {
  await runAndInvokeCLI(definition, commandMap, { argv: ['service'].concat(args['<args>']), parentArgs: args })
}
