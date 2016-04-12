/* @flow */

import {resolveDriverFromName} from '../driver'
import {normaliseEnvironmentName} from './util'
import {getState} from './state'

import type {Driver, CreateDriver} from '../driver'
import type {StateType} from './state'

const debug = require('debug')('navy:environment')

const DEFAULT_ENVIRONMENT_NAME: string = 'dev'

class Environment {

  envName: string;
  normalisedEnvName: string;

  constructor(envName: string) {
    this.envName = envName
    this.normalisedEnvName = normaliseEnvironmentName(envName)
  }

  /**
   * Returns an instance of the driver in use by this environment.
   * Returns null if the environment hasn't been launched yet.
   */
  async getDriver(): Promise<?Driver> {
    const envState: ?StateType = await getState(this.envName)

    debug('Got state', envState)

    if (!envState) {
      return null
    }

    const createDriver: ?CreateDriver = resolveDriverFromName(envState.driver)

    if (!createDriver) {
      return null
    }

    return createDriver(this.envName)
  }

  /**
   * Same as getDriver but will throw an error if the driver cannot be determined.
   */
  async safeGetDriver(): Promise<Driver> {
    const driver: ?Driver = await this.getDriver()

    if (!driver) {
      throw new Error('Could not determine the driver for the environment')
    }

    return driver
  }

  async launch(services: Array<string>) {
    console.log('Launching', services)
  }

  async destroy() {
    (await this.safeGetDriver()).destroy()
  }

}

export function getEnvironment(envName: string = DEFAULT_ENVIRONMENT_NAME): Environment {
  return new Environment(envName)
}
