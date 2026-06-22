/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

describe('cli/run', function () {

  let sandbox
  let getNavyStub
  let navyStub
  let run

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    navyStub = {
      ensurePluginsLoaded: sandbox.stub().resolves(),
      invokeCommand: sandbox.stub().resolves(),
    }
    getNavyStub = sandbox.stub().returns(navyStub)

    run = proxyquire.noCallThru()('../run', {
      '../': { getNavy: getNavyStub },
    })
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('default export', function () {

    it('should resolve the navy instance using opts.navy', async function () {
      await run('cmd', [], { navy: 'env-1' })

      expect(getNavyStub.calledOnce).to.equal(true)
      expect(getNavyStub.firstCall.args[0]).to.equal('env-1')
    })

    it('should call ensurePluginsLoaded before invokeCommand', async function () {
      await run('cmd', ['a'], { navy: 'env-1' })

      expect(navyStub.ensurePluginsLoaded.calledOnce).to.equal(true)
      expect(navyStub.invokeCommand.calledOnce).to.equal(true)
      expect(
        navyStub.ensurePluginsLoaded.calledBefore(navyStub.invokeCommand),
      ).to.equal(true)
    })

    it('should pass through name and args to invokeCommand', async function () {
      await run('migrate', ['--up', 'db'], { navy: 'env-1' })

      expect(navyStub.invokeCommand.firstCall.args[0]).to.equal('migrate')
      expect(navyStub.invokeCommand.firstCall.args[1]).to.eql(['--up', 'db'])
    })

  })

})
