/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

describe('cli/refresh-config', function () {

  let sandbox
  let getNavyStub
  let navyStub
  let configProvider
  let startDriverLoggingStub
  let stopDriverLoggingStub
  let consoleLogStub
  let refreshConfigCli

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    configProvider = {
      refreshConfig: sandbox.stub().resolves(),
    }
    navyStub = {
      name: 'env-1',
      getConfigProvider: sandbox.stub().resolves(configProvider),
      reconfigure: sandbox.stub().resolves(),
    }
    getNavyStub = sandbox.stub().returns(navyStub)
    startDriverLoggingStub = sandbox.stub()
    stopDriverLoggingStub = sandbox.stub()
    consoleLogStub = sandbox.stub(console, 'log')

    refreshConfigCli = proxyquire.noCallThru()('../refresh-config', {
      '../': { getNavy: getNavyStub },
      '../driver-logging': {
        startDriverLogging: startDriverLoggingStub,
        stopDriverLogging: stopDriverLoggingStub,
      },
    })
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('default export', function () {

    it('should resolve the navy instance using opts.navy', async function () {
      await refreshConfigCli({ navy: 'env-1' })

      expect(getNavyStub.calledOnce).to.equal(true)
      expect(getNavyStub.firstCall.args[0]).to.equal('env-1')
    })

    it('should call refreshConfig on the resolved config provider', async function () {
      await refreshConfigCli({ navy: 'env-1' })

      expect(navyStub.getConfigProvider.calledOnce).to.equal(true)
      expect(configProvider.refreshConfig.calledOnce).to.equal(true)
    })

    it('should bracket reconfigure with start/stopDriverLogging', async function () {
      await refreshConfigCli({ navy: 'env-1' })

      expect(startDriverLoggingStub.calledOnce).to.equal(true)
      expect(navyStub.reconfigure.calledOnce).to.equal(true)
      expect(stopDriverLoggingStub.calledOnce).to.equal(true)
      expect(
        startDriverLoggingStub.calledBefore(navyStub.reconfigure),
      ).to.equal(true)
      expect(
        navyStub.reconfigure.calledBefore(stopDriverLoggingStub),
      ).to.equal(true)
    })

    it('should log a success message naming the navy', async function () {
      await refreshConfigCli({ navy: 'env-1' })

      const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join(' ')
      expect(printed).to.contain('Config refreshed')
      expect(printed).to.contain('env-1')
    })

    it('should throw an invariant violation when the navy has no config provider', async function () {
      navyStub.getConfigProvider.resolves(null)

      let caught
      try {
        await refreshConfigCli({ navy: 'env-1' })
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.an('error')
      expect(caught.message).to.match(/NO_CONFIG_PROVIDER/)
      expect(configProvider.refreshConfig.called).to.equal(false)
      expect(navyStub.reconfigure.called).to.equal(false)
      expect(startDriverLoggingStub.called).to.equal(false)
    })

  })

})
