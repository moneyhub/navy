/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

describe('cli/external-ip', function () {

  let sandbox
  let getConfigStub
  let getExternalIPStub
  let consoleLogStub
  let externalIpCli

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    getConfigStub = sandbox.stub()
    getExternalIPStub = sandbox.stub()
    consoleLogStub = sandbox.stub(console, 'log')

    externalIpCli = proxyquire.noCallThru()('../external-ip', {
      '../config': { getConfig: getConfigStub },
      '../util/external-ip': { getExternalIP: getExternalIPStub },
    })
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('default export', function () {

    it('should pass the externalIP value from config to getExternalIP', async function () {
      getConfigStub.returns({ externalIP: 'configured.host' })
      getExternalIPStub.resolves('1.2.3.4')

      await externalIpCli()

      expect(getConfigStub.calledOnce).to.equal(true)
      expect(getExternalIPStub.calledOnce).to.equal(true)
      expect(getExternalIPStub.firstCall.args[0]).to.equal('configured.host')
    })

    it('should log the resolved external IP', async function () {
      getConfigStub.returns({ externalIP: null })
      getExternalIPStub.resolves('5.6.7.8')

      await externalIpCli()

      expect(consoleLogStub.calledOnce).to.equal(true)
      expect(consoleLogStub.firstCall.args[0]).to.equal('5.6.7.8')
    })

    it('should pass undefined when config has no externalIP key', async function () {
      getConfigStub.returns({})
      getExternalIPStub.resolves('127.0.0.1')

      await externalIpCli()

      expect(getExternalIPStub.firstCall.args[0]).to.equal(undefined)
    })

    it('should support an asynchronous getConfig implementation', async function () {
      getConfigStub.resolves({ externalIP: 'async.host' })
      getExternalIPStub.resolves('9.9.9.9')

      await externalIpCli()

      expect(getExternalIPStub.firstCall.args[0]).to.equal('async.host')
      expect(consoleLogStub.firstCall.args[0]).to.equal('9.9.9.9')
    })

  })

})
