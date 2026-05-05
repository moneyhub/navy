/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import FileSystem from '../config-providers/filesystem'
import NPM from '../config-providers/npm'
import {
  resolveConfigProviderFromName,
  getImportCommandLineOptions,
  getImportOptionsForCLI,
} from '../config-provider'

describe('config-provider', function () {

  let sandbox

  beforeEach(function () {
    sandbox = sinon.createSandbox()
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('resolveConfigProviderFromName', function () {

    it('should return the FileSystem provider for "filesystem"', function () {
      expect(resolveConfigProviderFromName('filesystem')).to.equal(FileSystem)
    })

    it('should return the NPM provider for "npm"', function () {
      expect(resolveConfigProviderFromName('npm')).to.equal(NPM)
    })

    it('should return null for unknown provider names', function () {
      expect(resolveConfigProviderFromName('git')).to.equal(null)
    })

  })

  describe('getImportCommandLineOptions', function () {

    it('should return the concatenation of every provider\'s importCliOptions', function () {
      const options = getImportCommandLineOptions()

      expect(options).to.be.an('array')
      expect(options).to.eql([...NPM.importCliOptions, ...FileSystem.importCliOptions])
    })

  })

  describe('getImportOptionsForCLI', function () {

    it('should return options from the first provider that returns a non-null value', async function () {
      const npmStub = sandbox.stub(NPM, 'getImportOptionsForCLI').resolves(null)
      const fsResult = { configProvider: 'filesystem' }
      const fsStub = sandbox.stub(FileSystem, 'getImportOptionsForCLI').resolves(fsResult)

      const result = await getImportOptionsForCLI({ path: '/tmp' })

      expect(result).to.equal(fsResult)
      expect(npmStub.calledOnce).to.equal(true)
      expect(fsStub.calledOnce).to.equal(true)
    })

    it('should not call subsequent providers once one returns options', async function () {
      const npmResult = { configProvider: 'npm' }
      const npmStub = sandbox.stub(NPM, 'getImportOptionsForCLI').resolves(npmResult)
      const fsStub = sandbox.stub(FileSystem, 'getImportOptionsForCLI').resolves(null)

      const result = await getImportOptionsForCLI({})

      expect(result).to.equal(npmResult)
      expect(npmStub.calledOnce).to.equal(true)
      expect(fsStub.called).to.equal(false)
    })

    it('should throw an invariant violation when no provider matches', async function () {
      sandbox.stub(NPM, 'getImportOptionsForCLI').resolves(null)
      sandbox.stub(FileSystem, 'getImportOptionsForCLI').resolves(null)

      let caught
      try {
        await getImportOptionsForCLI({})
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.an('error')
      expect(caught.message).to.match(/CLI_IMPORT_RESOLVE_OPTIONS_ERR/)
    })

  })

})
