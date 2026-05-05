/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

describe('cli/open', function () {

  let sandbox
  let getNavyStub
  let navyStub
  let openStub
  let consoleLogStub
  let openCli

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    navyStub = {
      url: sandbox.stub().resolves('http://service.local'),
    }
    getNavyStub = sandbox.stub().returns(navyStub)
    openStub = sandbox.stub()
    consoleLogStub = sandbox.stub(console, 'log')

    openCli = proxyquire.noCallThru()('../open', {
      open: openStub,
      '../': { getNavy: getNavyStub },
    })
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('default export', function () {

    it('should resolve the navy instance using opts.navy', async function () {
      await openCli('api', { navy: 'env-1' })

      expect(getNavyStub.calledOnce).to.equal(true)
      expect(getNavyStub.firstCall.args[0]).to.equal('env-1')
    })

    it('should resolve the URL for the requested service via navy.url', async function () {
      await openCli('api', { navy: 'env-1' })

      expect(navyStub.url.calledOnce).to.equal(true)
      expect(navyStub.url.firstCall.args[0]).to.equal('api')
    })

    it('should pass the resolved URL to the open package', async function () {
      navyStub.url.resolves('http://my-service.test')

      await openCli('api', { navy: 'env-1' })

      expect(openStub.calledOnce).to.equal(true)
      expect(openStub.firstCall.args[0]).to.equal('http://my-service.test')
    })

    it('should log a message indicating which service is being opened', async function () {
      await openCli('api', { navy: 'env-1' })

      expect(consoleLogStub.calledOnce).to.equal(true)
      expect(consoleLogStub.firstCall.args[0]).to.contain('Opening api...')
    })

  })

})
