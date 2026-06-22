/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import stripAnsi from 'strip-ansi'

describe('cli/status', function () {

  let sandbox
  let getLaunchedNaviesStub
  let getConfigStub
  let consoleLogStub
  let statusCli

  function makeNavy(overrides = {}) {
    return {
      name: 'env-1',
      ps: sandbox.stub().resolves([]),
      getState: sandbox.stub().resolves({ configProvider: 'filesystem' }),
      getConfigProvider: sandbox.stub().resolves({
        getLocationDisplayName: sandbox.stub().resolves('/path/to/cfg'),
      }),
      url: sandbox.stub().callsFake(async (svc) => `http://${svc}.local`),
      ...overrides,
    }
  }

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    getLaunchedNaviesStub = sandbox.stub().resolves([])
    getConfigStub = sandbox.stub().resolves({ defaultNavy: 'env-1' })
    consoleLogStub = sandbox.stub(console, 'log')

    statusCli = proxyquire.noCallThru()('../status', {
      '../': { getLaunchedNavies: getLaunchedNaviesStub },
      '../config': { getConfig: getConfigStub },
    })
  })

  afterEach(function () {
    sandbox.restore()
  })

  function combinedLog() {
    return consoleLogStub.getCalls().map(c => String(c.args[0] || '')).join('\n')
  }

  describe('default export', function () {

    it('should render an empty table when there are no navies', async function () {
      getLaunchedNaviesStub.resolves([])

      await statusCli({})

      expect(consoleLogStub.calledOnce).to.equal(true)
      const text = stripAnsi(consoleLogStub.firstCall.args[0])
      expect(text).to.contain('NAME')
      expect(text).to.contain('ACTIVE')
      expect(text).to.contain('SERVICES')
      expect(text).to.contain('CONFIG PROVIDER')
      expect(text).to.contain('CONFIG LOCATION')
      expect(text).to.contain('URL')
    })

    it('should mark a navy with at least one running service as active', async function () {
      const navy = makeNavy()
      navy.ps.resolves([
        { name: 'api', status: 'running' },
        { name: 'db', status: 'exited' },
      ])
      getLaunchedNaviesStub.resolves([navy])

      await statusCli({})

      const text = stripAnsi(combinedLog())
      expect(text).to.contain('yes')
      expect(text).to.contain('2')
    })

    it('should mark a navy with no running services as inactive', async function () {
      const navy = makeNavy()
      navy.ps.resolves([{ name: 'api', status: 'exited' }])
      getLaunchedNaviesStub.resolves([navy])

      await statusCli({})

      const text = stripAnsi(combinedLog())
      expect(text).to.contain('no')
      expect(text).to.contain('1')
    })

    it('should highlight the default navy with (default)', async function () {
      const navy = makeNavy({ name: 'env-1' })
      getLaunchedNaviesStub.resolves([navy])
      getConfigStub.resolves({ defaultNavy: 'env-1' })

      await statusCli({})

      const text = stripAnsi(combinedLog())
      expect(text).to.contain('env-1')
      expect(text).to.contain('(default)')
    })

    it('should not highlight non-default navies as default', async function () {
      const navy = makeNavy({ name: 'env-2' })
      getLaunchedNaviesStub.resolves([navy])
      getConfigStub.resolves({ defaultNavy: 'env-1' })

      await statusCli({})

      const text = stripAnsi(combinedLog())
      expect(text).to.contain('env-2')
      expect(text).not.to.contain('(default)')
    })

    it('should include the config provider name and the config location', async function () {
      const navy = makeNavy()
      navy.getState.resolves({ configProvider: 'filesystem' })
      navy.getConfigProvider.resolves({
        getLocationDisplayName: sandbox.stub().resolves('/etc/navy'),
      })
      getLaunchedNaviesStub.resolves([navy])

      await statusCli({})

      const text = stripAnsi(combinedLog())
      expect(text).to.contain('filesystem')
      expect(text).to.contain('/etc/navy')
    })

    it('should call navy.url with the dimmed "service" placeholder for the table column', async function () {
      const navy = makeNavy()
      getLaunchedNaviesStub.resolves([navy])

      await statusCli({})

      expect(navy.url.calledOnce).to.equal(true)
      expect(stripAnsi(navy.url.firstCall.args[0])).to.equal('service')
    })

    it('should print JSON when opts.json is true', async function () {
      const navy = makeNavy({ name: 'env-1' })
      navy.ps.resolves([{ name: 'api', status: 'running' }])
      navy.getState.resolves({ configProvider: 'filesystem' })
      navy.getConfigProvider.resolves({
        getLocationDisplayName: sandbox.stub().resolves('/cfg/location'),
      })
      navy.url.resolves('http://[service].local')
      getLaunchedNaviesStub.resolves([navy])

      await statusCli({ json: true })

      expect(consoleLogStub.calledOnce).to.equal(true)
      const parsed = JSON.parse(consoleLogStub.firstCall.args[0])
      expect(parsed).to.be.an('array').with.lengthOf(1)
      expect(parsed[0]).to.deep.include({
        name: 'env-1',
        isActive: true,
        configProvider: 'filesystem',
        configLocation: '/cfg/location',
        url: 'http://[service].local',
      })
      expect(parsed[0].services).to.be.an('array').with.lengthOf(1)
      expect(parsed[0].state).to.deep.equal({ configProvider: 'filesystem' })
    })

    it('should mark JSON output as inactive when no services are running', async function () {
      const navy = makeNavy()
      navy.ps.resolves([{ name: 'api', status: 'exited' }])
      getLaunchedNaviesStub.resolves([navy])

      await statusCli({ json: true })

      const parsed = JSON.parse(consoleLogStub.firstCall.args[0])
      expect(parsed[0].isActive).to.equal(false)
    })

    it('should not call getConfig when running in json mode', async function () {
      const navy = makeNavy()
      getLaunchedNaviesStub.resolves([navy])

      await statusCli({ json: true })

      expect(getConfigStub.called).to.equal(false)
    })

    it('should pass [service] (not chalk-dim "service") to navy.url when in json mode', async function () {
      const navy = makeNavy()
      getLaunchedNaviesStub.resolves([navy])

      await statusCli({ json: true })

      expect(navy.url.calledOnce).to.equal(true)
      expect(navy.url.firstCall.args[0]).to.equal('[service]')
    })

  })

})
