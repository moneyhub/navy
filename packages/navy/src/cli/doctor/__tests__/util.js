/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'

import { fix, start, catchInvariant } from '../util'

describe('cli/doctor/util', function () {

  let sandbox
  let consoleLogStub

  beforeEach(function () {
    sandbox = sinon.createSandbox()
    consoleLogStub = sandbox.stub(console, 'log')
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('fix', function () {

    it('should throw an invariant violation when no callback is provided', async function () {
      let caught
      try {
        await fix('a message')
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.an('error')
      expect(caught.message).to.contain('DOCTOR_FIX_NO_PARAMS')
    })

    it('should print the formatted message and call the callback', async function () {
      const callback = sandbox.stub().resolves()

      await fix('Found %s, removing', 'env-1', callback)

      expect(consoleLogStub.calledOnce).to.equal(true)
      const printed = consoleLogStub.firstCall.args[0]
      expect(printed).to.contain('Found env-1, removing')
      expect(callback.calledOnce).to.equal(true)
    })

    it('should await the callback before resolving', async function () {
      let resolved = false
      const callback = sandbox.stub().callsFake(() => new Promise(resolve => {
        setImmediate(() => {
          resolved = true
          resolve()
        })
      }))

      await fix('msg', callback)

      expect(resolved).to.equal(true)
    })

  })

  describe('start', function () {

    it('should log a dimmed message with arrow prefix', function () {
      start('Doing thing')

      expect(consoleLogStub.calledOnce).to.equal(true)
      const printed = consoleLogStub.getCalls().map(c => c.args.join(' ')).join(' ')
      expect(printed).to.contain('----->')
      expect(printed).to.contain('Doing thing')
    })

  })

  describe('catchInvariant', function () {

    it('should call the catch callback when fn throws an Invariant Violation matching the code', async function () {
      const catchCallback = sandbox.stub().resolves()
      const err = new Error('MY_CODE: failure happened')
      err.name = 'Invariant Violation'

      await catchInvariant('MY_CODE', async () => { throw err }, catchCallback)

      expect(catchCallback.calledOnce).to.equal(true)
    })

    it('should not call the catch callback when fn throws a non-invariant error', async function () {
      const catchCallback = sandbox.stub().resolves()

      await catchInvariant('MY_CODE', async () => { throw new Error('some other error') }, catchCallback)

      expect(catchCallback.called).to.equal(false)
    })

    it('should not call the catch callback when invariant code does not match', async function () {
      const catchCallback = sandbox.stub().resolves()
      const err = new Error('OTHER_CODE: failure')
      err.name = 'Invariant Violation'

      await catchInvariant('MY_CODE', async () => { throw err }, catchCallback)

      expect(catchCallback.called).to.equal(false)
    })

    it('should not call the catch callback when fn resolves without throwing', async function () {
      const catchCallback = sandbox.stub().resolves()

      await catchInvariant('MY_CODE', async () => undefined, catchCallback)

      expect(catchCallback.called).to.equal(false)
    })

  })

})
