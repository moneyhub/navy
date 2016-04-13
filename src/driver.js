/* @flow */

import DockerCompose from './drivers/docker-compose'
import {Environment} from './environment'

export type Driver = {
  launch(services: Array<string>, opts: ?Object): Promise<void>;
  destroy(): Promise<void>;
}

export type CreateDriver = (environment: Environment) => Driver

export function resolveDriverFromName(driverName: string): ?CreateDriver {
  switch (driverName) {
    case 'docker-compose':
      return DockerCompose
  }

  return null
}
