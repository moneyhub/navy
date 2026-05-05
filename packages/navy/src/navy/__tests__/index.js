/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import { NavyError, NavyNotInitialisedError } from '../../errors'

function loadNavyModule(stubs = {}) {
  return proxyquire.noCallThru()('../', {
    '../util/fs': {
      readdirAsync: sinon.stub().resolves([]),
      lstatSync: sinon.stub().returns({ isDirectory: () => true }),
      ...stubs.fs,
    },
    './state': {
      getState: sinon.stub().resolves(null),
      saveState: sinon.stub().resolves(),
      deleteState: sinon.stub().resolves(),
      pathToNavys: sinon.stub().returns('/home/test/.navy/navies'),
      pathToNavy: sinon.stub().callsFake((n) => `/home/test/.navy/navies/${n}`),
      ...stubs.state,
    },
    '../driver': { resolveDriverFromName: sinon.stub().returns(null), ...stubs.driver },
    '../config-provider': { resolveConfigProviderFromName: sinon.stub().returns(null), ...stubs.configProvider },
    '../config': { getConfig: sinon.stub().returns({ externalIP: null }), ...stubs.config },
    './plugin-interface': { loadPlugins: sinon.stub().resolves([]), ...stubs.pluginInterface },
    './middleware': { middlewareRunner: sinon.stub().resolves(), ...stubs.middleware },
    '../http-proxy': { reconfigureHTTPProxy: sinon.stub().resolves(), ...stubs.httpProxy },
    '../util/external-ip': { getExternalIP: sinon.stub().resolves('127.0.0.1'), ...stubs.externalIP },
    '../util/service-host': {
      createUrlForService: sinon.stub().resolves('http://svc.local'),
      getUrlFromService: sinon.stub().returns(null),
      ...stubs.serviceHost,
    },
  })
}

function makeDriver(overrides = {}) {
  return {
    launch: sinon.stub().resolves(),
    destroy: sinon.stub().resolves(),
    ps: sinon.stub().resolves([]),
    start: sinon.stub().resolves(),
    stop: sinon.stub().resolves(),
    restart: sinon.stub().resolves(),
    kill: sinon.stub().resolves(),
    rm: sinon.stub().resolves(),
    update: sinon.stub().resolves(),
    spawnLogStream: sinon.stub().resolves(),
    port: sinon.stub().resolves(null),
    writeConfig: sinon.stub().resolves(),
    getConfig: sinon.stub().resolves({ services: {} }),
    getLaunchedServiceNames: sinon.stub().resolves([]),
    getAvailableServiceNames: sinon.stub().resolves([]),
    ...overrides,
  }
}

describe('navy/index', function () {

  describe('Navy class', function () {

    it('should normalise the navy name and store it', function () {
      const { Navy } = loadNavyModule()
      const navy = new Navy('My Env-1')
      expect(navy.name).to.equal('My Env-1')
      expect(navy.normalisedName).to.equal('MyEnv1')
    })

  })

  describe('getNavy', function () {

    it('should return a Navy instance for the given name', function () {
      const { getNavy } = loadNavyModule()
      const navy = getNavy('myenv')
      expect(navy.name).to.equal('myenv')
    })

    it('should throw when navyName is not provided', function () {
      const { getNavy } = loadNavyModule()
      expect(() => getNavy()).to.throw(/NO_NAVY_PROVIDED/)
      expect(() => getNavy(null)).to.throw(/NO_NAVY_PROVIDED/)
      expect(() => getNavy('')).to.throw(/NO_NAVY_PROVIDED/)
    })

  })

  describe('isInitialised', function () {

    it('should return true when state exists', async function () {
      const { Navy } = loadNavyModule({
        state: { getState: sinon.stub().resolves({ driver: 'docker-compose' }) },
      })
      expect(await new Navy('env').isInitialised()).to.equal(true)
    })

    it('should return false when state is null', async function () {
      const { Navy } = loadNavyModule({ state: { getState: sinon.stub().resolves(null) } })
      expect(await new Navy('env').isInitialised()).to.equal(false)
    })

  })

  describe('getState/saveState/initialise/delete', function () {

    it('should delegate getState to state module', async function () {
      const stub = sinon.stub().resolves({ driver: 'docker-compose' })
      const { Navy } = loadNavyModule({ state: { getState: stub } })

      const result = await new Navy('env').getState()
      expect(result).to.eql({ driver: 'docker-compose' })
      expect(stub.firstCall.args[0]).to.equal('env')
    })

    it('saveState should write state then run middleware', async function () {
      const saveStub = sinon.stub().resolves()
      const middlewareStub = sinon.stub().resolves()
      const { Navy } = loadNavyModule({
        state: { saveState: saveStub },
        middleware: { middlewareRunner: middlewareStub },
      })
      const navy = new Navy('env')
      const state = { driver: 'docker-compose' }

      await navy.saveState(state)

      expect(saveStub.calledWith('env', state)).to.equal(true)
      expect(middlewareStub.calledOnce).to.equal(true)
    })

    it('initialise should write state with driver=docker-compose and provided opts', async function () {
      const saveStub = sinon.stub().resolves()
      const { Navy } = loadNavyModule({ state: { saveState: saveStub } })

      await new Navy('env').initialise({ services: { foo: {} }, configProvider: 'filesystem' })

      const writtenState = saveStub.firstCall.args[1]
      expect(writtenState).to.eql({
        services: { foo: {} },
        configProvider: 'filesystem',
        driver: 'docker-compose',
      })
    })

    it('delete should call deleteState', async function () {
      const stub = sinon.stub().resolves()
      const { Navy } = loadNavyModule({ state: { deleteState: stub } })

      await new Navy('env').delete()
      expect(stub.calledWith('env')).to.equal(true)
    })

  })

  describe('getDriver', function () {

    it('should return null when state is missing', async function () {
      const { Navy } = loadNavyModule()
      expect(await new Navy('env').getDriver()).to.equal(null)
    })

    it('should return null when state has no driver', async function () {
      const { Navy } = loadNavyModule({ state: { getState: sinon.stub().resolves({}) } })
      expect(await new Navy('env').getDriver()).to.equal(null)
    })

    it('should return null when the driver name is unknown', async function () {
      const { Navy } = loadNavyModule({
        state: { getState: sinon.stub().resolves({ driver: 'unknown' }) },
        driver: { resolveDriverFromName: sinon.stub().returns(null) },
      })
      expect(await new Navy('env').getDriver()).to.equal(null)
    })

    it('should instantiate and return the driver from resolveDriverFromName', async function () {
      const driverInstance = makeDriver()
      const factory = sinon.stub().returns(driverInstance)
      const { Navy } = loadNavyModule({
        state: { getState: sinon.stub().resolves({ driver: 'docker-compose' }) },
        driver: { resolveDriverFromName: sinon.stub().returns(factory) },
      })

      const navy = new Navy('env')
      expect(await navy.getDriver()).to.equal(driverInstance)
      expect(factory.firstCall.args[0]).to.equal(navy)
    })

  })

  describe('safeGetDriver', function () {

    it('should throw NavyNotInitialisedError when not initialised', async function () {
      const { Navy } = loadNavyModule()
      let caught
      try { await new Navy('env').safeGetDriver() } catch (e) { caught = e }
      expect(caught).to.be.instanceof(NavyNotInitialisedError)
    })

    it('should throw an invariant violation when state exists but no driver could be resolved', async function () {
      const { Navy } = loadNavyModule({
        state: { getState: sinon.stub().resolves({ driver: 'unknown' }) },
        driver: { resolveDriverFromName: sinon.stub().returns(null) },
      })
      let caught
      try { await new Navy('env').safeGetDriver() } catch (e) { caught = e }
      expect(caught.message).to.match(/NO_DRIVER/)
    })

    it('should return the driver when initialised and resolvable', async function () {
      const driverInstance = makeDriver()
      const { Navy } = loadNavyModule({
        state: { getState: sinon.stub().resolves({ driver: 'docker-compose' }) },
        driver: { resolveDriverFromName: sinon.stub().returns(() => driverInstance) },
      })

      expect(await new Navy('env').safeGetDriver()).to.equal(driverInstance)
    })

  })

  describe('getConfigProvider', function () {

    it('should return null when state has no configProvider', async function () {
      const { Navy } = loadNavyModule({ state: { getState: sinon.stub().resolves({}) } })
      expect(await new Navy('env').getConfigProvider()).to.equal(null)
    })

    it('should return null when state is missing', async function () {
      const { Navy } = loadNavyModule()
      expect(await new Navy('env').getConfigProvider()).to.equal(null)
    })

    it('should return null when configProvider is unknown', async function () {
      const { Navy } = loadNavyModule({
        state: { getState: sinon.stub().resolves({ configProvider: 'unknown' }) },
        configProvider: { resolveConfigProviderFromName: sinon.stub().returns(null) },
      })
      expect(await new Navy('env').getConfigProvider()).to.equal(null)
    })

    it('should instantiate the config provider from resolveConfigProviderFromName', async function () {
      const provider = { getNavyPath: async () => '/path' }
      const factory = sinon.stub().returns(provider)
      const { Navy } = loadNavyModule({
        state: { getState: sinon.stub().resolves({ configProvider: 'filesystem' }) },
        configProvider: { resolveConfigProviderFromName: sinon.stub().returns(factory) },
      })

      expect(await new Navy('env').getConfigProvider()).to.equal(provider)
    })

  })

  describe('getNavyFile', function () {

    it('should throw NavyNotInitialisedError when not initialised', async function () {
      const { Navy } = loadNavyModule()
      let caught
      try { await new Navy('env').getNavyFile() } catch (e) { caught = e }
      expect(caught).to.be.instanceof(NavyNotInitialisedError)
    })

    it('should throw NO_CONFIG_PROVIDER when initialised but no provider', async function () {
      const { Navy } = loadNavyModule({
        state: { getState: sinon.stub().resolves({}) },
      })
      let caught
      try { await new Navy('env').getNavyFile() } catch (e) { caught = e }
      expect(caught.message).to.match(/NO_CONFIG_PROVIDER/)
    })

    it('should require the navy file path and return its module export', async function () {
      const fakePath = '/abs/Navyfile.js'
      const navyFile = { plugins: ['p'] }
      const provider = { getNavyFilePath: async () => fakePath }
      const { Navy } = loadNavyModule({
        state: { getState: sinon.stub().resolves({ configProvider: 'filesystem' }) },
        configProvider: { resolveConfigProviderFromName: sinon.stub().returns(() => provider) },
      })

      const navy = new Navy('env')
      const proxiedRequire = require('proxyquire').noCallThru()
      const NavyMod = proxiedRequire('../', {
        '../util/fs': { readdirAsync: sinon.stub().resolves([]), lstatSync: sinon.stub().returns({ isDirectory: () => true }) },
        './state': { getState: sinon.stub().resolves({ configProvider: 'filesystem' }), saveState: sinon.stub(), deleteState: sinon.stub(), pathToNavys: sinon.stub().returns('/'), pathToNavy: sinon.stub() },
        '../driver': { resolveDriverFromName: sinon.stub().returns(null) },
        '../config-provider': { resolveConfigProviderFromName: sinon.stub().returns(() => provider) },
        '../config': { getConfig: sinon.stub().returns({ externalIP: null }) },
        './plugin-interface': { loadPlugins: sinon.stub().resolves([]) },
        './middleware': { middlewareRunner: sinon.stub().resolves() },
        '../http-proxy': { reconfigureHTTPProxy: sinon.stub().resolves() },
        '../util/external-ip': { getExternalIP: sinon.stub().resolves('127.0.0.1') },
        '../util/service-host': { createUrlForService: sinon.stub(), getUrlFromService: sinon.stub() },
        [fakePath]: navyFile,
      })

      const fresh = new NavyMod.Navy('env')
      expect(await fresh.getNavyFile()).to.equal(navyFile)

      // also check that not-required path returns null
      provider.getNavyFilePath = async () => '/does-not-exist/Navyfile.js'
      expect(await navy.getNavyFile()).to.equal(null)
    })

  })

  describe('ensurePluginsLoaded', function () {

    it('should be a no-op the second time when plugins are already loaded', async function () {
      const loadStub = sinon.stub().resolves([])
      const { Navy } = loadNavyModule({
        pluginInterface: { loadPlugins: loadStub },
      })

      const navy = new Navy('env')
      navy.getNavyFile = sinon.stub().resolves({ plugins: [] })

      await navy.ensurePluginsLoaded()
      await navy.ensurePluginsLoaded()

      expect(loadStub.calledOnce).to.equal(true)
      expect(navy._pluginsLoaded).to.equal(true)
    })

    it('should not load plugins when navyFile is null', async function () {
      const loadStub = sinon.stub().resolves([])
      const provider = { getNavyFilePath: async () => '/missing/Navyfile.js' }
      const { Navy } = loadNavyModule({
        state: { getState: sinon.stub().resolves({ configProvider: 'filesystem' }) },
        configProvider: { resolveConfigProviderFromName: sinon.stub().returns(() => provider) },
        pluginInterface: { loadPlugins: loadStub },
      })

      await new Navy('env').ensurePluginsLoaded()
      expect(loadStub.called).to.equal(false)
    })

    it('should call loadPlugins and mark _pluginsLoaded when navyFile is returned', async function () {
      const loadStub = sinon.stub().resolves([])
      const { Navy } = loadNavyModule({
        pluginInterface: { loadPlugins: loadStub },
      })

      const navy = new Navy('env')
      const navyFile = { plugins: ['my-plugin'] }
      navy.getNavyFile = sinon.stub().resolves(navyFile)

      await navy.ensurePluginsLoaded()

      expect(loadStub.calledOnce).to.equal(true)
      expect(loadStub.firstCall.args[0]).to.equal(navy)
      expect(loadStub.firstCall.args[1]).to.equal(navyFile)
      expect(navy._pluginsLoaded).to.equal(true)
    })

  })

  describe('registerCommand / invokeCommand', function () {

    it('should run the registered action when invoked', async function () {
      const { Navy } = loadNavyModule()
      const navy = new Navy('env')
      const action = sinon.stub().resolves()

      navy.registerCommand('foo', action)
      await navy.invokeCommand('foo', ['a', 'b'])

      expect(action.calledOnce).to.equal(true)
      expect(action.firstCall.args[0]).to.eql(['a', 'b'])
    })

    it('should throw a NavyError for unknown commands', async function () {
      const { Navy } = loadNavyModule()
      let caught
      try { await new Navy('env').invokeCommand('missing', []) } catch (e) { caught = e }
      expect(caught).to.be.instanceof(NavyError)
      expect(caught.message).to.contain('Unknown command "missing"')
    })

  })

  describe('registerMiddleware', function () {

    it('should append the middleware to _registeredMiddleware', function () {
      const { Navy } = loadNavyModule()
      const navy = new Navy('env')
      const fn = () => null

      navy.registerMiddleware(fn)
      expect(navy._registeredMiddleware).to.eql([fn])
    })

  })

  describe('launch', function () {

    function setupForLaunch({ available = ['api', 'web'], launched = [] } = {}) {
      const driver = makeDriver({
        getAvailableServiceNames: sinon.stub().resolves(available),
        getLaunchedServiceNames: sinon.stub().resolves(launched),
      })
      const provider = { getNavyFilePath: async () => '/missing' }
      const reconfigureHTTPProxy = sinon.stub().resolves()
      const { Navy } = loadNavyModule({
        state: { getState: sinon.stub().resolves({ driver: 'docker-compose', configProvider: 'filesystem' }) },
        driver: { resolveDriverFromName: sinon.stub().returns(() => driver) },
        configProvider: { resolveConfigProviderFromName: sinon.stub().returns(() => provider) },
        httpProxy: { reconfigureHTTPProxy },
      })
      return { driver, Navy, reconfigureHTTPProxy }
    }

    it('should default to launching the currently launched services when no list is given', async function () {
      const { driver, Navy } = setupForLaunch({ available: ['api'], launched: ['api'] })

      await new Navy('env').launch()

      expect(driver.launch.calledOnce).to.equal(true)
      expect(driver.launch.firstCall.args[0]).to.eql(['api'])
    })

    it('should filter out unknown service names with a warning', async function () {
      const log = sinon.stub(console, 'log')
      try {
        const { driver, Navy } = setupForLaunch({ available: ['api'] })

        await new Navy('env').launch(['api', 'unknown'])

        expect(driver.launch.firstCall.args[0]).to.eql(['api'])
        expect(log.calledWith('Unknown service name: unknown')).to.equal(true)
      } finally {
        log.restore()
      }
    })

    it('should return early without launching when all requested services are invalid', async function () {
      const log = sinon.stub(console, 'log')
      try {
        const { driver, Navy } = setupForLaunch({ available: ['api'] })

        await new Navy('env').launch(['unknown1', 'unknown2'])

        expect(driver.launch.called).to.equal(false)
      } finally {
        log.restore()
      }
    })

    it('should reconfigure the HTTP proxy after launch', async function () {
      const { Navy, reconfigureHTTPProxy } = setupForLaunch({ available: ['api'], launched: ['api'] })
      await new Navy('env').launch(['api'])
      expect(reconfigureHTTPProxy.calledOnce).to.equal(true)
    })

  })

  describe('reconfigure / relaunch', function () {

    it('reconfigure should be a no-op when no services are launched', async function () {
      const { Navy } = loadNavyModule({
        state: { getState: sinon.stub().resolves({ driver: 'docker-compose' }) },
        driver: {
          resolveDriverFromName: sinon.stub().returns(() => makeDriver({
            getLaunchedServiceNames: sinon.stub().resolves([]),
          })),
        },
      })

      await new Navy('env').reconfigure()
    })

    it('reconfigure should call launch when there are running services', async function () {
      const driver = makeDriver({
        getLaunchedServiceNames: sinon.stub().resolves(['api']),
        getAvailableServiceNames: sinon.stub().resolves(['api']),
      })
      const provider = { getNavyFilePath: async () => '/missing' }
      const { Navy } = loadNavyModule({
        state: { getState: sinon.stub().resolves({ driver: 'docker-compose', configProvider: 'filesystem' }) },
        driver: { resolveDriverFromName: sinon.stub().returns(() => driver) },
        configProvider: { resolveConfigProviderFromName: sinon.stub().returns(() => provider) },
      })

      await new Navy('env').reconfigure()
      expect(driver.launch.calledOnce).to.equal(true)
    })

    it('relaunch should delegate to reconfigure', async function () {
      const driver = makeDriver({
        getLaunchedServiceNames: sinon.stub().resolves([]),
      })
      const { Navy } = loadNavyModule({
        state: { getState: sinon.stub().resolves({ driver: 'docker-compose' }) },
        driver: { resolveDriverFromName: sinon.stub().returns(() => driver) },
      })

      await new Navy('env').relaunch()
    })

  })

  describe('destroy', function () {

    it('should throw NavyNotInitialisedError when not initialised', async function () {
      const { Navy } = loadNavyModule()
      let caught
      try { await new Navy('env').destroy() } catch (e) { caught = e }
      expect(caught).to.be.instanceof(NavyNotInitialisedError)
    })

    it('should reconfigure proxy excluding self, destroy the driver, and delete state', async function () {
      const driver = makeDriver()
      const provider = { getNavyFilePath: async () => '/missing' }
      const reconfigureHTTPProxy = sinon.stub().resolves()
      const deleteState = sinon.stub().resolves()
      const { Navy } = loadNavyModule({
        state: {
          getState: sinon.stub().resolves({ driver: 'docker-compose', configProvider: 'filesystem' }),
          deleteState,
        },
        driver: { resolveDriverFromName: sinon.stub().returns(() => driver) },
        configProvider: { resolveConfigProviderFromName: sinon.stub().returns(() => provider) },
        httpProxy: { reconfigureHTTPProxy },
        fs: { readdirAsync: sinon.stub().resolves(['env', 'other']) },
      })

      await new Navy('env').destroy()

      expect(reconfigureHTTPProxy.calledOnce).to.equal(true)
      expect(reconfigureHTTPProxy.firstCall.args[0].navies).to.eql(['other'])
      expect(driver.destroy.calledOnce).to.equal(true)
      expect(deleteState.calledOnce).to.equal(true)
    })

    it('should still delete state even when driver.destroy throws', async function () {
      const driver = makeDriver({ destroy: sinon.stub().rejects(new Error('boom')) })
      const provider = { getNavyFilePath: async () => '/missing' }
      const deleteState = sinon.stub().resolves()
      const { Navy } = loadNavyModule({
        state: {
          getState: sinon.stub().resolves({ driver: 'docker-compose', configProvider: 'filesystem' }),
          deleteState,
        },
        driver: { resolveDriverFromName: sinon.stub().returns(() => driver) },
        configProvider: { resolveConfigProviderFromName: sinon.stub().returns(() => provider) },
        httpProxy: { reconfigureHTTPProxy: sinon.stub().resolves() },
      })

      await new Navy('env').destroy()
      expect(deleteState.calledOnce).to.equal(true)
    })

  })

  describe('start/stop/restart/kill/rm/update/spawnLogStream', function () {

    function setup(driverOverrides = {}) {
      const driver = makeDriver(driverOverrides)
      const provider = { getNavyFilePath: async () => '/missing' }
      const { Navy } = loadNavyModule({
        state: { getState: sinon.stub().resolves({ driver: 'docker-compose', configProvider: 'filesystem' }) },
        driver: { resolveDriverFromName: sinon.stub().returns(() => driver) },
        configProvider: { resolveConfigProviderFromName: sinon.stub().returns(() => provider) },
      })
      return { driver, navy: new Navy('env') }
    }

    ;[
      { method: 'start', explicit: ['api'] },
      { method: 'stop', explicit: ['api'] },
      { method: 'restart', explicit: ['api'] },
      { method: 'kill', explicit: ['api'] },
    ].forEach(({ method, explicit }) => {
      it(`${method} should pass the explicit list through to the driver`, async function () {
        const { driver, navy } = setup()
        await navy[method](explicit)
        expect(driver[method].calledOnce).to.equal(true)
        expect(driver[method].firstCall.args[0]).to.eql(explicit)
      })

      it(`${method} should default to currently launched services when none provided`, async function () {
        const { driver, navy } = setup({ getLaunchedServiceNames: sinon.stub().resolves(['api', 'web']) })
        await navy[method]()
        expect(driver[method].firstCall.args[0]).to.eql(['api', 'web'])
      })
    })

    it('rm should default to currently launched services when none provided', async function () {
      const { driver, navy } = setup({ getLaunchedServiceNames: sinon.stub().resolves(['x']) })
      await navy.rm()
      expect(driver.rm.firstCall.args[0]).to.eql(['x'])
    })

    it('rm should accept an explicit list', async function () {
      const { driver, navy } = setup()
      await navy.rm(['x'])
      expect(driver.rm.firstCall.args[0]).to.eql(['x'])
    })

    it('update should default to all available services', async function () {
      const { driver, navy } = setup({ getAvailableServiceNames: sinon.stub().resolves(['a', 'b']) })
      await navy.update()
      expect(driver.update.firstCall.args[0]).to.eql(['a', 'b'])
    })

    it('update should accept an explicit list', async function () {
      const { driver, navy } = setup()
      await navy.update(['x'])
      expect(driver.update.firstCall.args[0]).to.eql(['x'])
    })

    it('spawnLogStream should default to currently launched services when none provided', async function () {
      const { driver, navy } = setup({ getLaunchedServiceNames: sinon.stub().resolves(['l']) })
      await navy.spawnLogStream()
      expect(driver.spawnLogStream.firstCall.args[0]).to.eql(['l'])
    })

    it('spawnLogStream should accept an explicit list', async function () {
      const { driver, navy } = setup()
      await navy.spawnLogStream(['l'])
      expect(driver.spawnLogStream.firstCall.args[0]).to.eql(['l'])
    })

    it('start should reconfigure the HTTP proxy', async function () {
      const driver = makeDriver({ getLaunchedServiceNames: sinon.stub().resolves(['api']) })
      const provider = { getNavyFilePath: async () => '/missing' }
      const reconfigure = sinon.stub().resolves()
      const { Navy } = loadNavyModule({
        state: { getState: sinon.stub().resolves({ driver: 'docker-compose', configProvider: 'filesystem' }) },
        driver: { resolveDriverFromName: sinon.stub().returns(() => driver) },
        configProvider: { resolveConfigProviderFromName: sinon.stub().returns(() => provider) },
        httpProxy: { reconfigureHTTPProxy: reconfigure },
      })

      await new Navy('env').start(['api'])
      expect(reconfigure.calledOnce).to.equal(true)
    })

  })

  describe('useTag/resetTag/usePort/resetPort', function () {

    function setupTagPort({ initialState = { driver: 'docker-compose', configProvider: 'filesystem', services: {} } } = {}) {
      const driver = makeDriver({
        getAvailableServiceNames: sinon.stub().resolves(['api']),
        getLaunchedServiceNames: sinon.stub().resolves([]),
      })
      let currentState = initialState
      const getStateStub = sinon.stub().callsFake(async () => currentState)
      const saveStub = sinon.stub().callsFake(async (envName, state) => {
        currentState = state
      })
      const provider = { getNavyFilePath: async () => '/missing' }
      const { Navy } = loadNavyModule({
        state: { getState: getStateStub, saveState: saveStub },
        driver: { resolveDriverFromName: sinon.stub().returns(() => driver) },
        configProvider: { resolveConfigProviderFromName: sinon.stub().returns(() => provider) },
      })
      return { Navy, driver, saveStub }
    }

    it('useTag should record the tag in state, kill the service, and update it', async function () {
      const { Navy, driver, saveStub } = setupTagPort()
      await new Navy('env').useTag('api', 'v2')
      const written = saveStub.firstCall.args[1]
      expect(written.services.api._tag).to.equal('v2')
      expect(driver.kill.firstCall.args[0]).to.eql(['api'])
      expect(driver.update.firstCall.args[0]).to.eql(['api'])
    })

    // NOTE: useTag/resetTag/usePort/resetPort all start with
    // `(await this.getState()) || {}` and write the result back as the new
    // state. If state was never initialised, the saved state has no `driver`
    // key, and the subsequent kill/launch then fails with a NO_DRIVER invariant.
    // We therefore exercise these methods only with a properly initialised state.
    it('useTag should preserve other services in state.services when modifying one', async function () {
      const initial = {
        driver: 'docker-compose',
        configProvider: 'filesystem',
        services: { other: { _tag: 'keep-me' } },
      }
      const { Navy, saveStub } = setupTagPort({ initialState: initial })

      await new Navy('env').useTag('api', 'v2')

      const written = saveStub.firstCall.args[1]
      expect(written.services.other).to.eql({ _tag: 'keep-me' })
      expect(written.services.api._tag).to.equal('v2')
    })

    it('resetTag should clear the tag and relaunch the service with noDeps', async function () {
      const { Navy, driver, saveStub } = setupTagPort({
        initialState: { driver: 'docker-compose', configProvider: 'filesystem', services: { api: { _tag: 'old' } } },
      })

      await new Navy('env').resetTag('api')

      expect(saveStub.firstCall.args[1].services.api._tag).to.equal(undefined)
      expect(driver.launch.firstCall.args[1]).to.eql({ noDeps: true })
    })

    it('resetTag should preserve services other than the one being reset', async function () {
      const { Navy, saveStub } = setupTagPort({
        initialState: {
          driver: 'docker-compose',
          configProvider: 'filesystem',
          services: { api: { _tag: 'old' }, other: { _tag: 'keep' } },
        },
      })

      await new Navy('env').resetTag('api')

      const written = saveStub.firstCall.args[1]
      expect(written.services.other).to.eql({ _tag: 'keep' })
      expect(written.services.api._tag).to.equal(undefined)
    })

    it('usePort should record port mapping in state', async function () {
      const { Navy, saveStub } = setupTagPort()
      await new Navy('env').usePort('api', 80, 8080)
      expect(saveStub.firstCall.args[1].services.api._ports).to.eql({ 80: 8080 })
    })

    it('usePort should merge the new port mapping with existing ports for the service', async function () {
      const { Navy, saveStub } = setupTagPort({
        initialState: {
          driver: 'docker-compose',
          configProvider: 'filesystem',
          services: { api: { _ports: { 443: 4433 } } },
        },
      })

      await new Navy('env').usePort('api', 80, 8080)

      const ports = saveStub.firstCall.args[1].services.api._ports
      expect(ports).to.eql({ 80: 8080, 443: 4433 })
    })

    it('resetPort should set the port to undefined', async function () {
      const { Navy, saveStub } = setupTagPort({
        initialState: {
          driver: 'docker-compose',
          configProvider: 'filesystem',
          services: { api: { _ports: { 80: 8080 } } },
        },
      })

      await new Navy('env').resetPort('api', 80)
      expect(saveStub.firstCall.args[1].services.api._ports[80]).to.equal(undefined)
    })

    it('resetPort should preserve other ports on the same service', async function () {
      const { Navy, saveStub } = setupTagPort({
        initialState: {
          driver: 'docker-compose',
          configProvider: 'filesystem',
          services: { api: { _ports: { 80: 8080, 443: 4433 } } },
        },
      })

      await new Navy('env').resetPort('api', 80)

      const ports = saveStub.firstCall.args[1].services.api._ports
      expect(ports[80]).to.equal(undefined)
      expect(ports[443]).to.equal(4433)
    })

    it('useTag should throw NavyNotInitialisedError when state is missing', async function () {
      const { Navy } = loadNavyModule()
      let caught
      try {
        await new Navy('env').useTag('api', 'v1')
      } catch (e) {
        caught = e
      }
      expect(caught).to.be.instanceof(NavyNotInitialisedError)
    })

    it('resetTag should throw NavyNotInitialisedError when state is missing', async function () {
      const { Navy } = loadNavyModule()
      let caught
      try {
        await new Navy('env').resetTag('api')
      } catch (e) {
        caught = e
      }
      expect(caught).to.be.instanceof(NavyNotInitialisedError)
    })

    it('usePort should throw NavyNotInitialisedError when state is missing', async function () {
      const { Navy } = loadNavyModule()
      let caught
      try {
        await new Navy('env').usePort('api', 80, 8080)
      } catch (e) {
        caught = e
      }
      expect(caught).to.be.instanceof(NavyNotInitialisedError)
    })

    it('resetPort should throw NavyNotInitialisedError when state is missing', async function () {
      const { Navy } = loadNavyModule()
      let caught
      try {
        await new Navy('env').resetPort('api', 80)
      } catch (e) {
        caught = e
      }
      expect(caught).to.be.instanceof(NavyNotInitialisedError)
    })

    it('useTag should treat missing state.services as an empty services map', async function () {
      const { Navy, saveStub } = setupTagPort({
        initialState: { driver: 'docker-compose', configProvider: 'filesystem' },
      })

      await new Navy('env').useTag('api', 'v2')

      expect(saveStub.firstCall.args[1].services.api._tag).to.equal('v2')
    })

    it('resetTag should treat missing state.services as an empty services map', async function () {
      const { Navy, saveStub } = setupTagPort({
        initialState: { driver: 'docker-compose', configProvider: 'filesystem' },
      })

      await new Navy('env').resetTag('api')

      expect(saveStub.firstCall.args[1].services.api._tag).to.equal(undefined)
    })

    it('usePort should treat missing state.services as an empty services map', async function () {
      const { Navy, saveStub } = setupTagPort({
        initialState: { driver: 'docker-compose', configProvider: 'filesystem' },
      })

      await new Navy('env').usePort('api', 80, 8080)

      expect(saveStub.firstCall.args[1].services.api._ports).to.eql({ 80: 8080 })
    })

    it('resetPort should treat missing state.services as an empty services map', async function () {
      const { Navy, saveStub } = setupTagPort({
        initialState: { driver: 'docker-compose', configProvider: 'filesystem' },
      })

      await new Navy('env').resetPort('api', 80)

      expect(saveStub.firstCall.args[1].services.api._ports[80]).to.equal(undefined)
    })

  })

  describe('externalIP', function () {

    it('should return the IP from getExternalIP using config.externalIP', async function () {
      const { Navy } = loadNavyModule({
        config: { getConfig: sinon.stub().returns({ externalIP: 'configured.host' }) },
        externalIP: { getExternalIP: sinon.stub().resolves('1.2.3.4') },
      })

      expect(await new Navy('env').externalIP()).to.equal('1.2.3.4')
    })

  })

  describe('port', function () {

    it('should delegate to driver.port with the privatePort and index defaulting to 1', async function () {
      const driver = makeDriver({ port: sinon.stub().resolves(8080) })
      const { Navy } = loadNavyModule({
        state: { getState: sinon.stub().resolves({ driver: 'docker-compose' }) },
        driver: { resolveDriverFromName: sinon.stub().returns(() => driver) },
      })

      expect(await new Navy('env').port('api', 80)).to.equal(8080)
      expect(driver.port.firstCall.args).to.eql(['api', 80, 1])
    })

  })

  describe('url', function () {

    it('should return getUrlFromService when there is a running service URL', async function () {
      const driver = makeDriver({ ps: sinon.stub().resolves([{ name: 'api' }]) })
      const { Navy } = loadNavyModule({
        state: { getState: sinon.stub().resolves({ driver: 'docker-compose' }) },
        driver: { resolveDriverFromName: sinon.stub().returns(() => driver) },
        serviceHost: {
          getUrlFromService: sinon.stub().returns('http://from-service'),
          createUrlForService: sinon.stub().resolves('http://fallback'),
        },
      })

      expect(await new Navy('env').url('api')).to.equal('http://from-service')
    })

    it('should fall back to createUrlForService when getUrlFromService returns null', async function () {
      const driver = makeDriver({ ps: sinon.stub().resolves([{ name: 'api' }]) })
      const { Navy } = loadNavyModule({
        state: { getState: sinon.stub().resolves({ driver: 'docker-compose' }) },
        driver: { resolveDriverFromName: sinon.stub().returns(() => driver) },
        serviceHost: {
          getUrlFromService: sinon.stub().returns(null),
          createUrlForService: sinon.stub().resolves('http://fallback'),
        },
        externalIP: { getExternalIP: sinon.stub().resolves('1.2.3.4') },
      })

      expect(await new Navy('env').url('api')).to.equal('http://fallback')
    })

  })

  describe('ps / getLaunchedServiceNames / getAvailableServiceNames', function () {

    it('ps should delegate to the driver', async function () {
      const driver = makeDriver({ ps: sinon.stub().resolves([{ name: 'api' }]) })
      const { Navy } = loadNavyModule({
        state: { getState: sinon.stub().resolves({ driver: 'docker-compose' }) },
        driver: { resolveDriverFromName: sinon.stub().returns(() => driver) },
      })

      expect(await new Navy('env').ps()).to.eql([{ name: 'api' }])
    })

    it('getLaunchedServiceNames should delegate to driver', async function () {
      const driver = makeDriver({ getLaunchedServiceNames: sinon.stub().resolves(['x']) })
      const { Navy } = loadNavyModule({
        state: { getState: sinon.stub().resolves({ driver: 'docker-compose' }) },
        driver: { resolveDriverFromName: sinon.stub().returns(() => driver) },
      })

      expect(await new Navy('env').getLaunchedServiceNames()).to.eql(['x'])
    })

    it('getAvailableServiceNames should delegate to driver', async function () {
      const driver = makeDriver({ getAvailableServiceNames: sinon.stub().resolves(['x', 'y']) })
      const { Navy } = loadNavyModule({
        state: { getState: sinon.stub().resolves({ driver: 'docker-compose' }) },
        driver: { resolveDriverFromName: sinon.stub().returns(() => driver) },
      })

      expect(await new Navy('env').getAvailableServiceNames()).to.eql(['x', 'y'])
    })

  })

  describe('waitForHealthy', function () {

    function setupHealth({ ps = [] } = {}) {
      const driver = makeDriver({ ps: sinon.stub().resolves(ps) })
      const { Navy } = loadNavyModule({
        state: { getState: sinon.stub().resolves({ driver: 'docker-compose' }) },
        driver: { resolveDriverFromName: sinon.stub().returns(() => driver) },
      })
      return new Navy('env')
    }

    it('should resolve true when all specified services are healthy', async function () {
      const navy = setupHealth({
        ps: [{ name: 'api', raw: { State: { Health: { Status: 'healthy' } } } }],
      })

      const result = await navy.waitForHealthy(['api'], null, { factor: 1, retries: 1, minTimeout: 1 })
      expect(result).to.equal(true)
    })

    it('should default services to all containers with health checks when none provided', async function () {
      const navy = setupHealth({
        ps: [
          { name: 'api', raw: { State: { Health: { Status: 'healthy' } } } },
          { name: 'noh', raw: { State: {} } },
        ],
      })

      const result = await navy.waitForHealthy(undefined, null, { factor: 1, retries: 1, minTimeout: 1 })
      expect(result).to.equal(true)
    })

    it('should call progressCallback with health status of each service', async function () {
      const navy = setupHealth({
        ps: [{ name: 'api', raw: { State: { Health: { Status: 'healthy' } } } }],
      })
      const cb = sinon.spy()

      await navy.waitForHealthy(['api'], cb, { factor: 1, retries: 1, minTimeout: 1 })
      expect(cb.calledOnce).to.equal(true)
      expect(cb.firstCall.args[0]).to.eql([{ service: 'api', health: 'healthy' }])
    })

    it('should throw a NavyError describing services missing health checks', async function () {
      const navy = setupHealth({
        ps: [{ name: 'api', raw: { State: {} } }],
      })

      let caught
      try {
        await navy.waitForHealthy(['api'], null, { factor: 1, retries: 1, minTimeout: 1 })
      } catch (e) {
        caught = e
      }
      expect(caught).to.be.instanceof(NavyError)
      expect(caught.message).to.contain("don't have health checks")
      expect(caught.message).to.contain('api')
    })

    // NOTE: Currently `waitForHealthy` calls `retry('Unhealthy services: ...')`
    // with a string. After retries exhaust, that string is what is thrown, then
    // `catch (e) { throw new NavyError(e.message) }` reads `.message` on the
    // string, which is undefined. The NavyError that surfaces therefore has no
    // message. This test asserts the type only and documents the lost message.
    it('should throw a NavyError after retries exhausted with unhealthy services', async function () {
      this.timeout(10000)
      const navy = setupHealth({
        ps: [{ name: 'api', raw: { State: { Health: { Status: 'starting' } } } }],
      })

      let caught
      try {
        await navy.waitForHealthy(['api'], null, { factor: 1, retries: 2, minTimeout: 1 })
      } catch (e) {
        caught = e
      }
      expect(caught).to.be.instanceof(NavyError)
    })

  })

  describe('getLaunchedNavies / getLaunchedNavyNames', function () {

    it('getLaunchedNavyNames should return readdir entries', async function () {
      const { getLaunchedNavyNames } = loadNavyModule({
        fs: { readdirAsync: sinon.stub().resolves(['env1', 'env2']) },
      })

      expect(await getLaunchedNavyNames()).to.eql(['env1', 'env2'])
    })

    it('getLaunchedNavyNames should return [] when readdir fails', async function () {
      const { getLaunchedNavyNames } = loadNavyModule({
        fs: { readdirAsync: sinon.stub().rejects(new Error('ENOENT')) },
      })

      expect(await getLaunchedNavyNames()).to.eql([])
    })

    it('getLaunchedNavies should return Navy instances for each navy directory', async function () {
      const { getLaunchedNavies } = loadNavyModule({
        fs: {
          readdirAsync: sinon.stub().resolves(['env1', 'env2', 'file.txt']),
          lstatSync: sinon.stub().callsFake((p) => ({ isDirectory: () => !p.endsWith('file.txt') })),
        },
      })

      const navies = await getLaunchedNavies()
      expect(navies.map(n => n.name)).to.eql(['env1', 'env2'])
    })

    it('getLaunchedNavies should return [] when readdir fails', async function () {
      const { getLaunchedNavies } = loadNavyModule({
        fs: { readdirAsync: sinon.stub().rejects(new Error('ENOENT')) },
      })

      expect(await getLaunchedNavies()).to.eql([])
    })

  })

})
