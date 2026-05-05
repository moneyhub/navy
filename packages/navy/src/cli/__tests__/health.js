/* eslint-env mocha */

// NOTE (potential source bugs in health.js, not locked in by these tests):
//   1. `getStatus` and `getHistory` both compute `service.raw && service.raw.State.Health`.
//      If `service.raw` is truthy but `service.raw.State` is undefined, this throws a
//      TypeError reading 'Health' of undefined. The guard chain is incomplete; it
//      should be `service.raw && service.raw.State && service.raw.State.Health`.
//   2. Both helpers accept a `state` parameter that is never used (dead parameter).

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import stripAnsi from 'strip-ansi'

describe('cli/health', function () {

  let sandbox
  let getNavyStub
  let navyStub
  let consoleLogStub
  let healthCli

  function makeService(overrides = {}) {
    return {
      id: 'svc-1',
      name: 'api',
      raw: undefined,
      ...overrides,
    }
  }

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    navyStub = {
      ps: sandbox.stub().resolves([]),
      getState: sandbox.stub().resolves(null),
    }
    getNavyStub = sandbox.stub().returns(navyStub)
    consoleLogStub = sandbox.stub(console, 'log')

    healthCli = proxyquire.noCallThru()('../health', {
      '../': { getNavy: getNavyStub },
    })
  })

  afterEach(function () {
    sandbox.restore()
  })

  function lastLoggedString() {
    const last = consoleLogStub.lastCall
    return last ? String(last.args[0]) : ''
  }

  describe('default export', function () {

    it('should resolve the navy instance using opts.navy', async function () {
      await healthCli({ navy: 'env-1' })

      expect(getNavyStub.calledOnce).to.equal(true)
      expect(getNavyStub.firstCall.args[0]).to.equal('env-1')
    })

    it('should print the table headers even when there are no services', async function () {
      navyStub.ps.resolves([])

      await healthCli({ navy: 'env-1' })

      expect(consoleLogStub.calledOnce).to.equal(true)
      const text = stripAnsi(consoleLogStub.firstCall.args[0])
      expect(text).to.contain('NAME')
      expect(text).to.contain('STATUS')
      expect(text).to.contain('HISTORY')
    })

    it('should call ps and getState exactly once each', async function () {
      navyStub.ps.resolves([makeService()])

      await healthCli({ navy: 'env-1' })

      expect(navyStub.ps.calledOnce).to.equal(true)
      expect(navyStub.getState.calledOnce).to.equal(true)
    })

  })

  describe('getStatus (via default export)', function () {

    it('should render - when the service has no raw container info', async function () {
      navyStub.ps.resolves([makeService({ name: 'api', raw: undefined })])

      await healthCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.contain('api')
      expect(text).to.contain('-')
    })

    it('should render - when the service has raw but no Health record', async function () {
      navyStub.ps.resolves([makeService({
        name: 'api',
        raw: { State: { Health: null } },
      })])

      await healthCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.contain('api')
      expect(text).to.contain('-')
    })

    it('should render Healthy when health status is "healthy"', async function () {
      navyStub.ps.resolves([makeService({
        raw: { State: { Health: { Status: 'healthy', Log: [] } } },
      })])

      await healthCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.contain('Healthy')
    })

    it('should render Unhealthy when health status is anything other than healthy', async function () {
      navyStub.ps.resolves([makeService({
        raw: { State: { Health: { Status: 'starting', Log: [] } } },
      })])

      await healthCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.contain('Unhealthy')
    })

  })

  describe('getHistory (via default export)', function () {

    it('should render - when the service has no raw container info', async function () {
      navyStub.ps.resolves([makeService({ name: 'api', raw: undefined })])

      await healthCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.contain('-')
    })

    it('should render - when the service has raw but no Health record', async function () {
      navyStub.ps.resolves([makeService({
        raw: { State: { Health: null } },
      })])

      await healthCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.contain('-')
    })

    it('should render only success markers when every entry has ExitCode 0', async function () {
      navyStub.ps.resolves([makeService({
        raw: {
          State: {
            Health: {
              Status: 'healthy',
              Log: [{ ExitCode: 0 }, { ExitCode: 0 }],
            },
          },
        },
      })])

      await healthCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.contain('█ █')
      expect(text).not.to.contain('x')
    })

    it('should render only failure markers when every entry has a non-zero ExitCode', async function () {
      navyStub.ps.resolves([makeService({
        raw: {
          State: {
            Health: {
              Status: 'unhealthy',
              Log: [{ ExitCode: 1 }, { ExitCode: 2 }],
            },
          },
        },
      })])

      await healthCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.contain('x x')
      expect(text).not.to.contain('█')
    })

    it('should render mixed success and failure markers based on each entry ExitCode', async function () {
      navyStub.ps.resolves([makeService({
        raw: {
          State: {
            Health: {
              Status: 'healthy',
              Log: [{ ExitCode: 0 }, { ExitCode: 1 }, { ExitCode: 0 }],
            },
          },
        },
      })])

      await healthCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.contain('█ x █')
    })

    it('should render an empty history string when Log is an empty array', async function () {
      navyStub.ps.resolves([makeService({
        raw: { State: { Health: { Status: 'healthy', Log: [] } } },
      })])

      await healthCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.contain('Healthy')
      expect(text).not.to.contain('█')
      expect(text).not.to.contain('x')
    })

  })

})
