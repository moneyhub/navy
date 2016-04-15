/* @flow */

import {Navy} from './navy'
import FileSystem from './config-providers/filesystem'

export type ConfigProvider = {
  getDockerComposePath(): Promise<string>;
}

export type CreateConfigProvider = (navy: Navy) => ConfigProvider

export function resolveConfigProviderFromName(providerName: string): ?CreateConfigProvider {
  switch (providerName) {
    case 'filesystem':
      return FileSystem
  }

  return null
}
