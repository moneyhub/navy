/* @flow */

import path from 'path'
import {execSync} from 'child_process'
import {Navy} from '../../navy'
import fs from '../../util/fs'

import type {ConfigProvider} from '../../config-provider'
import type {State} from '../../navy'

let _cachedNpmPrefix = null

async function tryAndInstall(pkgName) {
  try {
    // $FlowIgnore some weird bug with execSync
    execSync(`npm info ${pkgName} name`, { stdio: 'inherit' })
  } catch (ex) {
    throw new Error(`Package "${pkgName}" not found or unreachable`)
  }

  // $FlowIgnore some weird bug with execSync
  execSync(`npm i -g ${pkgName}`, { stdio: 'inherit' })
}

async function pathToModule(pkgName) {
  if (!_cachedNpmPrefix) {
    _cachedNpmPrefix = execSync('npm config get prefix').toString().trim()
  }

  return path.join(_cachedNpmPrefix, '/lib/node_modules/', pkgName)
}

export default function createNpmConfigProvider(navy: Navy): ConfigProvider {
  return {
    async getNavyPath(): Promise<string> {
      const envState: ?State = await navy.getState()

      if (!envState) {
        throw new Error('State doesn\'t exist for navy')
      }

      if (!envState.npmPackage) {
        throw new Error('NPM config provider requires an NPM package')
      }

      if (!_cachedNpmPrefix) {
        _cachedNpmPrefix = execSync('npm config get prefix').toString().trim()
      }

      const navyPath = await pathToModule(envState.npmPackage)

      await fs.accessAsync(navyPath) // see if path exists

      return navyPath
    },

    async getNavyFilePath(): Promise<string> {
      return path.join(await this.getNavyPath(), 'Navyfile.js')
    },
  }
}

createNpmConfigProvider.importCliOptions = [
  ['--npm-package [package]', 'set the NPM package to use for docker compose config'],
]

createNpmConfigProvider.getImportOptionsForCLI = async (opts) => {
  if (opts.npmPackage) {
    try {
      await fs.accessAsync(await pathToModule(opts.npmPackage))
    } catch (ex) {
      await tryAndInstall(opts.npmPackage)
    }

    return {
      configProvider: 'npm',
      npmPackage: opts.npmPackage,
    }
  }
}
