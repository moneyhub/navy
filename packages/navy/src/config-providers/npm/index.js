/* @flow */

import path from 'path'
import {execSync} from 'child_process'
import bluebird from 'bluebird'
import {Navy} from '../../navy'
import fs from '../../util/fs'
import {pathToNavyRoot} from '../../navy/state'

import type {ConfigProvider} from '../../config-provider'
import type {State} from '../../navy'

const mkdirp = bluebird.promisify(require('mkdirp'))

const npmContext = path.join(pathToNavyRoot(), 'npm')
const nodeModulesPath = path.join(npmContext, 'node_modules')

async function tryAndInstall(pkgName) {
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

async function pathToModule(pkgName) {
  return path.join(nodeModulesPath, pkgName)
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

      const navyPath = await pathToModule(envState.npmPackage)

      fs.accessSync(navyPath) // see if path exists

      return navyPath
    },

    async getNavyFilePath(): Promise<string> {
      return path.join(await this.getNavyPath(), 'Navyfile.js')
    },

    async refreshConfig(): Promise<bool> {
      const envState: ?State = await navy.getState()

      if (!envState) {
        throw new Error('State doesn\'t exist for navy')
      }

      await tryAndInstall(envState.npmPackage)

      return true
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
