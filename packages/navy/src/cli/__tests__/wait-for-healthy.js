/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

describe('cli/wait-for-healthy', function () {

  let sandbox
  let getNavyStub
  let navyStub
  let readlineStub
  let consoleLogStub
  let originalIsTTY
  let waitForHealthyCli
  let clock

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    navyStub = {
      name: 'env-1',
      waitForHealthy: sandbox.stub().resolves(),
    }
    getNavyStub = sandbox.stub().returns(navyStub)

    readlineStub = {
      clearLine: sandbox.stub(),
      cursorTo: sandbox.stub(),
      moveCursor: sandbox.stub(),
    }

    consoleLogStub = sandbox.stub(console, 'log')

    originalIsTTY = process.stdout.isTTY

    waitForHealthyCli = proxyquire.noCallThru()('../wait-for-healthy', {
      '../': { getNavy: getNavyStub },
      readline: readlineStub,
    })
  })

  afterEach(function () {
    process.stdout.isTTY = originalIsTTY
    if (clock) {
      clock.restore()
      clock = null
    }
    sandbox.restore()
  })

  describe('default export', function () {

    describe('non-TTY mode', function () {

      beforeEach(function () {
        process.stdout.isTTY = false
      })

      it('should call waitForHealthy with undefined when services are empty', async function () {
        await waitForHealthyCli([], { navy: 'env-1' })

        expect(navyStub.waitForHealthy.calledOnce).to.equal(true)
        expect(navyStub.waitForHealthy.firstCall.args[0]).to.equal(undefined)
      })

      it('should call waitForHealthy with the supplied services', async function () {
        await waitForHealthyCli(['web', 'api'], { navy: 'env-1' })

        expect(navyStub.waitForHealthy.firstCall.args[0]).to.eql(['web', 'api'])
      })

      it('should log "Now available" after the wait completes', async function () {
        await waitForHealthyCli([], { navy: 'env-1' })

        expect(consoleLogStub.calledWith('Now available')).to.equal(true)
      })

    })

    describe('TTY mode', function () {

      beforeEach(function () {
        process.stdout.isTTY = true
        clock = sinon.useFakeTimers()
      })

      it('should call waitForHealthy with a callback for service health updates', async function () {
        const promise = waitForHealthyCli([], { navy: 'env-1' })

        await promise

        expect(navyStub.waitForHealthy.calledOnce).to.equal(true)
        expect(navyStub.waitForHealthy.firstCall.args[1]).to.be.a('function')
      })

      it('should print "Waiting" while no health status is reported', async function () {
        await waitForHealthyCli([], { navy: 'env-1' })

        const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join('\n')
        expect(printed).to.contain('Waiting')
      })

      it('should render a checkmark for healthy services and spinner for unhealthy', async function () {
        navyStub.waitForHealthy.callsFake(async (services, cb) => {
          cb([
            { service: 'web', health: 'healthy' },
            { service: 'api', health: 'starting' },
          ])
        })

        await waitForHealthyCli([], { navy: 'env-1' })

        const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join('\n')
        expect(printed).to.contain('web')
        expect(printed).to.contain('api')
      })

      it('should advance the spinner frame and redraw on the timer interval', async function () {
        navyStub.waitForHealthy.callsFake(() => new Promise(() => {}))

        const promise = waitForHealthyCli([], { navy: 'env-1' })

        clock.tick(1000)

        expect(readlineStub.clearLine.called).to.equal(true)

        promise.catch(() => {})
      })

      it('should wrap spinner index back to zero when reaching the end of frames', async function () {
        navyStub.waitForHealthy.callsFake(() => new Promise(() => {}))

        waitForHealthyCli([], { navy: 'env-1' }).catch(() => {})

        clock.tick(10000)

        expect(readlineStub.clearLine.called).to.equal(true)
      })

      it('should pass services through to waitForHealthy', async function () {
        await waitForHealthyCli(['web'], { navy: 'env-1' })

        expect(navyStub.waitForHealthy.firstCall.args[0]).to.eql(['web'])
      })

    })

  })

})
