/* @flow */

import path from 'path'
import {Navy} from '../../navy'

import type {ConfigProvider} from '../../config-provider'
import type {State} from '../../navy'

export default function createCwdConfigProvider(navy: Navy): ConfigProvider {
  return {
    async getDockerComposePath(): Promise {
      const envState: ?State = await navy.getState()

      if (!envState) {
        throw new Error('State doesn\'t exist for navy')
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
