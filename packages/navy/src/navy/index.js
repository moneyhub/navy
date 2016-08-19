/* @flow */

import bluebird from 'bluebird'
import invariant from 'invariant'
import {EventEmitter2} from 'eventemitter2'

import {resolveDriverFromName} from '../driver'
import {resolveConfigProviderFromName} from '../config-provider'
import {normaliseNavyName} from './util'
import {getState, saveState, deleteState, pathToNavys} from './state'
import {getConfig} from '../config'
import {NavyNotInitialisedError, NavyError} from '../errors'
import {loadPlugins} from './plugin-interface'
import {middlewareRunner} from './middleware'
import {reconfigureHTTPProxy} from '../http-proxy'
import {getExternalIP} from '../util/external-ip'
import {getUrlForService} from '../util/xipio'

import type {Driver, CreateDriver} from '../driver'
import type {ConfigProvider, CreateConfigProvider} from '../config-provider'
import type {State} from './state'
import type {ServiceList} from '../service'

const fs = bluebird.promisifyAll(require('fs'))

export type {State}

/**
 * A Navy instance
 * @public
 */
export class Navy extends EventEmitter2 {

  /**
   * The name of the current Navy.
   * @public
   */
  name: string;

  /**
   * The normalised name of the current Navy (name without whitespaces).
   * @public
   */
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

    const navyFile = await this.getNavyFile()

    if (!navyFile) return

    await loadPlugins(this, navyFile)

    this._pluginsLoaded = true
  }

  /**
   * Returns the current State for this Navy.
   * @public
   */
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

    invariant(driver, 'NO_DRIVER', this.name)

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
    if (!await this.isInitialised()) {
      throw new NavyNotInitialisedError(this.name)
    }

    const configProvider: ?ConfigProvider = await this.getConfigProvider()

    invariant(configProvider, 'NO_CONFIG_PROVIDER', this.name)

    const navyFilePath: string = await configProvider.getNavyFilePath()

    try {
      // $FlowIgnore: entry point to Navyfile.js has to be dynamic
      return require(navyFilePath)
    } catch (ex) {
      return null
    }
  }

  /**
   * Saves a new State for this Navy.
   * @public
   */
  async saveState(state: State): Promise<void> {
    this._cachedState = state

    await saveState(this.normalisedName, state)
    await middlewareRunner(this, state)
  }

  /**
   * Registers a custom CLI command with the given name and callback function.
   * Any command registered can be run using `navy run [name]`.
   * @public
   */
  registerCommand(name: string, action: Function) {
    this._registeredCommands[name] = action
  }

  /**
   * Registers a middleware reducer function. See [Writing Plugins](docs/writing-plugins.md).
   * @public
   */
  registerMiddleware(middlewareFn: Function) {
    this._registeredMiddleware.push(middlewareFn)
  }

  async invokeCommand(name: string, args: Array<string>): Promise<void> {
    if (!this._registeredCommands[name]) {
      throw new NavyError('Unknown command "' + name + '"')
    }

    await this._registeredCommands[name](args)
  }

  /**
   * Returns whether this Navy is initialised and ready to launch services.
   * @public
   */
  async isInitialised(): Promise<boolean> {
    return await this.getState() != null
  }

  /**
   * Initialises this Navy with the given State.
   * @public
   */
  async initialise(opts: State): Promise<void> {
    const state: State = {
      services: {},
      ...opts,
      driver: 'docker-compose',
    }

    await saveState(this.normalisedName, state)
  }

  /**
   * Deletes the state for this Navy. It won't be possible to interact with this Navy after calling this function
   * unless you re-initialise it.
   * @public
   */
  async delete(): Promise<void> {
    await deleteState(this.normalisedName)
  }

  /**
   * Launches the given services for this Navy.
   * @public
   */
  async launch(services?: Array<string>, opts: ?Object): Promise<void> {
    if (!services) services = await this.getLaunchedServiceNames()

    const state = await this.getState()

    if (state) {
      await middlewareRunner(this, state)
    }

    await (await this.safeGetDriver()).launch(services, opts)

    await reconfigureHTTPProxy()
  }

  /**
   * @deprecated
   */
  async relaunch(opts: ?Object): Promise<void> {
    return await this.reconfigure(opts)
  }

  /**
   * Relaunches (reconfigures) all of the services running in this Navy.
   * This will pick up any changes to the compose configuration.
   * @public
   */
  async reconfigure(opts: ?Object): Promise<void> {
    const services = await this.getLaunchedServiceNames()

    if (services.length === 0) {
      return
    }

    await this.launch(undefined, opts)
  }

  /**
   * Destroys all of the services in this Navy and deletes the state.
   * @public
   */
  async destroy(): Promise<void> {
    if (!await this.isInitialised()) {
      throw new NavyNotInitialisedError(this.name)
    }

    await reconfigureHTTPProxy({
      navies: (await getLaunchedNavyNames())
        .filter(navy => navy !== this.normalisedName),
    })

    try {
      await (await this.safeGetDriver()).destroy()
    } catch (ex) {}

    await this.delete()
  }

  /**
   * Returns a list of launched services for this Navy.
   * @public
   */
  async ps(): Promise<ServiceList> {
    return await (await this.safeGetDriver()).ps()
  }

  /**
   * Starts the given services.
   * @public
   */
  async start(services?: Array<string>): Promise<void> {
    if (!services) services = await this.getLaunchedServiceNames()

    await reconfigureHTTPProxy()

    await (await this.safeGetDriver()).start(services)
  }

  /**
   * Stops the given services.
   * @public
   */
  async stop(services?: Array<string>): Promise<void> {
    if (!services) services = await this.getLaunchedServiceNames()

    await (await this.safeGetDriver()).stop(services)
  }

  /**
   * Restarts the given services.
   * @public
   */
  async restart(services?: Array<string>): Promise<void> {
    if (!services) services = await this.getLaunchedServiceNames()

    await (await this.safeGetDriver()).restart(services)
  }

  /**
   * Forcefully stops the given services.
   * @public
   */
  async kill(services?: Array<string>): Promise<void> {
    if (!services) services = await this.getLaunchedServiceNames()

    await (await this.safeGetDriver()).kill(services)
  }

  /**
   * Removes the given services. Requires the services to be stopped first.
   * @public
   */
  async rm(services?: Array<string>): Promise<void> {
    if (!services) services = await this.getLaunchedServiceNames()

    await (await this.safeGetDriver()).rm(services)
  }

  /**
   * Makes sure the images for the given services are up to date, and restarts any services
   * with new images.
   * @public
   */
  async update(services?: Array<string>): Promise<void> {
    if (!services) services = await this.getLaunchedServiceNames()

    await (await this.safeGetDriver()).update(services)
  }

  async spawnLogStream(services?: Array<string>): Promise<void> {
    if (!services) services = await this.getLaunchedServiceNames()

    await (await this.safeGetDriver()).spawnLogStream(services)
  }

  /**
   * Locks down the given service to the given docker image tag.
   * @public
   */
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
    await this.update([service]) // pull and launch
  }

  /**
   * Resets the version of the given service if `useTag` was used.
   * @public
   */
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

  async usePort(service: string, privatePort: number, externalPort: number): Promise<void> {
    const state = (await this.getState()) || {}

    await this.saveState({
      ...state,
      services: {
        ...state.services,
        [service]: {
          ...(state.services || {})[service],
          _ports: {
            ...((state.services || {})[service] || {})._ports,
            [privatePort]: externalPort,
          },
        },
      },
    })

    await this.kill([service])
    await this.launch([service], { noDeps: true })
  }

  async resetPort(service: string, privatePort: number): Promise<void> {
    const state = (await this.getState()) || {}

    await this.saveState({
      ...state,
      services: {
        ...state.services,
        [service]: {
          ...(state.services || {})[service],
          _ports: {
            ...((state.services || {})[service] || {})._ports,
            [privatePort]: undefined,
          },
        },
      },
    })

    await this.kill([service])
    await this.launch([service], { noDeps: true })
  }

  /**
   * Waits for the given services to be healthy. Resolves when all services are healthy.
   * @public
   */
  async waitForHealthy(services?: Array<string>, progressCallback?: Function): Promise<boolean> {
    if (services == null) {
      services = (await this.ps())
        .filter(service => service && service.raw && service.raw.State.Health)
        .map(service => service.name)
    }

    let tries = 0

    while (tries++ < 30) {
      const ps = await this.ps()

      const specifiedServices = ps
        .filter(service => services && services.indexOf(service.name) !== -1)

      const servicesWithoutHealthInfo = specifiedServices
        .filter(service => !service.raw || !service.raw.State.Health)
        .map(service => service.name)

      if (servicesWithoutHealthInfo.length > 0) {
        throw new NavyError('The specified services don\'t have health checks: ' + servicesWithoutHealthInfo.join(', '))
      }

      const serviceHealth = specifiedServices.map(service => ({
        service: service.name,
        health: service.raw && service.raw.State.Health.Status,
      }))

      if (progressCallback) progressCallback(serviceHealth)

      const unhealthy = serviceHealth.filter(service => service.health !== 'healthy')

      if (unhealthy.length === 0) {
        return true
      }

      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    throw new NavyError('Timed out waiting for services to be healthy')
  }

  /**
   * Returns the external IP for accessing Docker and running services.
   * @public
   */
  async externalIP(): Promise<string> {
    const config = await getConfig()

    return await getExternalIP(config.externalIP)
  }

  /**
   * @deprecated
   */
  async host(service?: string, index?: number): Promise<?string> {
    // getting host by service and index is now DEPRECATED
    return await this.externalIP()
  }

  /**
   * Returns the external port for the given service and internal private port.
   * @public
   */
  async port(service: string, privatePort: number, index: ?number = 1): Promise<?number> {
    return await (await this.safeGetDriver()).port(service, privatePort, index)
  }

  /**
   * Returns the URL for the given service which can be used to access it if it exposes
   * a HTTP server.
   * @public
   */
  async url(service: string): Promise<?string> {
    return await getUrlForService(service, this.normalisedName, await this.externalIP())
  }

  /**
   * Returns an array of the names of the launched services for this Navy.
   * @public
   */
  async getLaunchedServiceNames(): Promise<Array<string>> {
    return await (await this.safeGetDriver()).getLaunchedServiceNames()
  }

  /**
   * Returns an array of the names of all of the possible services for this Navy.
   * @public
   */
  async getAvailableServiceNames(): Promise<Array<string>> {
    return await (await this.safeGetDriver()).getAvailableServiceNames()
  }

}

/**
 * Returns a `Navy` instance from the given Navy name.
 * @public
 */
export function getNavy(navyName: ?string): Navy {
  invariant(navyName, 'NO_NAVY_PROVIDED')

  return new Navy(navyName)
}

/**
 * Returns an array of `Navy` instances which are currently imported and launched.
 * @public
 */
export async function getLaunchedNavies(): Promise<Array<Navy>> {
  try {
    const navyNames = await fs.readdirAsync(pathToNavys())
    return navyNames.map(name => getNavy(name))
  } catch (ex) {
    return []
  }
}

/**
 * Returns an array of names of Navies which are currently imported and launched.
 * @public
 */
export async function getLaunchedNavyNames(): Promise<Array<string>> {
  try {
    return await fs.readdirAsync(pathToNavys())
  } catch (ex) {
    return []
  }
}
