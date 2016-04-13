/* @flow */

import DockerCompose from './drivers/docker-compose'
import {Environment} from './environment'

import type {ServiceList} from './service'

export type Driver = {
  launch(services: Array<string>, opts: ?Object): Promise<void>;
  destroy(): Promise<void>;
  ps(): Promise<ServiceList>;
  start(services: ?Array<string>): Promise<void>;
  stop(services: ?Array<string>): Promise<void>;
  port(service: string, privatePort: number, index: ?number): Promise<number>;
}

export type CreateDriver = (environment: Environment) => Driver

export function resolveDriverFromName(driverName: string): ?CreateDriver {
  switch (driverName) {
    case 'docker-compose':
      return DockerCompose
  }

  return null
}
