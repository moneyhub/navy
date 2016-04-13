/* @flow */

import {spawn} from 'child_process'
import {Environment} from '../../environment'

import type {ConfigProvider} from '../../config-provider'

const debug = require('debug')('navy:docker-compose:exec')

export type ComposeClient = {
  exec(command: string, args: any): Promise,
}

export function createComposeClient(environment: Environment): ComposeClient {
  return {
    async exec(command: string, args: Array<string> = []): Promise {
      debug('Executing ' + command, args)

      const configProvider: ?ConfigProvider = await environment.getConfigProvider()

      if (!configProvider) {
        throw new Error('No config provider available for environment')
      }

      const childProcess = spawn('docker-compose', [
        '-f', await configProvider.getDockerComposePath(),
        command,
        ...args,
      ])

      childProcess.stdout.on('data', line => debug('out: ' + line.toString()))
      childProcess.stderr.on('data', line => debug('err: ' + line.toString()))

      return await new Promise((resolve, reject) => {
        childProcess.on('exit', code => {
          if (code > 0) {
            reject(code)
          } else {
            resolve(code)
          }
        })

        childProcess.on('error', reject)
      })
    },
  }
}
