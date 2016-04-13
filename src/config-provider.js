/* @flow */

import {Environment} from './environment'
import Cwd from './config-providers/cwd'

export type ConfigProvider = {
  getDockerComposePath(): Promise<string>;
}

export type CreateConfigProvider = (environment: Environment) => ConfigProvider

export function resolveConfigProviderFromName(providerName: string): ?CreateConfigProvider {
  switch (providerName) {
    case 'cwd':
      return Cwd
  }

  return null
}
