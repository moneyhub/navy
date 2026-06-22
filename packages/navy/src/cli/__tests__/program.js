/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import { NavyError } from '../../errors'

describe('cli/program', function () {

  let sandbox
  let fakeProgram
  let actionsByCommand
  let getConfigStub
  let startDriverLoggingStub
  let stopDriverLoggingStub
  let getImportCommandLineOptionsStub
  let getNavyStub
  let navyStub
  let consoleLogStub
  let consoleErrorStub
  let processExitStub
  let processOnStub
  let originalEnvName

  let helpHandlersByCommand

  function loadModule() {
    actionsByCommand = {}
    helpHandlersByCommand = {}

    fakeProgram = {
      option: sandbox.stub().returnsThis(),
      enablePositionalOptions: sandbox.stub().returnsThis(),
      command(spec) {
        const name = spec.split(' ')[0]
        const cmd = {
          option: sandbox.stub().returnsThis(),
          description: sandbox.stub().returnsThis(),
          action(handler) {
            actionsByCommand[name] = handler
            return cmd
          },
          on(event, handler) {
            if (event === '--help') {
              helpHandlersByCommand[name] = handler
            }
            return cmd
          },
        }
        return cmd
      },
    }

    return proxyquire.noCallThru()('../program', {
      commander: { program: fakeProgram },
      '../errors': { NavyError },
      '../config': { getConfig: getConfigStub },
      '../driver-logging': {
        startDriverLogging: startDriverLoggingStub,
        stopDriverLogging: stopDriverLoggingStub,
      },
      '../config-provider': { getImportCommandLineOptions: getImportCommandLineOptionsStub },
      '../navy': { getNavy: getNavyStub },
      './import': () => Promise.resolve('imported'),
      './launch': () => Promise.resolve('launched'),
      './ps': () => Promise.resolve(undefined),
      './updates': () => Promise.resolve(undefined),
      './logs': () => Promise.resolve(undefined),
      './health': () => Promise.resolve(undefined),
      './wait-for-healthy': () => Promise.resolve(undefined),
      './https': () => Promise.resolve(undefined),
      './open': () => Promise.resolve(undefined),
      './develop': () => Promise.resolve(undefined),
      './live': () => Promise.resolve(undefined),
      './run': () => Promise.resolve(undefined),
      './refresh-config': () => Promise.resolve(undefined),
      './status': () => Promise.resolve(undefined),
      './doctor': () => Promise.resolve(undefined),
      './config/wrapper': () => Promise.resolve(undefined),
      './external-ip': () => Promise.resolve(undefined),
      './lan-ip': () => Promise.resolve(undefined),
      './local-ip': () => Promise.resolve(undefined),
    })
  }

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    getConfigStub = sandbox.stub().returns({ defaultNavy: 'dev' })
    startDriverLoggingStub = sandbox.stub()
    stopDriverLoggingStub = sandbox.stub()
    getImportCommandLineOptionsStub = sandbox.stub().returns([
      ['-c, --config-provider [provider]', 'Config provider to use'],
    ])

    navyStub = {
      ensurePluginsLoaded: sandbox.stub().resolves(),
      emitAsync: sandbox.stub().resolves(),
      destroy: sandbox.stub().resolves(),
      kill: sandbox.stub().resolves(),
      start: sandbox.stub().resolves(),
      stop: sandbox.stub().resolves(),
      url: sandbox.stub().resolves('http://web'),
      getAvailableServiceNames: sandbox.stub().resolves(['web', 'api']),
    }
    getNavyStub = sandbox.stub().returns(navyStub)

    consoleLogStub = sandbox.stub(console, 'log')
    consoleErrorStub = sandbox.stub(console, 'error')
    processExitStub = sandbox.stub(process, 'exit')
    processOnStub = sandbox.stub(process, 'on')

    originalEnvName = process.env.NAVY_NAME
  })

  afterEach(function () {
    if (originalEnvName === undefined) {
      delete process.env.NAVY_NAME
    } else {
      process.env.NAVY_NAME = originalEnvName
    }
    sandbox.restore()
  })

  describe('module side effects', function () {

    it('should register all known commands on the program', function () {
      loadModule()

      expect(actionsByCommand).to.have.keys(
        'import', 'launch', 'destroy', 'delete', 'ps', 'start', 'stop',
        'restart', 'kill', 'rm', 'update', 'updates', 'logs', 'health',
        'wait-for-healthy', 'use-tag', 'reset-tag', 'https', 'use-port',
        'reset-port', 'url', 'open', 'port', 'available-services', 'develop',
        'live', 'run', 'refresh-config', 'status', 'doctor', 'config',
        'external-ip', 'use-lan-ip', 'use-local-ip',
      )
    })

    it('should derive the default navy from NAVY_NAME env when set', function () {
      process.env.NAVY_NAME = 'foo-env'
      loadModule()

      expect(actionsByCommand.import).to.be.a('function')
    })

    it('should fall back to getConfig().defaultNavy when env is not set', function () {
      delete process.env.NAVY_NAME
      loadModule()

      expect(getConfigStub.called).to.equal(true)
    })

    it('should add import command-line options from getImportCommandLineOptions', function () {
      loadModule()

      expect(getImportCommandLineOptionsStub.calledOnce).to.equal(true)
    })

    it('should export the program as default', function () {
      const mod = loadModule()
      expect(mod).to.equal(fakeProgram)
    })

    it('should print examples when each command --help handler is invoked', function () {
      loadModule()

      Object.keys(helpHandlersByCommand).forEach(name => {
        helpHandlersByCommand[name]()
      })

      expect(consoleLogStub.called).to.equal(true)
    })

    it('should register a global -e, --navy option on the root program', function () {
      loadModule()

      expect(fakeProgram.option.calledWith(
        '-e, --navy [env]',
        sinon.match.string,
        'dev',
      )).to.equal(true)
    })

    it('should enable positional options so unknown subcommand options are rejected', function () {
      loadModule()

      expect(fakeProgram.enablePositionalOptions.calledOnce).to.equal(true)
    })

  })

  describe('lazyRequire wrapped action', function () {

    it('should pass through arguments to the underlying module', async function () {
      loadModule()

      const result = actionsByCommand.import({ navy: 'env-1' })
      return expect(result).to.exist
    })

    it('should call stopDriverLogging and prettyPrint when the action throws a NavyError', async function () {
      const err = new NavyError('boom')
      const prettyPrintStub = sandbox.stub(err, 'prettyPrint')

      proxyquire.noCallThru()('../program', {
        commander: { program: createCapturingProgram() },
        '../errors': { NavyError },
        '../config': { getConfig: getConfigStub },
        '../driver-logging': {
          startDriverLogging: startDriverLoggingStub,
          stopDriverLogging: stopDriverLoggingStub,
        },
        '../config-provider': { getImportCommandLineOptions: getImportCommandLineOptionsStub },
        '../navy': { getNavy: getNavyStub },
        './import': () => Promise.reject(err),
        './launch': () => Promise.resolve(),
        './ps': () => Promise.resolve(),
        './updates': () => Promise.resolve(),
        './logs': () => Promise.resolve(),
        './health': () => Promise.resolve(),
        './wait-for-healthy': () => Promise.resolve(),
        './https': () => Promise.resolve(),
        './open': () => Promise.resolve(),
        './develop': () => Promise.resolve(),
        './live': () => Promise.resolve(),
        './run': () => Promise.resolve(),
        './refresh-config': () => Promise.resolve(),
        './status': () => Promise.resolve(),
        './doctor': () => Promise.resolve(),
        './config/wrapper': () => Promise.resolve(),
        './external-ip': () => Promise.resolve(),
        './lan-ip': () => Promise.resolve(),
        './local-ip': () => Promise.resolve(),
      })

      capturedActions.import({ navy: 'env-1' })
      await new Promise(resolve => setImmediate(resolve))

      expect(prettyPrintStub.calledOnce).to.equal(true)
      expect(processExitStub.calledWith(1)).to.equal(true)
      expect(stopDriverLoggingStub.calledWith({ success: false })).to.equal(true)
    })

    it('should pretty-print invariant violations with troubleshooting hint', async function () {
      const err = new Error('CODE: something went wrong')
      err.name = 'Invariant Violation'

      proxyquire.noCallThru()('../program', {
        commander: { program: createCapturingProgram() },
        '../errors': { NavyError },
        '../config': { getConfig: getConfigStub },
        '../driver-logging': {
          startDriverLogging: startDriverLoggingStub,
          stopDriverLogging: stopDriverLoggingStub,
        },
        '../config-provider': { getImportCommandLineOptions: getImportCommandLineOptionsStub },
        '../navy': { getNavy: getNavyStub },
        './import': () => Promise.reject(err),
        './launch': () => Promise.resolve(),
        './ps': () => Promise.resolve(),
        './updates': () => Promise.resolve(),
        './logs': () => Promise.resolve(),
        './health': () => Promise.resolve(),
        './wait-for-healthy': () => Promise.resolve(),
        './https': () => Promise.resolve(),
        './open': () => Promise.resolve(),
        './develop': () => Promise.resolve(),
        './live': () => Promise.resolve(),
        './run': () => Promise.resolve(),
        './refresh-config': () => Promise.resolve(),
        './status': () => Promise.resolve(),
        './doctor': () => Promise.resolve(),
        './config/wrapper': () => Promise.resolve(),
        './external-ip': () => Promise.resolve(),
        './lan-ip': () => Promise.resolve(),
        './local-ip': () => Promise.resolve(),
      })

      capturedActions.import({ navy: 'env-1' })
      await new Promise(resolve => setImmediate(resolve))

      const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join('\n')
      expect(printed).to.contain('Invariant Violation')
      expect(printed).to.contain('navy doctor')
      expect(processExitStub.calledWith(1)).to.equal(true)
    })

    it('should print stack for non-NavyError, non-Invariant errors', async function () {
      const err = new Error('something broke')

      proxyquire.noCallThru()('../program', {
        commander: { program: createCapturingProgram() },
        '../errors': { NavyError },
        '../config': { getConfig: getConfigStub },
        '../driver-logging': {
          startDriverLogging: startDriverLoggingStub,
          stopDriverLogging: stopDriverLoggingStub,
        },
        '../config-provider': { getImportCommandLineOptions: getImportCommandLineOptionsStub },
        '../navy': { getNavy: getNavyStub },
        './import': () => Promise.reject(err),
        './launch': () => Promise.resolve(),
        './ps': () => Promise.resolve(),
        './updates': () => Promise.resolve(),
        './logs': () => Promise.resolve(),
        './health': () => Promise.resolve(),
        './wait-for-healthy': () => Promise.resolve(),
        './https': () => Promise.resolve(),
        './open': () => Promise.resolve(),
        './develop': () => Promise.resolve(),
        './live': () => Promise.resolve(),
        './run': () => Promise.resolve(),
        './refresh-config': () => Promise.resolve(),
        './status': () => Promise.resolve(),
        './doctor': () => Promise.resolve(),
        './config/wrapper': () => Promise.resolve(),
        './external-ip': () => Promise.resolve(),
        './lan-ip': () => Promise.resolve(),
        './local-ip': () => Promise.resolve(),
      })

      capturedActions.import({ navy: 'env-1' })
      await new Promise(resolve => setImmediate(resolve))

      expect(consoleErrorStub.calledWith(err.stack)).to.equal(true)
    })

    // NOTE: The internal wrapper in program.js does `if (res.catch)` without
    // null-checking, so passing a non-promise return value would throw. All
    // production action handlers return promises, so this code path is not
    // exercised in practice. We do not test it because asserting that
    // behaviour would lock in a latent bug.

  })

  describe('normaliseLazyRequireArgs (via lazyRequire wrapped action)', function () {

    let importSpy

    function loadWithImportSpy() {
      importSpy = sandbox.stub().resolves('imported')
      return proxyquire.noCallThru()('../program', {
        commander: { program: createCapturingProgram() },
        '../errors': { NavyError },
        '../config': { getConfig: getConfigStub },
        '../driver-logging': {
          startDriverLogging: startDriverLoggingStub,
          stopDriverLogging: stopDriverLoggingStub,
        },
        '../config-provider': { getImportCommandLineOptions: getImportCommandLineOptionsStub },
        '../navy': { getNavy: getNavyStub },
        './import': importSpy,
        './launch': () => Promise.resolve(),
        './ps': () => Promise.resolve(),
        './updates': () => Promise.resolve(),
        './logs': () => Promise.resolve(),
        './health': () => Promise.resolve(),
        './wait-for-healthy': () => Promise.resolve(),
        './https': () => Promise.resolve(),
        './open': () => Promise.resolve(),
        './develop': () => Promise.resolve(),
        './live': () => Promise.resolve(),
        './run': () => Promise.resolve(),
        './refresh-config': () => Promise.resolve(),
        './status': () => Promise.resolve(),
        './doctor': () => Promise.resolve(),
        './config/wrapper': () => Promise.resolve(),
        './external-ip': () => Promise.resolve(),
        './lan-ip': () => Promise.resolve(),
        './local-ip': () => Promise.resolve(),
      })
    }

    it('should pass through unchanged when invoked with no arguments at all', async function () {
      loadWithImportSpy()

      capturedActions.import()
      await new Promise(resolve => setImmediate(resolve))

      expect(importSpy.calledOnce).to.equal(true)
      expect(importSpy.firstCall.args).to.eql([])
    })

    it('should strip the trailing Command instance when no other args were supplied', async function () {
      loadWithImportSpy()
      const fakeCommand = { optsWithGlobals: () => ({ navy: 'global' }) }

      capturedActions.import(fakeCommand)
      await new Promise(resolve => setImmediate(resolve))

      expect(importSpy.calledOnce).to.equal(true)
      expect(importSpy.firstCall.args).to.eql([])
    })

    it('should merge inherited globals into the trailing options object before forwarding', async function () {
      loadWithImportSpy()
      const fakeCommand = {
        optsWithGlobals: () => ({ navy: 'from-global', extra: 1 }),
        getOptionValueSource: () => 'default',
      }

      capturedActions.import({ navy: 'subcommand-default' }, fakeCommand)
      await new Promise(resolve => setImmediate(resolve))

      expect(importSpy.calledOnce).to.equal(true)
      expect(importSpy.firstCall.args).to.have.lengthOf(1)
      expect(importSpy.firstCall.args[0]).to.eql({ navy: 'from-global', extra: 1 })
    })

    it('should leave non-object trailing arguments untouched when stripping the command', async function () {
      loadWithImportSpy()
      const fakeCommand = { optsWithGlobals: () => ({ navy: 'global' }) }

      capturedActions.import(['web', 'api'], fakeCommand)
      await new Promise(resolve => setImmediate(resolve))

      expect(importSpy.calledOnce).to.equal(true)
      expect(importSpy.firstCall.args).to.eql([['web', 'api']])
    })

  })

  describe('basicCliWrapper action', function () {

    beforeEach(function () {
      loadModule()
    })

    it('should call the named navy method with the supplied service list', async function () {
      navyStub.start = sandbox.stub().resolves()

      await actionsByCommand.start(['web', 'api'], { navy: 'env-1' }, {})

      expect(navyStub.start.calledOnce).to.equal(true)
      expect(navyStub.start.firstCall.args[0]).to.eql(['web', 'api'])
      expect(navyStub.ensurePluginsLoaded.calledOnce).to.equal(true)
    })

    it('should merge optsWithGlobals so global navy is used when Commander passes the command', async function () {
      navyStub.start = sandbox.stub().resolves()
      const fakeCommand = { optsWithGlobals: () => ({ navy: 'from-global' }) }

      await actionsByCommand.start(['web'], { navy: 'subcommand-default' }, fakeCommand)

      expect(getNavyStub.firstCall.args[0]).to.equal('from-global')
    })

    it('should fall back to maybeServices as opts when only an opts object and command are passed', async function () {
      navyStub.getAvailableServiceNames = sandbox.stub().resolves([])
      const fakeCommand = { optsWithGlobals: () => ({ navy: 'from-global' }) }

      await actionsByCommand['available-services']({ navy: 'subcommand-default' }, fakeCommand)

      expect(getNavyStub.firstCall.args[0]).to.equal('from-global')
    })

    it('should pass undefined when called with an empty service list', async function () {
      navyStub.start = sandbox.stub().resolves()

      await actionsByCommand.start([], { navy: 'env-1' }, {})

      expect(navyStub.start.firstCall.args[0]).to.equal(undefined)
    })

    it('should drive logging by default', async function () {
      navyStub.start = sandbox.stub().resolves()

      await actionsByCommand.start(['web'], { navy: 'env-1' }, {})

      expect(startDriverLoggingStub.calledWith('Starting services...')).to.equal(true)
      expect(stopDriverLoggingStub.calledOnce).to.equal(true)
    })

    it('should skip driver logging for the url command (driverLogging: false)', async function () {
      navyStub.url = sandbox.stub().resolves('http://web')

      await actionsByCommand.url('web', { navy: 'env-1' }, {})

      expect(startDriverLoggingStub.called).to.equal(false)
      expect(stopDriverLoggingStub.called).to.equal(false)
    })

    it('should print arrays joined by newlines', async function () {
      navyStub.getAvailableServiceNames = sandbox.stub().resolves(['web', 'api'])

      await actionsByCommand['available-services']({ navy: 'env-1' }, {})

      expect(consoleLogStub.calledWith('web\napi')).to.equal(true)
    })

    it('should print non-null scalar return values', async function () {
      navyStub.url = sandbox.stub().resolves('http://web')

      await actionsByCommand.url('web', { navy: 'env-1' }, {})

      expect(consoleLogStub.calledWith('http://web')).to.equal(true)
    })

    it('should not print when the navy method returns null', async function () {
      navyStub.start = sandbox.stub().resolves(null)

      await actionsByCommand.start(['web'], { navy: 'env-1' }, {})

      expect(consoleLogStub.called).to.equal(false)
    })

    it('should redirect destroy with services to kill via serviceBasedAlias', async function () {
      navyStub.kill = sandbox.stub().resolves()

      await actionsByCommand.destroy('web api', { navy: 'env-1' }, {})

      expect(navyStub.kill.calledOnce).to.equal(true)
      expect(navyStub.kill.firstCall.args[0]).to.eql(['web', 'api'])
      const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join('\n')
      expect(printed).to.contain('should not be called with a list')
    })

    it('should emit cli.before.<fn> and cli.after.<fn>', async function () {
      navyStub.start = sandbox.stub().resolves()

      await actionsByCommand.start(['web'], { navy: 'env-1' }, {})

      const events = navyStub.emitAsync.getCalls().map(c => c.args[0])
      expect(events).to.include('cli.before.start')
      expect(events).to.include('cli.after.start')
    })

    it('should register an unhandledRejection handler', async function () {
      navyStub.start = sandbox.stub().resolves()

      await actionsByCommand.start(['web'], { navy: 'env-1' }, {})

      expect(processOnStub.calledWith('unhandledRejection')).to.equal(true)
    })

    describe('unhandledRejection handler', function () {

      it('should pretty-print NavyError and exit', async function () {
        navyStub.start = sandbox.stub().resolves()
        await actionsByCommand.start(['web'], { navy: 'env-1' }, {})

        const handlers = processOnStub.getCalls()
          .filter(c => c.args[0] === 'unhandledRejection')
          .map(c => c.args[1])
        const handler = handlers[handlers.length - 1]

        const err = new NavyError('boom')
        const prettyPrintStub = sandbox.stub(err, 'prettyPrint')

        handler(err)

        expect(prettyPrintStub.calledOnce).to.equal(true)
        expect(processExitStub.called).to.equal(true)
      })

      it('should print stack for non-NavyError and exit', async function () {
        navyStub.start = sandbox.stub().resolves()
        await actionsByCommand.start(['web'], { navy: 'env-1' }, {})

        const handlers = processOnStub.getCalls()
          .filter(c => c.args[0] === 'unhandledRejection')
          .map(c => c.args[1])
        const handler = handlers[handlers.length - 1]

        const err = new Error('boom')

        handler(err)

        expect(consoleErrorStub.calledWith(err.stack)).to.equal(true)
        expect(processExitStub.called).to.equal(true)
      })

    })

  })

  // Helper to capture program actions for the failure-path tests
  let capturedActions

  function createCapturingProgram() {
    capturedActions = {}
    return {
      option: sandbox.stub().returnsThis(),
      enablePositionalOptions: sandbox.stub().returnsThis(),
      command(spec) {
        const name = spec.split(' ')[0]
        const cmd = {
          option: sandbox.stub().returnsThis(),
          description: sandbox.stub().returnsThis(),
          action(handler) {
            capturedActions[name] = handler
            return cmd
          },
          on: sandbox.stub().returnsThis(),
        }
        return cmd
      },
    }
  }

})
