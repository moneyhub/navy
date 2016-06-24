/* @flow */

import {EventEmitter2} from 'eventemitter2'
import fs from '../util/fs'

import {resolveDriverFromName} from '../driver'
import {resolveConfigProviderFromName} from '../config-provider'
import {normaliseNavyName} from './util'
import {getState, saveState, deleteState, pathToNavys} from './state'
import {NavyNotInitialisedError, NavyError} from '../errors'
import {loadPlugins} from './plugin-interface'
import {middlewareRunner} from './middleware'

import type {Driver, CreateDriver} from '../driver'
import type {ConfigProvider, CreateConfigProvider} from '../config-provider'
import type {State} from './state'
import type {ServiceList} from '../service'

export type {State}

const debug = require('debug')('navy:main')

export class Navy extends EventEmitter2 {

  name: string;
  normalisedName: string;

  _pluginsLoaded: boolean;
  _cachedState: ?State;
  _registeredCommands: Object;
  _registeredMiddleware: Array<Function>;

  constructor(name: string) {
    super({
      maxListeners: Number.MAX_SAFE_INTEGER,
      wildcard: true,
      delimiter: '.',
    })

    this.name = name
    this.normalisedName = normaliseNavyName(name)

    this._pluginsLoaded = false
    this._registeredCommands = {}
    this._registeredMiddleware = []
  }

  async ensurePluginsLoaded(): Promise<void> {
    if (this._pluginsLoaded) return

    debug('Ensuring plugins are loaded')

    const navyFile = await this.getNavyFile()

    if (!navyFile) return

    debug('Loading plugins')
    await loadPlugins(this, navyFile)

    this._pluginsLoaded = true
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

    debug('Got NavyFile', navyFilePath)

    try {
      return global.require(navyFilePath)
    } catch (ex) {
      debug('Failed to load Navyfile', navyFilePath, ex)
      return null
    }
  }

  async saveState(state: State): Promise<void> {
    this._cachedState = state

    await saveState(this.normalisedName, state)
  }

  registerCommand(name: string, action: Function) {
    this._registeredCommands[name] = action
  }

  registerMiddleware(middlewareFn: Function) {
    this._registeredMiddleware.push(middlewareFn)
  }

  async invokeCommand(name: string, args: Array<string>): Promise<void> {
    if (!this._registeredCommands[name]) {
      throw new NavyError('Unknown command "' + name + '"')
    }

    await this._registeredCommands[name](args)
  }

  async isInitialised(): Promise<boolean> {
    return await this.getState() != null
  }

  async initialise(opts: State): Promise<void> {
    const state: State = {
      services: {},
      ...opts,
      driver: 'docker-compose',
    }

    await saveState(this.normalisedName, state)
  }

  async delete(): Promise<void> {
    await deleteState(this.normalisedName)
  }

  async launch(services?: Array<string>, opts: ?Object): Promise<void> {
    if (!services) services = await this.getLaunchedServiceNames()

    const state = await this.getState()

    if (state) {
      await middlewareRunner(this, state)
    }

    await (await this.safeGetDriver()).launch(services, opts)
  }

  async relaunch(opts: ?Object): Promise<void> {
    const services = await this.getLaunchedServiceNames()

    if (services.length === 0) {
      return
    }

    await this.launch(undefined, opts)
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

  async update(services?: Array<string>): Promise<void> {
    if (!services) services = await this.getLaunchedServiceNames()

    await (await this.safeGetDriver()).update(services)
  }

  async spawnLogStream(services?: Array<string>): Promise<void> {
    if (!services) services = await this.getLaunchedServiceNames()

    await (await this.safeGetDriver()).spawnLogStream(services)
  }

  async useTag(service: string, tag: string): Promise<void> {
    const state = (await this.getState()) || {}

    await this.saveState({
      ...state,
      services: {
        ...state.services,
        [service]: {
          ...(state.services || {})[service],
          _tag: tag,
        },
      },
    })

    await this.kill([service])
    await this.launch([service], { noDeps: true })
  }

  async resetTag(service: string): Promise<void> {
    const state = (await this.getState()) || {}

    await this.saveState({
      ...state,
      services: {
        ...state.services,
        [service]: {
          ...(state.services || {})[service],
          _tag: undefined,
        },
      },
    })

    await this.kill([service])
    await this.launch([service], { noDeps: true })
  }

  async host(service: string, index?: number): Promise<?string> {
    return await (await this.safeGetDriver()).host(service)
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
