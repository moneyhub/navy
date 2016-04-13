/* @flow */

import {resolveDriverFromName} from '../driver'
import {resolveConfigProviderFromName} from '../config-provider'
import {normaliseEnvironmentName} from './util'
import {getState} from './state'

import type {Driver, CreateDriver} from '../driver'
import type {ConfigProvider, CreateConfigProvider} from '../config-provider'
import type {State} from './state'

export type {State}

const DEFAULT_ENVIRONMENT_NAME: string = 'dev'

export class Environment {

  name: string;
  normalisedName: string;

  _cachedState: ?State;

  constructor(name: string) {
    this.name = name
    this.normalisedName = normaliseEnvironmentName(name)
  }

  async getState(): Promise<?State> {
    if (!this._cachedState) {
      this._cachedState = await getState(this.name)
    }

    return this._cachedState
  }

  /**
   * Returns an instance of the driver in use by this environment.
   * Returns null if the environment hasn't been launched yet.
   */
  async getDriver(): Promise<?Driver> {
    const envState: ?State = await this.getState()

    if (!envState || !envState.driver) {
      return null
    }

    const createDriver: ?CreateDriver = resolveDriverFromName(envState.driver)

    if (!createDriver) {
      return null
    }

    return createDriver(this)
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

  async getConfigProvider(): Promise<?ConfigProvider> {
    const envState: ?State = await this.getState()

    if (!envState || !envState.configProvider || !envState.configProvider.name) {
      return null
    }

    const createConfigProvider: ?CreateConfigProvider =
      resolveConfigProviderFromName(envState.configProvider.name)

    if (!createConfigProvider) {
      return null
    }

    return createConfigProvider(this)
  }

  async launch(services: Array<string>): Promise<void> {
    console.log('Launching', services)
  }

  async destroy(): Promise<void> {
    (await this.safeGetDriver()).destroy()
  }

}

export function getEnvironment(envName: string = DEFAULT_ENVIRONMENT_NAME): Environment {
  return new Environment(envName)
}
