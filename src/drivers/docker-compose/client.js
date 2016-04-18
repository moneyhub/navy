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

export function getDockerHost() {
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
