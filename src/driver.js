/* @flow */

import DockerCompose from './drivers/docker-compose'

export type Driver = {
  launch(services: Array<string>): Promise<void>;
  destroy(): Promise<void>;
}

export type CreateDriver = (envName: string) => Driver

export function resolveDriverFromName(driverName: string): ?CreateDriver {
  switch (driverName) {
    case 'docker-compose':
      return DockerCompose
  }

  return null
}
