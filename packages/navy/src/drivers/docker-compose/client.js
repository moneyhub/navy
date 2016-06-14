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
  exec(command: string, args: any, composeFile?: string): Promise,
  getCompiledDockerComposePath(): string,
  getOriginalDockerComposePath(): Promise<string>,
  getDockerComposeFilePath(): Promise<string>,
}

export function createComposeClient(navy: Navy): ComposeClient {
  const client = {
    async exec(command: string, args: Array<string> = [], composeFile?: string): Promise<string> {
      if (!composeFile) {
        composeFile = await client.getDockerComposeFilePath()
      }

      const composeArgs = [
        '-f', composeFile,
        '-p', 'navy' + navy.normalisedName,
        command,
        ...args,
      ]

      return await execAsync('docker-compose', composeArgs, childProcess => {
        childProcess.stdout.on('data', data => log(data))
        childProcess.stderr.on('data', data => log(data))
      })
    },

    getCompiledDockerComposePath(): string {
      return path.join(pathToNavy(navy.normalisedName), 'docker-compose.tmp.yml')
    },

    async getOriginalDockerComposePath(): Promise<string> {
      const configProvider: ?ConfigProvider = await navy.getConfigProvider()

      if (!configProvider) {
        throw new Error('No config provider available for navy')
      }

      return configProvider.getDockerComposePath()
    },

    async getDockerComposeFilePath(): Promise<string> {
      try {
        await fs.statAsync(client.getCompiledDockerComposePath())
        return client.getCompiledDockerComposePath()
      } catch (ex) {
        return await client.getOriginalDockerComposePath()
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
