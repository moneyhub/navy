/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

describe('cli/lan-ip', function () {

  let sandbox
  let getLANIPStub
  let setConfigStub
  let getConfigStub
  let reconfigureAllNaviesStub
  let consoleLogStub
  let lanIpCli

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    getLANIPStub = sandbox.stub()
    setConfigStub = sandbox.stub().resolves()
    getConfigStub = sandbox.stub()
    reconfigureAllNaviesStub = sandbox.stub().resolves()
    consoleLogStub = sandbox.stub(console, 'log')

    lanIpCli = proxyquire.noCallThru()('../lan-ip', {
      '../util/get-lan-ip': { getLANIP: getLANIPStub },
      '../config': { setConfig: setConfigStub, getConfig: getConfigStub },
      './util/reconfigure': { reconfigureAllNavies: reconfigureAllNaviesStub },
    })
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('default export', function () {

    it('should look up the LAN IP via getLANIP', async function () {
      getLANIPStub.resolves('10.0.0.5')
      getConfigStub.returns({ defaultNavy: 'dev' })

      await lanIpCli()

      expect(getLANIPStub.calledOnce).to.equal(true)
    })

    it('should write a config that merges existing config with the new externalIP', async function () {
      getLANIPStub.resolves('10.0.0.5')
      getConfigStub.returns({ defaultNavy: 'dev', tlsRootCaDir: '/ca' })

      await lanIpCli()

      expect(setConfigStub.calledOnce).to.equal(true)
      expect(setConfigStub.firstCall.args[0]).to.eql({
        defaultNavy: 'dev',
        tlsRootCaDir: '/ca',
        externalIP: '10.0.0.5',
      })
    })

    it('should override an existing externalIP in config with the LAN IP', async function () {
      getLANIPStub.resolves('10.0.0.5')
      getConfigStub.returns({ externalIP: 'old.host', defaultNavy: 'dev' })

      await lanIpCli()

      expect(setConfigStub.firstCall.args[0].externalIP).to.equal('10.0.0.5')
    })

    it('should reconfigure all navies after writing the new config', async function () {
      getLANIPStub.resolves('10.0.0.5')
      getConfigStub.returns({})

      await lanIpCli()

      expect(reconfigureAllNaviesStub.calledOnce).to.equal(true)
      expect(
        setConfigStub.calledBefore(reconfigureAllNaviesStub),
      ).to.equal(true)
    })

    it('should log a confirmation including the LAN IP', async function () {
      getLANIPStub.resolves('10.0.0.5')
      getConfigStub.returns({})

      await lanIpCli()

      const messages = consoleLogStub.getCalls().map(c => c.args[0] || '')
      const hasLanIp = messages.some(m => typeof m === 'string' && m.includes('10.0.0.5'))
      expect(hasLanIp).to.equal(true)
      const hasLabel = messages.some(m => typeof m === 'string' && m.includes('LAN IP'))
      expect(hasLabel).to.equal(true)
    })

  })

})
