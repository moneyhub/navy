/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

describe('cli/doctor/index', function () {

  let sandbox
  let cleanComposeStub
  let invalidStateStub
  let invalidComposeConfigStub
  let consoleLogStub
  let doctorCli

  function loadModule() {
    doctorCli = proxyquire.noCallThru()('../index', {
      './clean-compose-files': cleanComposeStub,
      './invalid-state': invalidStateStub,
      './invalid-compose-config': invalidComposeConfigStub,
    })
  }

  beforeEach(function () {
    sandbox = sinon.createSandbox()
    cleanComposeStub = sandbox.stub().resolves()
    invalidStateStub = sandbox.stub().resolves()
    invalidComposeConfigStub = sandbox.stub().resolves()
    consoleLogStub = sandbox.stub(console, 'log')

    loadModule()
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('default export', function () {

    it('should run all checks in order', async function () {
      await doctorCli()

      expect(cleanComposeStub.calledOnce).to.equal(true)
      expect(invalidStateStub.calledOnce).to.equal(true)
      expect(invalidComposeConfigStub.calledOnce).to.equal(true)
      expect(cleanComposeStub.calledBefore(invalidStateStub)).to.equal(true)
      expect(invalidStateStub.calledBefore(invalidComposeConfigStub)).to.equal(true)
    })

    it('should print a success message when all checks pass', async function () {
      await doctorCli()

      const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join('\n')
      expect(printed).to.contain('Finished tests')
    })

    it('should print error stacks and a warning when checks fail', async function () {
      const error1 = new Error('boom1')
      const error2 = new Error('boom2')
      cleanComposeStub.rejects(error1)
      invalidStateStub.rejects(error2)

      await doctorCli()

      const printedArgs = consoleLogStub.getCalls().map(c => c.args[0] || '')
      const all = printedArgs.join('\n')
      expect(all).to.contain('There were some issues')
      expect(printedArgs.some(arg => typeof arg === 'string' && arg.includes(error1.stack))).to.equal(true)
      expect(printedArgs.some(arg => typeof arg === 'string' && arg.includes(error2.stack))).to.equal(true)
    })

    it('should run all checks even when an early one throws', async function () {
      cleanComposeStub.rejects(new Error('boom'))

      await doctorCli()

      expect(invalidStateStub.calledOnce).to.equal(true)
      expect(invalidComposeConfigStub.calledOnce).to.equal(true)
    })

  })

})
