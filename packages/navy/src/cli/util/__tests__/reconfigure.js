/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

describe('cli/util/reconfigure', function () {

  let sandbox
  let getLaunchedNaviesStub
  let startDriverLoggingStub
  let stopDriverLoggingStub
  let reconfigureAllNavies

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    getLaunchedNaviesStub = sandbox.stub()
    startDriverLoggingStub = sandbox.stub()
    stopDriverLoggingStub = sandbox.stub()

    reconfigureAllNavies = proxyquire.noCallThru()('../reconfigure', {
      '../../': { getLaunchedNavies: getLaunchedNaviesStub },
      '../../driver-logging': {
        startDriverLogging: startDriverLoggingStub,
        stopDriverLogging: stopDriverLoggingStub,
      },
    }).reconfigureAllNavies
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('reconfigureAllNavies', function () {

    it('should be a no-op when there are no launched navies', async function () {
      getLaunchedNaviesStub.resolves([])

      await reconfigureAllNavies()

      expect(getLaunchedNaviesStub.calledOnce).to.equal(true)
      expect(startDriverLoggingStub.called).to.equal(false)
      expect(stopDriverLoggingStub.called).to.equal(false)
    })

    it('should reconfigure each launched navy in turn with bracketed driver logging', async function () {
      const navyA = { name: 'envA', reconfigure: sandbox.stub().resolves() }
      const navyB = { name: 'envB', reconfigure: sandbox.stub().resolves() }
      getLaunchedNaviesStub.resolves([navyA, navyB])

      await reconfigureAllNavies()

      expect(navyA.reconfigure.calledOnce).to.equal(true)
      expect(navyB.reconfigure.calledOnce).to.equal(true)
      expect(startDriverLoggingStub.callCount).to.equal(2)
      expect(stopDriverLoggingStub.callCount).to.equal(2)
    })

    it('should pass a message that includes the navy name to startDriverLogging', async function () {
      const navy = { name: 'envA', reconfigure: sandbox.stub().resolves() }
      getLaunchedNaviesStub.resolves([navy])

      await reconfigureAllNavies()

      expect(startDriverLoggingStub.firstCall.args[0]).to.contain('envA')
      expect(startDriverLoggingStub.firstCall.args[0]).to.contain('Reconfiguring')
    })

    it('should call startDriverLogging before each reconfigure and stopDriverLogging after', async function () {
      const navy = { name: 'envA', reconfigure: sandbox.stub().resolves() }
      getLaunchedNaviesStub.resolves([navy])

      await reconfigureAllNavies()

      expect(
        startDriverLoggingStub.calledBefore(navy.reconfigure),
      ).to.equal(true)
      expect(
        navy.reconfigure.calledBefore(stopDriverLoggingStub),
      ).to.equal(true)
    })

  })

})
