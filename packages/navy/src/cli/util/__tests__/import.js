/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import { NavyError } from '../../../errors'

describe('cli/util/import', function () {

  let sandbox
  let startDriverLoggingStub
  let stopDriverLoggingStub
  let consoleLogStub
  let navyStub
  let importNavy

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    navyStub = {
      name: 'env-1',
      isInitialised: sandbox.stub().resolves(false),
      initialise: sandbox.stub().resolves(),
      ensurePluginsLoaded: sandbox.stub().resolves(),
      emitAsync: sandbox.stub().resolves(),
      relaunch: sandbox.stub().resolves(),
    }

    startDriverLoggingStub = sandbox.stub()
    stopDriverLoggingStub = sandbox.stub()
    consoleLogStub = sandbox.stub(console, 'log')

    importNavy = proxyquire.noCallThru()('../import', {
      '../../driver-logging': {
        startDriverLogging: startDriverLoggingStub,
        stopDriverLogging: stopDriverLoggingStub,
      },
      '../../errors': { NavyError },
    }).importNavy
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('importNavy', function () {

    it('should throw a NavyError when the navy has already been initialised', async function () {
      navyStub.isInitialised.resolves(true)

      let caught
      try {
        await importNavy(navyStub, {})
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.instanceof(NavyError)
      expect(caught.message).to.contain('env-1')
      expect(caught.message).to.contain('already been imported')
      expect(navyStub.initialise.called).to.equal(false)
    })

    it('should initialise the navy with the provided opts', async function () {
      const opts = { configProvider: 'filesystem', path: '/cwd' }

      await importNavy(navyStub, opts)

      expect(navyStub.initialise.calledOnce).to.equal(true)
      expect(navyStub.initialise.firstCall.args[0]).to.equal(opts)
    })

    it('should ensure plugins are loaded and emit cli.import in order before relaunch', async function () {
      await importNavy(navyStub, {})

      expect(navyStub.ensurePluginsLoaded.calledOnce).to.equal(true)
      expect(navyStub.emitAsync.calledOnce).to.equal(true)
      expect(navyStub.emitAsync.firstCall.args[0]).to.equal('cli.import')
      expect(navyStub.relaunch.calledOnce).to.equal(true)
      expect(
        navyStub.initialise.calledBefore(navyStub.ensurePluginsLoaded),
      ).to.equal(true)
      expect(
        navyStub.ensurePluginsLoaded.calledBefore(navyStub.emitAsync),
      ).to.equal(true)
      expect(
        navyStub.emitAsync.calledBefore(navyStub.relaunch),
      ).to.equal(true)
    })

    it('should bracket relaunch with start/stopDriverLogging', async function () {
      await importNavy(navyStub, {})

      expect(startDriverLoggingStub.calledOnce).to.equal(true)
      expect(stopDriverLoggingStub.calledOnce).to.equal(true)
      expect(
        startDriverLoggingStub.calledBefore(navyStub.relaunch),
      ).to.equal(true)
      expect(
        navyStub.relaunch.calledBefore(stopDriverLoggingStub),
      ).to.equal(true)
    })

    it('should log a success message containing the navy name', async function () {
      await importNavy(navyStub, {})

      const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join(' ')
      expect(printed).to.contain('env-1')
      expect(printed).to.contain('imported and initialised')
    })

    it('should print a labelled line for each known option key', async function () {
      const opts = {
        configProvider: 'filesystem',
        path: '/cwd',
        npmPackage: 'some-pkg',
      }

      await importNavy(navyStub, opts)

      const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join('\n')
      expect(printed).to.contain('Provider')
      expect(printed).to.contain('filesystem')
      expect(printed).to.contain('Directory')
      expect(printed).to.contain('/cwd')
      expect(printed).to.contain('NPM Package')
      expect(printed).to.contain('some-pkg')
    })

    it('should ignore unknown option keys when printing labels', async function () {
      const opts = { configProvider: 'filesystem', unrecognised: 'value' }

      await importNavy(navyStub, opts)

      const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join('\n')
      expect(printed).to.contain('Provider')
      expect(printed).to.not.contain('unrecognised')
      expect(printed).to.not.contain('value')
    })

    it('should not print any option label lines when no known options are supplied', async function () {
      await importNavy(navyStub, {})

      const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join('\n')
      expect(printed).to.not.contain('Provider')
      expect(printed).to.not.contain('Directory')
      expect(printed).to.not.contain('NPM Package')
    })

  })

})
