/* @flow */

import {Navy} from '../../navy'
import {execAsync} from '../../util/exec-async'
import {log} from '../../driver-logging'

import type {ConfigProvider} from '../../config-provider'

export type ComposeClient = {
  exec(command: string, args: any): Promise,
}

export function createComposeClient(navy: Navy): ComposeClient {
  return {
    async exec(command: string, args: Array<string> = []): Promise<string> {
      const configProvider: ?ConfigProvider = await navy.getConfigProvider()

      if (!configProvider) {
        throw new Error('No config provider available for navy')
      }

      const composeArgs = [
        '-f', await configProvider.getDockerComposePath(),
        '-p', 'navy' + navy.normalisedName,
        command,
        ...args,
      ]

      return await execAsync('docker-compose', composeArgs, childProcess => {
        childProcess.stdout.on('data', data => log(data))
        childProcess.stderr.on('data', data => log(data))
      })
    },
  }
}
