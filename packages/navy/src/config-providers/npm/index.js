/* @flow */

import path from 'path'
import {execSync} from 'child_process'
import invariant from 'invariant'
import bluebird from 'bluebird'
import fs from '../../util/fs'
import {pathToNavyRoot} from '../../navy/state'
import {pathToModule} from './util'

import type {ConfigProvider} from '../../config-provider'
import type {State} from '../../navy'
import type {Navy} from '../../navy'

const mkdirp = bluebird.promisify(require('mkdirp'))

const npmContext = path.join(pathToNavyRoot(), 'npm')
const nodeModulesPath = path.join(npmContext, 'node_modules')

async function tryAndInstall(pkgName: string) {
  await mkdirp(nodeModulesPath)

  try {
    // $FlowIgnore some weird bug with execSync
    execSync(`npm info ${pkgName} name`, { stdio: 'ignore' })
  } catch (ex) {
    throw new Error(`Package "${pkgName}" not found or unreachable`)
  }

  // $FlowIgnore some weird bug with execSync
  execSync(`npm i ${pkgName}`, { stdio: 'inherit', cwd: npmContext })
}

export default function createNpmConfigProvider(navy: Navy): ConfigProvider {
  return {
    async getNavyPath(): Promise<?string> {
      const envState: ?State = await navy.getState()

      invariant(!!envState, 'STATE_NONEXISTANT', navy.name)
      invariant(!!envState.npmPackage, 'NPM_PROVIDER_REQUIRES_PACKAGE', navy.name)

      const navyPath = await pathToModule(nodeModulesPath, envState.npmPackage)

      fs.accessSync(navyPath) // see if path exists

      return navyPath
    },

    async getNavyFilePath(): Promise<string> {
      return path.join(await this.getNavyPath(), 'Navyfile.js')
    },

    async refreshConfig(): Promise<bool> {
      const envState: ?State = await navy.getState()

      invariant(!!envState, 'STATE_NONEXISTANT', navy.name)
      invariant(!!envState.npmPackage, 'NPM_PROVIDER_REQUIRES_PACKAGE', navy.name)

      await tryAndInstall(envState.npmPackage)

      return true
    },

    async getLocationDisplayName(): Promise<?string> {
      const envState: ?State = await navy.getState()

      invariant(!!envState, 'STATE_NONEXISTANT', navy.name)

      return envState.npmPackage
    },

    async isDangling(): Promise<boolean> {
      const envState: ?State = await navy.getState()

      return !envState || !envState.npmPackage
    },
  }
}

createNpmConfigProvider.importCliOptions = [
  ['--npm-package [package]', 'set the NPM package to use for docker compose config'],
]

createNpmConfigProvider.getImportOptionsForCLI = async (opts) => {
  if (opts.npmPackage) {
    await tryAndInstall(opts.npmPackage)

    return {
      configProvider: 'npm',
      npmPackage: opts.npmPackage,
    }
  }
}
