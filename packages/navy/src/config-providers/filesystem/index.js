/* @flow */

import path from 'path'
import invariant from 'invariant'
import fs from '../../util/fs'
import { execAsync } from '../../util/exec-async'

import type { ConfigProvider } from '../../config-provider'
import type { State } from '../../navy'
import type { Navy } from '../../navy'

async function cwdHasValidDockerComposeConfig() {
  try {
    await execAsync('docker compose', ['config'], null, { maxBuffer: Infinity, cwd: process.cwd() })
  } catch (ex) {
    return false
  }

  return true
}

export default function createFileSystemConfigProvider(navy: Navy): ConfigProvider {
  const provider: ConfigProvider = {
    async getNavyPath(): Promise<?string> {
      const envState: ?State = await navy.getState()

      invariant(!!envState, 'STATE_NONEXISTANT', navy.name)
      invariant(!!envState.path, 'FILESYSTEM_PROVIDER_REQUIRES_PATH', navy.name)

      try {
        await fs.statAsync(envState.path)
      } catch (ex) {
        invariant(false, 'FILESYSTEM_PROVIDER_INVALID_PATH', navy.name)
      }

      return envState.path
    },

    async getNavyFilePath(): Promise<string> {
      const navyPath = await provider.getNavyPath()
      invariant(navyPath, 'STATE_NONEXISTANT', navy.name)
      return path.join(navyPath, 'Navyfile.js')
    },

    async refreshConfig(): Promise<boolean> {
      // no-op
      return false
    },

    async getLocationDisplayName(): Promise<?string> {
      const envState: ?State = await navy.getState()

      invariant(!!envState, 'STATE_NONEXISTANT', navy.name)

      return envState.path
    },

    async isDangling(): Promise<boolean> {
      const envState: ?State = await navy.getState()

      if (!envState || !envState.path) {
        return true
      }

      try {
        await fs.statAsync(envState.path)
      } catch (ex) {
        return true
      }

      return false
    },
  }

  return provider
}

createFileSystemConfigProvider.importCliOptions = ([]: Array<Array<string>>)

createFileSystemConfigProvider.getImportOptionsForCLI = async (opts: Object): Promise<Object> => {
  const hasValidComposeConfig = await cwdHasValidDockerComposeConfig()

  invariant(hasValidComposeConfig, 'NO_DOCKER_COMPOSE_FILE')

  return {
    configProvider: 'filesystem',
    path: process.cwd(),
  }
}
