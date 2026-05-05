/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

describe('cli/import', function () {

  let sandbox
  let getNavyStub
  let navyStub
  let getImportOptionsForCLIStub
  let importNavyStub
  let fsStub
  let consoleLogStub
  let originalIsTTY
  let importCli

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    navyStub = { name: 'env-1' }
    getNavyStub = sandbox.stub().returns(navyStub)
    getImportOptionsForCLIStub = sandbox.stub().resolves({ configProvider: 'filesystem', path: '/some/path' })
    importNavyStub = sandbox.stub().resolves()
    fsStub = { readFileSync: sandbox.stub().returns('   ___   \n  /___\\  \n') }
    consoleLogStub = sandbox.stub(console, 'log')

    originalIsTTY = process.stdout.isTTY
    process.stdout.isTTY = false

    importCli = proxyquire.noCallThru()('../import', {
      '../util/fs': fsStub,
      '../': { getNavy: getNavyStub },
      '../config-provider': { getImportOptionsForCLI: getImportOptionsForCLIStub },
      './util': { importNavy: importNavyStub },
    })
  })

  afterEach(function () {
    process.stdout.isTTY = originalIsTTY
    sandbox.restore()
  })

  describe('default export', function () {

    it('should resolve the navy instance using opts.navy', async function () {
      await importCli({ navy: 'env-1' })

      expect(getNavyStub.calledOnce).to.equal(true)
      expect(getNavyStub.firstCall.args[0]).to.equal('env-1')
    })

    it('should read the sailing-boat ASCII art file', async function () {
      await importCli({ navy: 'env-1' })

      expect(fsStub.readFileSync.calledOnce).to.equal(true)
      expect(fsStub.readFileSync.firstCall.args[0]).to.contain('sailing-boat.txt')
    })

    it('should derive initialise opts via getImportOptionsForCLI and pass them to importNavy', async function () {
      const opts = { navy: 'env-1', someOpt: 'value' }
      const initialiseOpts = { configProvider: 'filesystem', path: '/cwd' }
      getImportOptionsForCLIStub.resolves(initialiseOpts)

      await importCli(opts)

      expect(getImportOptionsForCLIStub.calledOnce).to.equal(true)
      expect(getImportOptionsForCLIStub.firstCall.args[0]).to.equal(opts)
      expect(importNavyStub.calledOnce).to.equal(true)
      expect(importNavyStub.firstCall.args[0]).to.equal(navyStub)
      expect(importNavyStub.firstCall.args[1]).to.equal(initialiseOpts)
    })

    it('should log the post-import help line', async function () {
      await importCli({ navy: 'env-1' })

      const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join(' ')
      expect(printed).to.contain('navy')
      expect(printed).to.contain('any directory')
    })

    it('should not print the boat ASCII art when stdout is not a TTY', async function () {
      process.stdout.isTTY = false

      await importCli({ navy: 'env-1' })

      const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join('\n')
      expect(printed).to.not.contain('___')
    })

    it('should print the boat ASCII art when stdout is a TTY', async function () {
      process.stdout.isTTY = true

      await importCli({ navy: 'env-1' })

      const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join('\n')
      expect(printed).to.contain('___')
    })

  })

})
