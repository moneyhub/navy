/* @flow */

import bluebird from 'bluebird'
import {resolveDriverFromName} from '../driver'
import {resolveConfigProviderFromName} from '../config-provider'
import {normaliseNavyName} from './util'
import {getState, saveState, deleteState, pathToNavys} from './state'
import {NavyNotInitialisedError, NavyError} from '../errors'
import {invokePluginHook} from './plugin-interface'

import type {Driver, CreateDriver} from '../driver'
import type {ConfigProvider, CreateConfigProvider} from '../config-provider'
import type {State} from './state'
import type {ServiceList} from '../service'

const fs = bluebird.promisifyAll(require('fs'))

export type {State}

export class Navy {

  name: string;
  normalisedName: string;

  _cachedState: ?State;

  constructor(name: string) {
    this.name = name
    this.normalisedName = normaliseNavyName(name)
  }

  async getState(): Promise<?State> {
    if (!this._cachedState) {
      this._cachedState = await getState(this.normalisedName)
    }

    return this._cachedState
  }

  /**
   * Returns an instance of the driver in use by this navy.
   * Returns null if the navy hasn't been launched yet.
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
      throw new NavyNotInitialisedError(this.name)
    }

    if (!driver) {
      throw new NavyError('Could not determine driver for the navy')
    }

    return driver
  }

  async getConfigProvider(): Promise<?ConfigProvider> {
    const envState: ?State = await this.getState()

    if (!envState || !envState.configProvider) {
      return null
    }

    const createConfigProvider: ?CreateConfigProvider =
      resolveConfigProviderFromName(envState.configProvider)

    if (!createConfigProvider) {
      return null
    }

    return createConfigProvider(this)
  }

  async getNavyFile(): Promise<?Object> {
    const configProvider: ?ConfigProvider = await this.getConfigProvider()

    if (!configProvider) {
      throw new Error('No config provider available')
    }

    const navyFilePath: string = await configProvider.getNavyFilePath()

    try {
      // $FlowIgnore: entry point to Navyfile.js has to be dynamic
      return require(navyFilePath)
    } catch (ex) {
      return null
    }
  }

  async invokePluginHook(hookName: string, ...args: any): Promise {
    const navyFile = await this.getNavyFile()

    if (!navyFile) {
      // no action if no Navyfile.js
      return
    }

    await invokePluginHook(this, navyFile, hookName, args)
  }

  async isInitialised(): Promise<boolean> {
    return await this.getState() != null
  }

  async initialise(opts: State): Promise<void> {
    await saveState(this.normalisedName, {
      ...opts,
      driver: 'docker-compose',
    })
  }

  async delete(): Promise<void> {
    await deleteState(this.normalisedName)
  }

  async launch(services?: Array<string>, opts: ?Object): Promise<void> {
    if (!services) services = await this.getLaunchedServiceNames()

    await (await this.safeGetDriver()).launch(services, opts)
  }

  async destroy(): Promise<void> {
    if (!await this.isInitialised()) {
      throw new NavyNotInitialisedError(this.name)
    }

    try {
      await (await this.safeGetDriver()).destroy()
    } catch (ex) {}

    await this.delete()
  }

  async ps(): Promise<ServiceList> {
    return await (await this.safeGetDriver()).ps()
  }

  async start(services?: Array<string>): Promise<void> {
    if (!services) services = await this.getLaunchedServiceNames()

    await (await this.safeGetDriver()).start(services)
  }

  async stop(services?: Array<string>): Promise<void> {
    if (!services) services = await this.getLaunchedServiceNames()

    await (await this.safeGetDriver()).stop(services)
  }

  async restart(services?: Array<string>): Promise<void> {
    if (!services) services = await this.getLaunchedServiceNames()

    await (await this.safeGetDriver()).restart(services)
  }

  async kill(services?: Array<string>): Promise<void> {
    if (!services) services = await this.getLaunchedServiceNames()

    await (await this.safeGetDriver()).kill(services)
  }

  async rm(services?: Array<string>): Promise<void> {
    if (!services) services = await this.getLaunchedServiceNames()

    await (await this.safeGetDriver()).rm(services)
  }

  async pull(services?: Array<string>): Promise<void> {
    if (!services) services = await this.getLaunchedServiceNames()

    await (await this.safeGetDriver()).pull(services)
  }

  async host(service: string, index: ?number = 1): Promise<?string> {
    return await (await this.safeGetDriver()).host(service, index)
  }

  async port(service: string, privatePort: number, index: ?number = 1): Promise<?number> {
    return await (await this.safeGetDriver()).port(service, privatePort, index)
  }

  async getLaunchedServiceNames(): Promise<Array<string>> {
    return await (await this.safeGetDriver()).getLaunchedServiceNames()
  }

  async getAvailableServiceNames(): Promise<Array<string>> {
    return await (await this.safeGetDriver()).getAvailableServiceNames()
  }

}

export function getNavy(envName: ?string): Navy {
  if (!envName) {
    throw new Error('No navy provided')
  }

  return new Navy(envName)
}

export async function getLaunchedNavies(): Promise<Array<Navy>> {
  try {
    const navyNames = await fs.readdirAsync(pathToNavys())
    return navyNames.map(name => getNavy(name))
  } catch (ex) {
    return []
  }
}
