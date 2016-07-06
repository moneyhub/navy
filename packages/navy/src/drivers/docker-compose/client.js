/* @flow */

import path from 'path'
import bluebird from 'bluebird'

import {Navy} from '../../navy'
import {execAsync} from '../../util/exec-async'
import {log} from '../../driver-logging'
import {pathToNavy} from '../../navy/state'

import type {ConfigProvider} from '../../config-provider'

const fs = bluebird.promisifyAll(require('fs'))

export type ComposeClient = {
  exec(command: string, args: any, opts?: Object): Promise,
  getCompiledDockerComposePath(): string,
  getDockerComposeFilePath(): Promise<?string>,
}

export type ExecOpts = {
  useOriginalDockerComposeFiles?: boolean,
  noLog?: boolean,
  pipeLog?: boolean,
  maxBuffer?: number,
}

export function createComposeClient(navy: Navy): ComposeClient {
  const client = {
    async exec(command: string, args: Array<string> = [], opts?: ExecOpts = {}): Promise<string> {
      const composeArgs = [
        '-p', navy.normalisedName,
      ]

      const {
        useOriginalDockerComposeFiles,
        noLog,
        pipeLog,
        maxBuffer,
      } = opts

      const composeOpts: Object = {
        maxBuffer: maxBuffer || 1024 * 1024,
      }
      const composeFilePath = await client.getDockerComposeFilePath()

      if (composeFilePath && !useOriginalDockerComposeFiles) {
        composeArgs.push('-f', composeFilePath)
      } else {
        composeOpts.cwd = await client.getOriginalDockerComposeDirectory()
      }

      composeArgs.push(command, ...args)

      return await execAsync('docker-compose', composeArgs, childProcess => {
        if (!noLog && !pipeLog) {
          childProcess.stdout.on('data', data => log(data))
          childProcess.stderr.on('data', data => log(data))
        } else if (pipeLog) {
          childProcess.stdout.on('data', data => process.stdout.write(data))
          childProcess.stderr.on('data', data => process.stderr.write(data))
        }
      }, composeOpts)
    },

    getCompiledDockerComposePath(): string {
      return path.join(pathToNavy(navy.normalisedName), 'docker-compose.tmp.yml')
    },

    async getOriginalDockerComposeDirectory(): Promise<string> {
      const configProvider: ?ConfigProvider = await navy.getConfigProvider()

      if (!configProvider) {
        throw new Error('No config provider available for navy')
      }

      return configProvider.getNavyPath()
    },

    async getDockerComposeFilePath(): Promise<?string> {
      try {
        await fs.statAsync(client.getCompiledDockerComposePath())
        return client.getCompiledDockerComposePath()
      } catch (ex) {
        return null
      }
    },
  }

  return client
}
