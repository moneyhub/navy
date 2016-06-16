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
      } = opts

      const composeOpts = {}
      const composeFilePath = await client.getDockerComposeFilePath()

      if (composeFilePath && !useOriginalDockerComposeFiles) {
        composeArgs.push('-f', composeFilePath)
      } else {
        composeOpts.cwd = await client.getOriginalDockerComposeDirectory()
      }

      composeArgs.push(command, ...args)

      return await execAsync('docker-compose', composeArgs, childProcess => {
        if (!noLog) {
          childProcess.stdout.on('data', data => log(data))
          childProcess.stderr.on('data', data => log(data))
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

export function getDockerHost(): string {
  const dockerHost = process.env.DOCKER_HOST

  if (process.env.NAVY_HOST) {
    // Custom host
    return process.env.NAVY_HOST
  }

  if (dockerHost && dockerHost.indexOf('tcp://') !== -1) {
    // OSX with docker-machine, or a remote docker
    // dockerHost will be formatted like:
    // tcp://_._._._:_
    // We only care about the IP address

    let ip = dockerHost.substring('tcp://'.length)
    ip = ip.substring(0, ip.lastIndexOf(':')).trim()

    return ip
  }

  // No custom docker host, assume localhost
  return 'localhost'
}
