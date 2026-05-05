/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import { NavyError } from '../../../errors'

describe('cli/config/index', function () {

  let sandbox
  let getConfigStub
  let setConfigStub
  let reconfigureAllNaviesStub
  let consoleLogStub
  let consoleErrorStub
  let processOnStub
  let actions
  let program
  let mod

  function loadModule() {
    actions = {}

    function commandFactory() {
      const builder = {
        description() { return builder },
        action(handler) {
          builder._lastAction = handler
          return builder
        },
      }
      return builder
    }

    program = {
      _commands: {},
      command(spec) {
        const name = spec.split(' ')[0]
        const builder = commandFactory()
        const origAction = builder.action.bind(builder)
        builder.action = handler => {
          actions[name] = handler
          return origAction(handler)
        }
        return builder
      },
      parse: sandbox.stub(),
      help: sandbox.stub(),
      args: ['placeholder'],
    }

    mod = proxyquire.noCallThru()('../index', {
      commander: { program },
      '../../config': { getConfig: getConfigStub, setConfig: setConfigStub },
      '../../errors': { NavyError },
      '../util/reconfigure': { reconfigureAllNavies: reconfigureAllNaviesStub },
    })
  }

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    getConfigStub = sandbox.stub().resolves({})
    setConfigStub = sandbox.stub().resolves()
    reconfigureAllNaviesStub = sandbox.stub().resolves()
    consoleLogStub = sandbox.stub(console, 'log')
    consoleErrorStub = sandbox.stub(console, 'error')
    processOnStub = sandbox.stub(process, 'on')

    loadModule()
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('reconfigureIfNecessary', function () {

    it('should call reconfigureAllNavies for externalIP', async function () {
      await mod.reconfigureIfNecessary('externalIP')

      expect(reconfigureAllNaviesStub.calledOnce).to.equal(true)
    })

    it('should not call reconfigureAllNavies for unrelated config props', async function () {
      await mod.reconfigureIfNecessary('defaultNavy')

      expect(reconfigureAllNaviesStub.called).to.equal(false)
    })

  })

  describe('module side effects', function () {

    it('should register a process unhandledRejection handler', function () {
      expect(processOnStub.calledWith('unhandledRejection')).to.equal(true)
    })

    it('should call program.parse with process.argv', function () {
      expect(program.parse.calledOnce).to.equal(true)
      expect(program.parse.firstCall.args[0]).to.equal(process.argv)
    })

    it('should not call help when args are present', function () {
      expect(program.help.called).to.equal(false)
    })

    it('should call help when args are empty', function () {
      sandbox.restore()
      sandbox = sinon.createSandbox()
      getConfigStub = sandbox.stub().resolves({})
      setConfigStub = sandbox.stub().resolves()
      reconfigureAllNaviesStub = sandbox.stub().resolves()
      sandbox.stub(console, 'log')
      sandbox.stub(console, 'error')
      sandbox.stub(process, 'on')

      actions = {}
      program = {
        command(spec) {
          const name = spec.split(' ')[0]
          const builder = {
            description() { return builder },
            action(handler) {
              actions[name] = handler
              return builder
            },
          }
          return builder
        },
        parse: sandbox.stub(),
        help: sandbox.stub(),
        args: [],
      }

      proxyquire.noCallThru()('../index', {
        commander: { program },
        '../../config': { getConfig: getConfigStub, setConfig: setConfigStub },
        '../../errors': { NavyError },
        '../util/reconfigure': { reconfigureAllNavies: reconfigureAllNaviesStub },
      })

      expect(program.help.calledOnce).to.equal(true)
    })

    describe('unhandledRejection handler', function () {

      it('should call prettyPrint on a NavyError', function () {
        const handler = processOnStub.firstCall.args[1]
        const err = new NavyError('boom')
        const prettyPrintStub = sandbox.stub(err, 'prettyPrint')

        handler(err)

        expect(prettyPrintStub.calledOnce).to.equal(true)
      })

      it('should log the stack of a generic error', function () {
        const handler = processOnStub.firstCall.args[1]
        const err = new Error('boom')

        handler(err)

        expect(consoleErrorStub.calledWith(err.stack)).to.equal(true)
      })

    })

  })

  describe('set command', function () {

    it('should throw a NavyError for an unknown key', async function () {
      let caught
      try {
        await actions.set('not-a-key', 'value')
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.instanceof(NavyError)
      expect(caught.message).to.contain('Invalid config key')
      expect(setConfigStub.called).to.equal(false)
    })

    it('should map default-navy and call setConfig with merged config', async function () {
      getConfigStub.resolves({ existing: 'value' })

      await actions.set('default-navy', 'dev')

      expect(setConfigStub.calledOnce).to.equal(true)
      expect(setConfigStub.firstCall.args[0]).to.eql({ existing: 'value', defaultNavy: 'dev' })
    })

    it('should reconfigure all navies when externalIP changes', async function () {
      await actions.set('external-ip', '10.0.0.1')

      expect(reconfigureAllNaviesStub.calledOnce).to.equal(true)
    })

    it('should not reconfigure when default-navy changes', async function () {
      await actions.set('default-navy', 'dev')

      expect(reconfigureAllNaviesStub.called).to.equal(false)
    })

  })

  describe('get command', function () {

    it('should throw a NavyError for an unknown key', async function () {
      let caught
      try {
        await actions.get('not-a-key')
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.instanceof(NavyError)
    })

    it('should print the mapped config value', async function () {
      getConfigStub.resolves({ defaultNavy: 'dev' })

      await actions.get('default-navy')

      expect(consoleLogStub.calledWith('dev')).to.equal(true)
    })

  })

  describe('rm command', function () {

    it('should throw a NavyError for an unknown key', async function () {
      let caught
      try {
        await actions.rm('not-a-key')
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.instanceof(NavyError)
      expect(setConfigStub.called).to.equal(false)
    })

    it('should set the mapped property to null', async function () {
      getConfigStub.resolves({ defaultNavy: 'dev' })

      await actions.rm('default-navy')

      expect(setConfigStub.firstCall.args[0]).to.eql({ defaultNavy: null })
    })

    it('should reconfigure all navies when externalIP is removed', async function () {
      await actions.rm('external-ip')

      expect(reconfigureAllNaviesStub.calledOnce).to.equal(true)
    })

    it('should not reconfigure when default-navy is removed', async function () {
      await actions.rm('default-navy')

      expect(reconfigureAllNaviesStub.called).to.equal(false)
    })

  })

  describe('ls command', function () {

    it('should print one line per known key with values', async function () {
      getConfigStub.resolves({ defaultNavy: 'dev', externalIP: '10.0.0.1', tlsRootCaDir: null })

      await actions.ls()

      const printed = consoleLogStub.firstCall.args[0]
      expect(printed).to.contain('default-navy=dev')
      expect(printed).to.contain('external-ip=10.0.0.1')
      expect(printed).to.contain('tlsCa-dir=null')
    })

    it('should print null for missing keys', async function () {
      getConfigStub.resolves({})

      await actions.ls()

      const printed = consoleLogStub.firstCall.args[0]
      expect(printed).to.contain('default-navy=null')
    })

  })

  describe('json command', function () {

    it('should print the full config as pretty JSON', async function () {
      getConfigStub.resolves({ a: 1, b: 'two' })

      await actions.json()

      expect(consoleLogStub.calledOnce).to.equal(true)
      expect(consoleLogStub.firstCall.args[0]).to.equal(JSON.stringify({ a: 1, b: 'two' }, null, 2))
    })

  })

})
