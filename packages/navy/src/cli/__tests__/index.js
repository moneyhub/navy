/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import { NavyError } from '../../errors'

describe('cli/index', function () {

  let sandbox
  let programStub
  let helpCmdStub
  let parseCalls
  let actionHandlerForHelp
  let originalArgv

  function loadModule({ args = ['placeholder'], parseImpl } = {}) {
    actionHandlerForHelp = null
    parseCalls = []

    helpCmdStub = {
      alias: sandbox.stub().returnsThis(),
      action: sandbox.stub().callsFake(handler => {
        actionHandlerForHelp = handler
        return helpCmdStub
      }),
    }

    programStub = {
      args,
      version: sandbox.stub().returnsThis(),
      command: sandbox.stub().returns(helpCmdStub),
      help: sandbox.stub(),
      parse: sandbox.stub().callsFake(argv => {
        parseCalls.push(argv)
        if (parseImpl) parseImpl()
      }),
    }

    return proxyquire.noCallThru()('../index', {
      '../../package.json': { version: '1.2.3' },
      './program': programStub,
      '../errors': { NavyError },
    })
  }

  beforeEach(function () {
    sandbox = sinon.createSandbox()
    sandbox.stub(console, 'log')
    sandbox.stub(console, 'error')
    originalArgv = process.argv
  })

  afterEach(function () {
    process.argv = originalArgv
    sandbox.restore()
  })

  describe('module side effects', function () {

    it('should set the program version from package.json', function () {
      loadModule()

      expect(programStub.version.calledOnce).to.equal(true)
      expect(programStub.version.firstCall.args[0]).to.equal('1.2.3')
    })

    it('should register a help command with * alias', function () {
      loadModule()

      expect(programStub.command.calledWith('help')).to.equal(true)
      expect(helpCmdStub.alias.calledWith('*')).to.equal(true)
    })

    it('should call program.help() when invoking the help action', function () {
      loadModule()

      actionHandlerForHelp()

      expect(programStub.help.called).to.equal(true)
    })

    it('should call program.parse with process.argv', function () {
      loadModule()

      expect(parseCalls).to.have.length(1)
      expect(parseCalls[0]).to.equal(process.argv)
    })

    it('should call program.help when no args are present', function () {
      loadModule({ args: [] })

      expect(programStub.help.calledOnce).to.equal(true)
    })

    it('should not call program.help when args are present', function () {
      loadModule({ args: ['some-cmd'] })

      expect(programStub.help.called).to.equal(false)
    })

    it('should pretty-print a NavyError when parse throws one', function () {
      const navyError = new NavyError('boom')
      const prettyPrintStub = sandbox.stub(navyError, 'prettyPrint')

      loadModule({
        parseImpl: () => { throw navyError },
      })

      expect(prettyPrintStub.calledOnce).to.equal(true)
    })

    it('should rethrow non-NavyError exceptions from parse', function () {
      const otherError = new Error('boom')

      let caught
      try {
        loadModule({
          parseImpl: () => { throw otherError },
        })
      } catch (err) {
        caught = err
      }

      expect(caught).to.equal(otherError)
    })

  })

})
