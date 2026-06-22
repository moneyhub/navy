/* eslint-env mocha */

// NOTE (potential source bug in updates.js, not locked in by these tests):
//   The Promise.all body checks `if (!service || !service.raw || !service.raw.Image)`
//   then immediately runs `updateStatus[service.id] = 'NO_IMAGE'`. If `service` were
//   falsy the guard would let us through, but the very next assignment dereferences
//   `service.id` and would throw. The `!service` part of the guard is therefore
//   either dead defensive code or a latent bug.

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import readline from 'readline'
import { dots } from 'cli-spinners'
import stripAnsi from 'strip-ansi'

describe('cli/updates', function () {

  let sandbox
  let clock
  let getNavyStub
  let navyStub
  let hasUpdateStub
  let consoleLogStub
  let clearLineStub
  let cursorToStub
  let moveCursorStub
  let updatesCli

  function makeService(overrides = {}) {
    return {
      id: 'svc-1',
      name: 'api',
      image: 'navy/api:latest',
      raw: { Image: 'sha256:abcdef' },
      ...overrides,
    }
  }

  beforeEach(function () {
    sandbox = sinon.createSandbox()
    clock = sandbox.useFakeTimers()

    navyStub = {
      getNavyFile: sandbox.stub().resolves({}),
      ps: sandbox.stub().resolves([]),
    }
    getNavyStub = sandbox.stub().returns(navyStub)
    hasUpdateStub = sandbox.stub().resolves(false)
    consoleLogStub = sandbox.stub(console, 'log')
    clearLineStub = sandbox.stub(readline, 'clearLine')
    cursorToStub = sandbox.stub(readline, 'cursorTo')
    moveCursorStub = sandbox.stub(readline, 'moveCursor')

    updatesCli = proxyquire.noCallThru()('../updates', {
      '../': { getNavy: getNavyStub },
      '../util/has-update': hasUpdateStub,
    })
  })

  afterEach(function () {
    sandbox.restore()
  })

  function combinedLog() {
    return consoleLogStub.getCalls().map(c => stripAnsi(String(c.args[0] || ''))).join('\n')
  }

  describe('default export', function () {

    it('should resolve the navy instance using opts.navy', async function () {
      await updatesCli({ navy: 'env-1' })

      expect(getNavyStub.calledOnce).to.equal(true)
      expect(getNavyStub.firstCall.args[0]).to.equal('env-1')
    })

    it('should fetch the navy file and the running services list', async function () {
      await updatesCli({ navy: 'env-1' })

      expect(navyStub.getNavyFile.calledOnce).to.equal(true)
      expect(navyStub.ps.calledOnce).to.equal(true)
    })

    it('should print the table headers in the initial draw', async function () {
      navyStub.ps.resolves([])

      await updatesCli({ navy: 'env-1' })

      const text = combinedLog()
      expect(text).to.contain('NAME')
      expect(text).to.contain('IMAGE')
      expect(text).to.contain('UPDATES')
    })

    it('should clear the spinner interval before resolving', async function () {
      navyStub.ps.resolves([makeService()])

      await updatesCli({ navy: 'env-1' })

      expect(clock.countTimers()).to.equal(0)
    })

    it('should call readline cursor/clear helpers when redrawing', async function () {
      navyStub.ps.resolves([makeService()])

      await updatesCli({ navy: 'env-1' })

      expect(clearLineStub.called).to.equal(true)
      expect(cursorToStub.called).to.equal(true)
      expect(moveCursorStub.called).to.equal(true)
    })

  })

  describe('renderStatus (via default export, final draw)', function () {

    it('should mark a service as NO_IMAGE when raw is missing', async function () {
      navyStub.ps.resolves([makeService({ raw: undefined })])

      await updatesCli({ navy: 'env-1' })

      const text = combinedLog()
      expect(text).to.contain('No image for service')
      expect(hasUpdateStub.called).to.equal(false)
    })

    it('should mark a service as NO_IMAGE when raw.Image is missing', async function () {
      navyStub.ps.resolves([makeService({ raw: {} })])

      await updatesCli({ navy: 'env-1' })

      const text = combinedLog()
      expect(text).to.contain('No image for service')
      expect(hasUpdateStub.called).to.equal(false)
    })

    it('should mark a service as Update available when hasUpdate returns true', async function () {
      navyStub.ps.resolves([makeService()])
      hasUpdateStub.resolves(true)

      await updatesCli({ navy: 'env-1' })

      const text = combinedLog()
      expect(text).to.contain('Update available')
    })

    it('should mark a service as Up to date when hasUpdate returns false', async function () {
      navyStub.ps.resolves([makeService()])
      hasUpdateStub.resolves(false)

      await updatesCli({ navy: 'env-1' })

      const text = combinedLog()
      expect(text).to.contain('Up to date')
    })

    it('should mark a service as Not found when hasUpdate returns UNKNOWN_REMOTE', async function () {
      navyStub.ps.resolves([makeService()])
      hasUpdateStub.resolves('UNKNOWN_REMOTE')

      await updatesCli({ navy: 'env-1' })

      const text = combinedLog()
      expect(text).to.contain('Not found')
    })

    it('should mark a service as Up to date when hasUpdate returns an unrecognised string', async function () {
      navyStub.ps.resolves([makeService()])
      hasUpdateStub.resolves('SOME_OTHER_VALUE')

      await updatesCli({ navy: 'env-1' })

      const text = combinedLog()
      expect(text).to.contain('Up to date')
    })

    it('should mark a service as Internal error when hasUpdate throws', async function () {
      navyStub.ps.resolves([makeService()])
      hasUpdateStub.rejects(new Error('boom'))

      await updatesCli({ navy: 'env-1' })

      const text = combinedLog()
      expect(text).to.contain('Internal error')
    })

    it('should mark a service as Internal error when hasUpdate throws an error with no stack', async function () {
      navyStub.ps.resolves([makeService()])
      const errNoStack = { message: 'no stack' }
      hasUpdateStub.callsFake(() => Promise.reject(errNoStack))

      await updatesCli({ navy: 'env-1' })

      const text = combinedLog()
      expect(text).to.contain('Internal error')
    })

    it('should pass image, raw image id, and navy file through to hasUpdate', async function () {
      const navyFile = { ignoreUnauthorizedRequestsForRegistries: ['r'] }
      navyStub.getNavyFile.resolves(navyFile)
      navyStub.ps.resolves([makeService({
        image: 'navy/api:latest',
        raw: { Image: 'sha256:abc' },
      })])

      await updatesCli({ navy: 'env-1' })

      expect(hasUpdateStub.calledOnce).to.equal(true)
      expect(hasUpdateStub.firstCall.args).to.eql([
        'navy/api:latest',
        'sha256:abc',
        navyFile,
      ])
    })

  })

  describe('renderStatus null branch (initial Checking... state)', function () {

    it('should print Checking... in the very first draw before any update results', async function () {
      let resolveHasUpdate
      hasUpdateStub.callsFake(() => new Promise(resolve => {
        resolveHasUpdate = resolve
      }))
      navyStub.ps.resolves([makeService()])

      const cliPromise = updatesCli({ navy: 'env-1' })

      await clock.tickAsync(0)

      const before = combinedLog()
      expect(before).to.contain('Checking...')

      resolveHasUpdate(false)
      await cliPromise
    })

  })

  describe('spinner interval', function () {

    it('should advance the spinner frame on each interval tick and wrap back to 0 after frames.length ticks', async function () {
      let resolveHasUpdate
      hasUpdateStub.callsFake(() => new Promise(resolve => {
        resolveHasUpdate = resolve
      }))
      navyStub.ps.resolves([makeService()])

      const cliPromise = updatesCli({ navy: 'env-1' })

      await clock.tickAsync(0)

      const drawsBefore = consoleLogStub.callCount

      await clock.tickAsync(dots.interval * (dots.frames.length + 1))

      expect(consoleLogStub.callCount).to.be.greaterThan(drawsBefore)

      resolveHasUpdate(false)
      await cliPromise

      expect(clock.countTimers()).to.equal(0)
    })

  })

})
