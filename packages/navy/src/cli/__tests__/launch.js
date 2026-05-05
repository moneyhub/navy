/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

describe('cli/launch', function () {

  let sandbox
  let inquirerStub
  let getOrInitialiseNavyStub
  let navyStub
  let startDriverLoggingStub
  let stopDriverLoggingStub
  let launchCli

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    navyStub = {
      name: 'env-1',
      ensurePluginsLoaded: sandbox.stub().resolves(),
      getNavyFile: sandbox.stub().resolves(null),
      getAvailableServiceNames: sandbox.stub().resolves(['web', 'api', 'db']),
      getLaunchedServiceNames: sandbox.stub().resolves([]),
      emitAsync: sandbox.stub().resolves(),
      launch: sandbox.stub().resolves(),
    }

    getOrInitialiseNavyStub = sandbox.stub().resolves(navyStub)
    inquirerStub = { prompt: sandbox.stub().resolves({ services: [] }) }
    startDriverLoggingStub = sandbox.stub()
    stopDriverLoggingStub = sandbox.stub()

    launchCli = proxyquire.noCallThru()('../launch', {
      inquirer: inquirerStub,
      './util': { getOrInitialiseNavy: getOrInitialiseNavyStub },
      '../driver-logging': {
        startDriverLogging: startDriverLoggingStub,
        stopDriverLogging: stopDriverLoggingStub,
      },
    })
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('default export', function () {

    it('should resolve the navy via getOrInitialiseNavy(opts.navy)', async function () {
      await launchCli(['web'], { navy: 'env-1' })

      expect(getOrInitialiseNavyStub.calledWith('env-1')).to.equal(true)
    })

    it('should launch services without prompting when services are provided', async function () {
      await launchCli(['web', 'api'], { navy: 'env-1' })

      expect(inquirerStub.prompt.called).to.equal(false)
      expect(navyStub.launch.calledOnce).to.equal(true)
      expect(navyStub.launch.firstCall.args[0]).to.eql(['web', 'api'])
    })

    it('should bracket launch with start/stopDriverLogging', async function () {
      await launchCli(['web'], { navy: 'env-1' })

      expect(startDriverLoggingStub.calledOnce).to.equal(true)
      expect(stopDriverLoggingStub.calledOnce).to.equal(true)
      expect(startDriverLoggingStub.calledBefore(navyStub.launch)).to.equal(true)
      expect(navyStub.launch.calledBefore(stopDriverLoggingStub)).to.equal(true)
    })

    it('should emit cli.before.launch before launching', async function () {
      await launchCli(['web'], { navy: 'env-1' })

      expect(navyStub.emitAsync.calledOnce).to.equal(true)
      expect(navyStub.emitAsync.firstCall.args[0]).to.equal('cli.before.launch')
      expect(navyStub.emitAsync.calledBefore(navyStub.launch)).to.equal(true)
    })

    it('should prompt with inquirer when no services are provided', async function () {
      inquirerStub.prompt.resolves({ services: ['web'] })

      await launchCli([], { navy: 'env-1' })

      expect(inquirerStub.prompt.calledOnce).to.equal(true)
      const promptArgs = inquirerStub.prompt.firstCall.args[0]
      expect(promptArgs[0].type).to.equal('checkbox')
      expect(promptArgs[0].name).to.equal('services')
      expect(promptArgs[0].choices.map(c => c.name)).to.have.members(['web', 'api', 'db'])
    })

    it('should pre-check services from launchedServiceNames when present', async function () {
      navyStub.getLaunchedServiceNames.resolves(['api'])
      inquirerStub.prompt.resolves({ services: [] })

      await launchCli([], { navy: 'env-1' })

      const choices = inquirerStub.prompt.firstCall.args[0][0].choices
      const apiChoice = choices.find(c => c.name === 'api')
      const webChoice = choices.find(c => c.name === 'web')
      expect(apiChoice.checked).to.equal(true)
      expect(webChoice.checked).to.equal(false)
    })

    it('should pre-check services from navyFile.launchDefaults when nothing is launched', async function () {
      navyStub.getNavyFile.resolves({ launchDefaults: ['web'] })
      inquirerStub.prompt.resolves({ services: [] })

      await launchCli([], { navy: 'env-1' })

      const choices = inquirerStub.prompt.firstCall.args[0][0].choices
      const webChoice = choices.find(c => c.name === 'web')
      expect(webChoice.checked).to.equal(true)
    })

    it('should fall back to no defaults when navyFile is null and nothing is launched', async function () {
      navyStub.getNavyFile.resolves(null)
      inquirerStub.prompt.resolves({ services: [] })

      await launchCli([], { navy: 'env-1' })

      const choices = inquirerStub.prompt.firstCall.args[0][0].choices
      choices.forEach(c => expect(c.checked).to.equal(false))
    })

    it('should fall back to empty defaults when navyFile lacks launchDefaults', async function () {
      navyStub.getNavyFile.resolves({})
      inquirerStub.prompt.resolves({ services: [] })

      await launchCli([], { navy: 'env-1' })

      const choices = inquirerStub.prompt.firstCall.args[0][0].choices
      choices.forEach(c => expect(c.checked).to.equal(false))
    })

    it('should return early without launching when the user selects no services', async function () {
      inquirerStub.prompt.resolves({ services: [] })

      await launchCli([], { navy: 'env-1' })

      expect(navyStub.launch.called).to.equal(false)
      expect(navyStub.emitAsync.called).to.equal(false)
      expect(startDriverLoggingStub.called).to.equal(false)
      expect(stopDriverLoggingStub.called).to.equal(false)
    })

    it('should launch with the services chosen via the interactive prompt', async function () {
      inquirerStub.prompt.resolves({ services: ['db', 'web'] })

      await launchCli([], { navy: 'env-1' })

      expect(navyStub.launch.calledOnce).to.equal(true)
      expect(navyStub.launch.firstCall.args[0]).to.eql(['db', 'web'])
    })

    it('should treat a null services arg as no selection and prompt', async function () {
      inquirerStub.prompt.resolves({ services: ['web'] })

      await launchCli(null, { navy: 'env-1' })

      expect(inquirerStub.prompt.calledOnce).to.equal(true)
      expect(navyStub.launch.calledOnce).to.equal(true)
      expect(navyStub.launch.firstCall.args[0]).to.eql(['web'])
    })

  })

})
