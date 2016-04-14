/* @flow */

import {Navy} from './navy'
import Cwd from './config-providers/cwd'

export type ConfigProvider = {
  getDockerComposePath(): Promise<string>;
}

export type CreateConfigProvider = (navy: Navy) => ConfigProvider

export function resolveConfigProviderFromName(providerName: string): ?CreateConfigProvider {
  switch (providerName) {
    case 'cwd':
      return Cwd
  }

  return null
}
