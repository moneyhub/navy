/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import { NavyError } from '../../errors'

describe('cli/live', function () {

  let sandbox
  let getNavyStub
  let navyStub
  let getNavyRcStub
  let consoleLogStub
  let originalCwd
  let liveCli

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    navyStub = {
      name: 'env-1',
      getState: sandbox.stub().resolves({
        services: {
          web: { _develop: { mounts: {}, command: 'x' } },
        },
      }),
      saveState: sandbox.stub().resolves(),
      kill: sandbox.stub().resolves(),
      relaunch: sandbox.stub().resolves(),
    }
    getNavyStub = sandbox.stub().returns(navyStub)
    getNavyRcStub = sandbox.stub().resolves(null)

    consoleLogStub = sandbox.stub(console, 'log')

    originalCwd = process.cwd
    sandbox.stub(process, 'cwd').returns('/work')

    liveCli = proxyquire.noCallThru()('../live', {
      '../': { getNavy: getNavyStub },
      '../errors': { NavyError },
      '../util/navyrc': getNavyRcStub,
    })
  })

  afterEach(function () {
    process.cwd = originalCwd
    sandbox.restore()
  })

  describe('default export', function () {

    it('should throw NavyError when navyrc exists but services is missing', async function () {
      getNavyRcStub.resolves({ services: undefined })

      let caught
      try {
        await liveCli('web', { navy: 'env-1' })
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.instanceof(NavyError)
      expect(caught.message).to.contain('No valid .navyrc')
    })

    it('should throw when navyrc lists multiple services and none specified', async function () {
      getNavyRcStub.resolves({ services: ['web', 'api'] })

      let caught
      try {
        await liveCli(undefined, { navy: 'env-1' })
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.instanceof(NavyError)
      expect(caught.message).to.contain('Multiple service mappings')
    })

    it('should infer the only service from a single-service navyrc', async function () {
      getNavyRcStub.resolves({ services: ['only-svc'] })
      navyStub.getState.resolves({
        services: { 'only-svc': { _develop: { mounts: {} } } },
      })

      await liveCli(undefined, { navy: 'env-1' })

      expect(navyStub.kill.calledWith(['only-svc'])).to.equal(true)
    })

    it('should log a "nothing to do" message when service is not in develop mode', async function () {
      navyStub.getState.resolves({ services: { web: {} } })

      await liveCli('web', { navy: 'env-1' })

      const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join('\n')
      expect(printed).to.contain('Nothing to do')
      expect(navyStub.kill.called).to.equal(false)
      expect(navyStub.relaunch.called).to.equal(false)
    })

    it('should log "nothing to do" when state has no services key', async function () {
      navyStub.getState.resolves({})

      await liveCli('web', { navy: 'env-1' })

      const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join('\n')
      expect(printed).to.contain('Nothing to do')
    })

    it('should log "nothing to do" when state is null', async function () {
      navyStub.getState.resolves(null)

      await liveCli('web', { navy: 'env-1' })

      const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join('\n')
      expect(printed).to.contain('Nothing to do')
    })

    it('should clear _develop, kill, and relaunch when service is in develop mode', async function () {
      await liveCli('web', { navy: 'env-1' })

      expect(navyStub.saveState.calledOnce).to.equal(true)
      const newState = navyStub.saveState.firstCall.args[0]
      expect(newState.services.web._develop).to.equal(undefined)

      expect(navyStub.kill.calledWith(['web'])).to.equal(true)
      expect(navyStub.relaunch.calledOnce).to.equal(true)
      expect(navyStub.relaunch.firstCall.args[0]).to.eql({ noDeps: true })
    })

    it('should log a confirmation message after switching out of dev mode', async function () {
      await liveCli('web', { navy: 'env-1' })

      const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join('\n')
      expect(printed).to.contain('no longer in development')
    })

  })

})
