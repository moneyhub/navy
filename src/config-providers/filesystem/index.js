/* @flow */

import path from 'path'
import {Navy} from '../../navy'

import type {ConfigProvider} from '../../config-provider'
import type {State} from '../../navy'

export default function createFileSystemConfigProvider(navy: Navy): ConfigProvider {
  return {
    async getDockerComposePath(): Promise {
      const envState: ?State = await navy.getState()

      if (!envState) {
        throw new Error('State doesn\'t exist for navy')
      }

      if (!envState.path) {
        throw new Error('File system config provider requires a path')
      }

      return path.join(envState.path, 'docker-compose.yml')
    },
  }
}
