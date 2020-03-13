/* @flow */

import path from 'path'
import invariant from 'invariant'

import fs from '../../util/fs'
import {execAsync} from '../../util/exec-async'
import {log} from '../../driver-logging'
import {pathToNavy} from '../../navy/state'

import type {ConfigProvider} from '../../config-provider'
import type {Navy} from '../../navy'

export type ComposeClient = {
  exec(command: string, args: any, opts?: Object): Promise<string>,
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
        maxBuffer: maxBuffer || Infinity,
      }
      const composeFilePath = await client.getDockerComposeFilePath()

      if (composeFilePath && !useOriginalDockerComposeFiles) {
        composeArgs.push('-f', composeFilePath)
      } else {
        composeOpts.cwd = await client.getOriginalDockerComposeDirectory()
      }

      composeArgs.push(command, ...args)

      try {
        return await execAsync('docker-compose', composeArgs, childProcess => {
          if (!noLog && !pipeLog) {
            childProcess.stdout.on('data', data => log(data))
            childProcess.stderr.on('data', data => log(data))
          } else if (pipeLog) {
            childProcess.stdout.on('data', data => process.stdout.write(data))
            childProcess.stderr.on('data', data => process.stderr.write(data))
          }
        }, composeOpts)
      } catch (ex) {
        if (ex.message && ex.message.indexOf('Can\'t find a suitable configuration file') !== -1) {
          invariant(false, 'NO_DOCKER_COMPOSE_FILE')
        }

        throw ex
      }
    },

    getCompiledDockerComposePath(): string {
      return path.join(pathToNavy(navy.normalisedName), 'docker-compose.tmp.yml')
    },

    async getOriginalDockerComposeDirectory(): Promise<?string> {
      const configProvider: ?ConfigProvider = await navy.getConfigProvider()

      invariant(configProvider, 'NO_CONFIG_PROVIDER', navy.name)

      return configProvider.getNavyPath()
    },

    async getDockerComposeFilePath(): Promise<?string> {
      try {
        const compiledComposePath = await client.getCompiledDockerComposePath()
        await fs.statAsync(compiledComposePath)
        return compiledComposePath
      } catch (ex) {
        return null
      }
    },
  }

  return client
}
