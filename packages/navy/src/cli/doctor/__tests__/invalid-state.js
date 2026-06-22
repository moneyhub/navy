/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

describe('cli/doctor/invalid-state', function () {

  let sandbox
  let getLaunchedNaviesStub
  let startStub
  let fixStub
  let invalidState

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    getLaunchedNaviesStub = sandbox.stub().resolves([])
    startStub = sandbox.stub()
    fixStub = sandbox.stub().callsFake(async (msg, name, callback) => callback())

    invalidState = proxyquire.noCallThru()('../invalid-state', {
      '../../': { getLaunchedNavies: getLaunchedNaviesStub },
      './util': { start: startStub, fix: fixStub },
    })
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('default export', function () {

    it('should log a starting message', async function () {
      await invalidState()

      expect(startStub.calledOnce).to.equal(true)
      expect(startStub.firstCall.args[0]).to.contain('dangling')
    })

    it('should remove a navy that has no config provider', async function () {
      const navy = {
        name: 'env-1',
        getConfigProvider: sandbox.stub().resolves(null),
        delete: sandbox.stub().resolves(),
      }
      getLaunchedNaviesStub.resolves([navy])

      await invalidState()

      expect(fixStub.calledOnce).to.equal(true)
      expect(fixStub.firstCall.args[0]).to.contain('without config provider')
      expect(navy.delete.calledOnce).to.equal(true)
    })

    it('should destroy a dangling navy whose config is invalid', async function () {
      const configProvider = { isDangling: sandbox.stub().resolves(true) }
      const navy = {
        name: 'env-1',
        getConfigProvider: sandbox.stub().resolves(configProvider),
        destroy: sandbox.stub().resolves(),
      }
      getLaunchedNaviesStub.resolves([navy])

      await invalidState()

      expect(fixStub.calledOnce).to.equal(true)
      expect(fixStub.firstCall.args[0]).to.contain('dangling Navy')
      expect(navy.destroy.calledOnce).to.equal(true)
    })

    it('should leave alone a navy whose config provider exists and is not dangling', async function () {
      const configProvider = { isDangling: sandbox.stub().resolves(false) }
      const navy = {
        name: 'env-1',
        getConfigProvider: sandbox.stub().resolves(configProvider),
        destroy: sandbox.stub().resolves(),
        delete: sandbox.stub().resolves(),
      }
      getLaunchedNaviesStub.resolves([navy])

      await invalidState()

      expect(fixStub.called).to.equal(false)
      expect(navy.destroy.called).to.equal(false)
      expect(navy.delete.called).to.equal(false)
    })

  })

})
