/* @flow */

import path from 'path'
import {execSync} from 'child_process'
import bluebird from 'bluebird'
import {Navy} from '../../navy'
import fs from '../../util/fs'
import {pathToNavyRoot} from '../../navy/state'
import {pathToModule} from './util'
import {NavyError} from '../../errors'

import type {ConfigProvider} from '../../config-provider'
import type {State} from '../../navy'

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
    async getNavyPath(): Promise<string> {
      const envState: ?State = await navy.getState()

      if (!envState) {
        throw new Error('State doesn\'t exist for navy')
      }

      if (!envState.npmPackage) {
        throw new Error('NPM config provider requires an NPM package')
      }

      const navyPath = await pathToModule(nodeModulesPath, envState.npmPackage)

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

      if (!envState.npmPackage) {
        throw new Error('NPM Package not found in Navy state')
      }

      await tryAndInstall(envState.npmPackage)

      return true
    },

    async getLocationDisplayName(): Promise<string> {
      const envState: ?State = await navy.getState()

      if (!envState) {
        throw new Error('State doesn\'t exist for navy')
      }

      return envState.npmPackage
    },
  }
}

createNpmConfigProvider.importPromptSelectorName = 'NPM Package'

createNpmConfigProvider.getImportPromptOptions = () => [{
  name: 'npmPackage',
  type: 'input',
  message: 'Please enter the NPM package',
}]

createNpmConfigProvider.getImportOptionsFromPrompt = async opts => {
  if (!opts.npmPackage || opts.npmPackage.trim() === '') {
    throw new NavyError('No NPM package provided')
  }

  await tryAndInstall(opts.npmPackage)

  return {
    configProvider: 'npm',
    npmPackage: opts.npmPackage,
  }
}

createNpmConfigProvider.getImportCLIDefinition = () => `
[PACKAGE]

Imports the formation from the given NPM package
`

createNpmConfigProvider.getImportOptionsFromCLI = async (opts) => {
  if (!opts['PACKAGE']) {
    throw new NavyError('No NPM package provided')
  }

  const npmPackage = opts['PACKAGE']

  await tryAndInstall(npmPackage)

  return {
    configProvider: 'npm',
    npmPackage: npmPackage,
  }
}
