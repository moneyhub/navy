/* @flow */

import {resolveDriverFromName} from '../driver'
import {resolveConfigProviderFromName} from '../config-provider'
import {normaliseEnvironmentName} from './util'
import {getState, saveState, deleteState} from './state'
import {EnvironmentNotInitialisedError, NavyError} from '../errors'

import type {Driver, CreateDriver} from '../driver'
import type {ConfigProvider, CreateConfigProvider} from '../config-provider'
import type {State} from './state'
import type {ServiceList} from '../service'

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
      this._cachedState = await getState(this.normalisedName)
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

    if (!await this.isInitialised()) {
      throw new EnvironmentNotInitialisedError()
    }

    if (!driver) {
      throw new NavyError('Could not determine driver for the environment')
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

  async isInitialised(): Promise<boolean> {
    return await this.getState() != null
  }

  async initialise(
    configProviderName: string = 'cwd',
    configProviderOptions: ?Object = null,
    driverName: string = 'docker-compose',
  ): Promise<void> {
    await saveState(this.normalisedName, {
      driver: driverName,
      configProvider: {
        name: configProviderName,
        opts: configProviderOptions,
      },
    })
  }

  async delete(): Promise<void> {
    await deleteState(this.normalisedName)
  }

  async launch(services: Array<string>, opts: ?Object): Promise<void> {
    await (await this.safeGetDriver()).launch(services, opts)
  }

  async destroy(): Promise<void> {
    if (!await this.isInitialised()) {
      throw new EnvironmentNotInitialisedError()
    }

    try {
      await (await this.safeGetDriver()).destroy()
    } catch (ex) {}

    await this.delete()
  }

  async ps(): Promise<ServiceList> {
    return await (await this.safeGetDriver()).ps()
  }

  async start(services: ?Array<string>): Promise<void> {
    await (await this.safeGetDriver()).start(services)
  }

  async stop(services: ?Array<string>): Promise<void> {
    await (await this.safeGetDriver()).stop(services)
  }

  async restart(services: ?Array<string>): Promise<void> {
    await (await this.safeGetDriver()).restart(services)
  }

  async kill(services: ?Array<string>): Promise<void> {
    await (await this.safeGetDriver()).kill(services)
  }

  async rm(services: ?Array<string>): Promise<void> {
    await (await this.safeGetDriver()).rm(services)
  }

  async pull(services: ?Array<string>): Promise<void> {
    await (await this.safeGetDriver()).pull(services)
  }

  async port(service: string, privatePort: number, index: ?number = 1): Promise<?number> {
    return await (await this.safeGetDriver()).port(service, privatePort, index)
  }

}

export function getEnvironment(envName: string = DEFAULT_ENVIRONMENT_NAME): Environment {
  return new Environment(envName)
}
