/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

describe('cli/logs', function () {

  let sandbox
  let getNavyStub
  let navyStub
  let logs

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    navyStub = {
      spawnLogStream: sandbox.stub().resolves(),
    }
    getNavyStub = sandbox.stub().returns(navyStub)

    logs = proxyquire.noCallThru()('../logs', {
      '../': { getNavy: getNavyStub },
    })
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('default export', function () {

    it('should resolve the navy instance using opts.navy', async function () {
      await logs(['api'], { navy: 'env-1' })

      expect(getNavyStub.calledOnce).to.equal(true)
      expect(getNavyStub.firstCall.args[0]).to.equal('env-1')
    })

    it('should call spawnLogStream with the supplied services array', async function () {
      const services = ['api', 'web']

      await logs(services, { navy: 'env-1' })

      expect(navyStub.spawnLogStream.calledOnce).to.equal(true)
      expect(navyStub.spawnLogStream.firstCall.args[0]).to.equal(services)
    })

    it('should propagate empty service lists through to spawnLogStream', async function () {
      await logs([], { navy: 'env-1' })

      expect(navyStub.spawnLogStream.firstCall.args[0]).to.eql([])
    })

  })

})
