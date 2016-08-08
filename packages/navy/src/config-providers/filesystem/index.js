/* @flow */

import path from 'path'
import invariant from 'invariant'
import fs from '../../util/fs'
import {Navy} from '../../navy'

import type {ConfigProvider} from '../../config-provider'
import type {State} from '../../navy'

export default function createFileSystemConfigProvider(navy: Navy): ConfigProvider {
  return {
    async getNavyPath(): Promise<string> {
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
      return path.join(await this.getNavyPath(), 'Navyfile.js')
    },

    async refreshConfig(): Promise<bool> {
      // no-op
      return false
    },

    async getLocationDisplayName(): Promise<string> {
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
}

createFileSystemConfigProvider.importCliOptions = []

createFileSystemConfigProvider.getImportOptionsForCLI = (opts) => {
  return {
    configProvider: 'filesystem',
    path: process.cwd(),
  }
}
