/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

describe('cli/local-ip', function () {

  let sandbox
  let setConfigStub
  let getConfigStub
  let reconfigureAllNaviesStub
  let consoleLogStub
  let localIpCli

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    setConfigStub = sandbox.stub().resolves()
    getConfigStub = sandbox.stub()
    reconfigureAllNaviesStub = sandbox.stub().resolves()
    consoleLogStub = sandbox.stub(console, 'log')

    localIpCli = proxyquire.noCallThru()('../local-ip', {
      '../config': { setConfig: setConfigStub, getConfig: getConfigStub },
      './util/reconfigure': { reconfigureAllNavies: reconfigureAllNaviesStub },
    })
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('default export', function () {

    it('should write a config that merges existing config with externalIP=127.0.0.1', async function () {
      getConfigStub.returns({ defaultNavy: 'dev', tlsRootCaDir: '/ca' })

      await localIpCli()

      expect(setConfigStub.calledOnce).to.equal(true)
      expect(setConfigStub.firstCall.args[0]).to.eql({
        defaultNavy: 'dev',
        tlsRootCaDir: '/ca',
        externalIP: '127.0.0.1',
      })
    })

    it('should override an existing externalIP in config with 127.0.0.1', async function () {
      getConfigStub.returns({ externalIP: 'remote.host' })

      await localIpCli()

      expect(setConfigStub.firstCall.args[0].externalIP).to.equal('127.0.0.1')
    })

    it('should reconfigure all navies after writing the new config', async function () {
      getConfigStub.returns({})

      await localIpCli()

      expect(reconfigureAllNaviesStub.calledOnce).to.equal(true)
      expect(
        setConfigStub.calledBefore(reconfigureAllNaviesStub),
      ).to.equal(true)
    })

    it('should log a confirmation including the local IP', async function () {
      getConfigStub.returns({})

      await localIpCli()

      const messages = consoleLogStub.getCalls().map(c => c.args[0] || '')
      const hasIp = messages.some(m => typeof m === 'string' && m.includes('127.0.0.1'))
      expect(hasIp).to.equal(true)
      const hasLabel = messages.some(m => typeof m === 'string' && m.includes('local IP'))
      expect(hasLabel).to.equal(true)
    })

  })

})
