/* @flow */

import {Environment} from '../../environment'
import {execAsync} from '../../util/exec-async'

import type {ConfigProvider} from '../../config-provider'

const debug = require('debug')('navy:docker-compose:exec')

export type ComposeClient = {
  exec(command: string, args: any): Promise,
}

export function createComposeClient(environment: Environment): ComposeClient {
  return {
    async exec(command: string, args: Array<string> = []): Promise<string> {
      const configProvider: ?ConfigProvider = await environment.getConfigProvider()

      if (!configProvider) {
        throw new Error('No config provider available for environment')
      }

      const composeArgs = [
        '-f', await configProvider.getDockerComposePath(),
        command,
        ...args,
      ]

      debug('Executing ' + composeArgs.join(' '), args)

      return await execAsync('docker-compose', composeArgs)
    },
  }
}
