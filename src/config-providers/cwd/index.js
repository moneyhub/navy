/* @flow */

import path from 'path'
import {Environment} from '../../environment'

import type {ConfigProvider} from '../../config-provider'
import type {State} from '../../environment'

export default function createCwdConfigProvider(environment: Environment): ConfigProvider {
  return {
    async getDockerComposePath(): Promise {
      const envState: ?State = await environment.getState()

      if (!envState) {
        throw new Error('State doesn\'t exist for environment')
      }

      if (!envState.configProvider) {
        throw new Error('State missing config provider')
      }

      if (!envState.configProvider.opts) {
        throw new Error('Config provider missing options')
      }

      return path.join(envState.configProvider.opts.path, 'docker-compose.yml')
    },
  }
}
