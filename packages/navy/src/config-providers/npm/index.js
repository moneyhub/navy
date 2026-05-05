/* @flow */

import path from 'path'
import { execSync } from 'child_process'
import invariant from 'invariant'
import { promises as fsp } from 'fs'
import fs from '../../util/fs'
import { pathToNavyRoot } from '../../navy/state'
import { pathToModule } from './util'

import type { ConfigProvider } from '../../config-provider'
import type { State } from '../../navy'
import type { Navy } from '../../navy'

const npmContext = path.join(pathToNavyRoot(), 'npm')
const nodeModulesPath = path.join(npmContext, 'node_modules')

async function tryAndInstall(pkgName: string) {
  await fsp.mkdir(nodeModulesPath, { recursive: true })

  try {
    execSync(`npm info ${pkgName} name`, { stdio: 'ignore' })
  } catch (ex) {
    throw new Error(`Package "${pkgName}" not found or unreachable`)
  }

  execSync(`npm i ${pkgName}`, { stdio: 'inherit', cwd: npmContext })
}

export default function createNpmConfigProvider(navy: Navy): ConfigProvider {
  const provider: ConfigProvider = {
    async getNavyPath(): Promise<?string> {
      const envState: ?State = await navy.getState()

      invariant(!!envState, 'STATE_NONEXISTANT', navy.name)
      invariant(!!envState.npmPackage, 'NPM_PROVIDER_REQUIRES_PACKAGE', navy.name)

      const navyPath = await pathToModule(nodeModulesPath, envState.npmPackage)

      fs.accessSync(navyPath) // see if path exists

      return navyPath
    },

    async getNavyFilePath(): Promise<string> {
      const navyPath = await provider.getNavyPath()
      invariant(navyPath, 'STATE_NONEXISTANT', navy.name)
      return path.join(navyPath, 'Navyfile.js')
    },

    async refreshConfig(): Promise<boolean> {
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

  return provider
}

createNpmConfigProvider.importCliOptions = [
  ['--npm-package [package]', 'set the NPM package to use for docker compose config'],
]

createNpmConfigProvider.getImportOptionsForCLI = async (opts: Object): Promise<?Object> => {
  if (opts.npmPackage) {
    await tryAndInstall(opts.npmPackage)

    return {
      configProvider: 'npm',
      npmPackage: opts.npmPackage,
    }
  }
}
