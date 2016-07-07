/* @flow */

import {Navy} from './navy'
import FileSystem from './config-providers/filesystem'
import NPM from './config-providers/npm'

import type {State} from './navy/state'

const PROVIDERS = [
  NPM,
  FileSystem,
]

export type ConfigProvider = {
  getNavyPath(): Promise<string>;
  getNavyFilePath(): Promise<string>;
  refreshConfig(): Promise<bool>;
  getLocationDisplayName(): Promise<string>;
}

export type CreateConfigProvider = (navy: Navy) => ConfigProvider

export function resolveConfigProviderFromName(providerName: string): ?CreateConfigProvider {
  switch (providerName) {
    case 'filesystem':
      return FileSystem
    case 'npm':
      return NPM
  }

  return null
}

export function getImportCommandLineOptions(): Array<Array<string>> {
  return PROVIDERS.reduce((arr, provider) => [...arr, ...provider.importCliOptions], [])
}

export async function getImportOptionsForCLI(opts: Object): State {
  for (const provider of PROVIDERS) {
    const optionsFromProvider: ?State = await provider.getImportOptionsForCLI(opts)

    if (optionsFromProvider) {
      return optionsFromProvider
    }
  }

  throw new Error('Could not resolve import options from CLI arguments')
}
