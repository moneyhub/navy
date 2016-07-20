/* @flow */

import {Navy} from './navy'
import FileSystem from './config-providers/filesystem'
import NPM from './config-providers/npm'

const PROVIDERS = {
  'filesystem': FileSystem,
  'npm': NPM,
}

export type ConfigProvider = {
  getNavyPath(): Promise<string>;
  getNavyFilePath(): Promise<string>;
  refreshConfig(): Promise<bool>;
  getLocationDisplayName(): Promise<string>;
}

export type CreateConfigProvider = (navy: Navy) => ConfigProvider

export function resolveConfigProviderFromName(providerName: string): ?CreateConfigProvider {
  return PROVIDERS[providerName]
}

export function getAvailableConfigProviders(): Object {
  return PROVIDERS
}
