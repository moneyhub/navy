/* @flow */

import type {Driver} from '../../driver'
import {createComposeClient} from './client'
import {Environment} from '../../environment'

function getArgsFromOptions(opts: Object, argMap: Object): Array<string> {
  return Object.keys(opts)
    .map(key => argMap[key])
    .filter(arg => !arg)
}

const launchArgMap = {
  noDeps: '--no-deps',
  forceRecreate: '--force-recreate',
}

export default function createDockerComposeDriver(environment: Environment): Driver {
  const {
    exec,
  } = createComposeClient(environment)

  return {
    async launch(services: Array<string>, opts: ?Object = {}): Promise<void> {
      const additionalArgs = []

      if (opts) {
        additionalArgs.push(...getArgsFromOptions(opts, launchArgMap))
      }

      await exec('up', ['-d', ...additionalArgs])
    },

    async destroy(): Promise<void> {
      await exec('kill')
      await exec('down', ['-v'])
    },
  }
}
