/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

describe('cli/doctor/invalid-compose-config', function () {

  let sandbox
  let getLaunchedNaviesStub
  let startStub
  let fixStub
  let catchInvariantStub
  let invalidComposeConfig

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    getLaunchedNaviesStub = sandbox.stub().resolves([])
    startStub = sandbox.stub()
    fixStub = sandbox.stub().callsFake(async (msg, name, callback) => callback())
    catchInvariantStub = sandbox.stub().callsFake(async (code, fn, catchCallback) => {
      try {
        await fn()
      } catch (err) {
        if (err.name === 'Invariant Violation' && err.message.indexOf(code) === 0) {
          await catchCallback()
        }
      }
    })

    invalidComposeConfig = proxyquire.noCallThru()('../invalid-compose-config', {
      '../../': { getLaunchedNavies: getLaunchedNaviesStub },
      './util': { start: startStub, fix: fixStub, catchInvariant: catchInvariantStub },
    })
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('default export', function () {

    it('should log a starting message', async function () {
      await invalidComposeConfig()

      expect(startStub.calledOnce).to.equal(true)
      expect(startStub.firstCall.args[0]).to.contain('compose')
    })

    it('should do nothing further when there are no launched navies', async function () {
      getLaunchedNaviesStub.resolves([])

      await invalidComposeConfig()

      expect(catchInvariantStub.called).to.equal(false)
      expect(fixStub.called).to.equal(false)
    })

    it('should call safeGetDriver().getConfig() for each navy', async function () {
      const driver = { getConfig: sandbox.stub().resolves({}) }
      const navy = {
        name: 'env-1',
        safeGetDriver: sandbox.stub().resolves(driver),
        delete: sandbox.stub().resolves(),
      }
      getLaunchedNaviesStub.resolves([navy])

      await invalidComposeConfig()

      expect(navy.safeGetDriver.calledOnce).to.equal(true)
      expect(driver.getConfig.calledOnce).to.equal(true)
    })

    it('should remove a navy whose driver throws NO_DOCKER_COMPOSE_FILE invariant', async function () {
      const err = new Error('NO_DOCKER_COMPOSE_FILE: not found')
      err.name = 'Invariant Violation'
      const driver = { getConfig: sandbox.stub().rejects(err) }
      const navy = {
        name: 'env-1',
        safeGetDriver: sandbox.stub().resolves(driver),
        delete: sandbox.stub().resolves(),
      }
      getLaunchedNaviesStub.resolves([navy])

      await invalidComposeConfig()

      expect(fixStub.calledOnce).to.equal(true)
      expect(navy.delete.calledOnce).to.equal(true)
    })

    it('should not call delete when the driver throws a different invariant', async function () {
      const err = new Error('SOMETHING_ELSE: nope')
      err.name = 'Invariant Violation'
      const driver = { getConfig: sandbox.stub().rejects(err) }
      const navy = {
        name: 'env-1',
        safeGetDriver: sandbox.stub().resolves(driver),
        delete: sandbox.stub().resolves(),
      }
      getLaunchedNaviesStub.resolves([navy])

      await invalidComposeConfig()

      expect(fixStub.called).to.equal(false)
      expect(navy.delete.called).to.equal(false)
    })

  })

})
