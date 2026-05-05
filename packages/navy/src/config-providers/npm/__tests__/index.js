/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import { promises as fsp } from 'fs'
import childProcess from 'child_process'
import fs from '../../../util/fs'
import createNpmConfigProvider from '../index'

function makeNavy({ name = 'env', state = null } = {}) {
  return {
    name,
    getState: sinon.stub().resolves(state),
  }
}

describe('npm config provider', function () {

  let sandbox
  let originalHome

  beforeEach(function () {
    sandbox = sinon.createSandbox()
    originalHome = process.env.HOME
    process.env.HOME = '/home/test'
  })

  afterEach(function () {
    sandbox.restore()
    if (originalHome === undefined) {
      delete process.env.HOME
    } else {
      process.env.HOME = originalHome
    }
  })

  describe('getNavyPath', function () {

    it('should return the resolved module path when the package is installed', async function () {
      const provider = createNpmConfigProvider(makeNavy({ state: { npmPackage: 'my-config' } }))
      sandbox.stub(fs, 'accessSync')

      const result = await provider.getNavyPath()

      expect(result).to.contain('node_modules')
      expect(result).to.contain('my-config')
    })

    it('should throw STATE_NONEXISTANT when state is missing', async function () {
      const provider = createNpmConfigProvider(makeNavy({ state: null }))

      let caught
      try { await provider.getNavyPath() } catch (e) { caught = e }
      expect(caught.message).to.match(/STATE_NONEXISTANT/)
    })

    it('should throw NPM_PROVIDER_REQUIRES_PACKAGE when state has no npmPackage', async function () {
      const provider = createNpmConfigProvider(makeNavy({ state: {} }))

      let caught
      try { await provider.getNavyPath() } catch (e) { caught = e }
      expect(caught.message).to.match(/NPM_PROVIDER_REQUIRES_PACKAGE/)
    })

    it('should throw when accessSync fails', async function () {
      const provider = createNpmConfigProvider(makeNavy({ state: { npmPackage: 'missing' } }))
      sandbox.stub(fs, 'accessSync').throws(new Error('ENOENT'))

      let caught
      try { await provider.getNavyPath() } catch (e) { caught = e }
      expect(caught).to.be.an('error')
    })

  })

  describe('getNavyFilePath', function () {

    it('should return <navyPath>/Navyfile.js', async function () {
      const provider = createNpmConfigProvider(makeNavy({ state: { npmPackage: 'my-config' } }))
      sandbox.stub(fs, 'accessSync')

      const filePath = await provider.getNavyFilePath()
      expect(filePath).to.match(/my-config\/Navyfile\.js$/)
    })

  })

  describe('refreshConfig', function () {

    it('should reinstall the package via npm and return true', async function () {
      const provider = createNpmConfigProvider(makeNavy({ state: { npmPackage: 'pkg' } }))
      sandbox.stub(fsp, 'mkdir').resolves()
      const execSync = sandbox.stub(childProcess, 'execSync').returns('')

      expect(await provider.refreshConfig()).to.equal(true)
      const calls = execSync.getCalls().map(c => c.args[0])
      expect(calls[0]).to.match(/npm info pkg name/)
      expect(calls[1]).to.match(/npm i pkg/)
    })

    it('should throw STATE_NONEXISTANT when state is missing', async function () {
      const provider = createNpmConfigProvider(makeNavy({ state: null }))

      let caught
      try { await provider.refreshConfig() } catch (e) { caught = e }
      expect(caught.message).to.match(/STATE_NONEXISTANT/)
    })

    it('should throw NPM_PROVIDER_REQUIRES_PACKAGE when no npmPackage in state', async function () {
      const provider = createNpmConfigProvider(makeNavy({ state: {} }))

      let caught
      try { await provider.refreshConfig() } catch (e) { caught = e }
      expect(caught.message).to.match(/NPM_PROVIDER_REQUIRES_PACKAGE/)
    })

    it('should throw a friendly error when npm info fails', async function () {
      const provider = createNpmConfigProvider(makeNavy({ state: { npmPackage: 'unknown-pkg' } }))
      sandbox.stub(fsp, 'mkdir').resolves()
      sandbox.stub(childProcess, 'execSync').callsFake(cmd => {
        if (cmd.startsWith('npm info')) throw new Error('not found')
        return ''
      })

      let caught
      try { await provider.refreshConfig() } catch (e) { caught = e }
      expect(caught.message).to.contain('Package "unknown-pkg" not found or unreachable')
    })

  })

  describe('getLocationDisplayName', function () {

    it('should return the npmPackage from state', async function () {
      const provider = createNpmConfigProvider(makeNavy({ state: { npmPackage: 'pkg' } }))
      expect(await provider.getLocationDisplayName()).to.equal('pkg')
    })

    it('should throw STATE_NONEXISTANT when state is missing', async function () {
      const provider = createNpmConfigProvider(makeNavy({ state: null }))

      let caught
      try { await provider.getLocationDisplayName() } catch (e) { caught = e }
      expect(caught.message).to.match(/STATE_NONEXISTANT/)
    })

  })

  describe('isDangling', function () {

    it('should return true when state is null', async function () {
      const provider = createNpmConfigProvider(makeNavy({ state: null }))
      expect(await provider.isDangling()).to.equal(true)
    })

    it('should return true when state has no npmPackage', async function () {
      const provider = createNpmConfigProvider(makeNavy({ state: {} }))
      expect(await provider.isDangling()).to.equal(true)
    })

    it('should return false when state has an npmPackage', async function () {
      const provider = createNpmConfigProvider(makeNavy({ state: { npmPackage: 'pkg' } }))
      expect(await provider.isDangling()).to.equal(false)
    })

  })

  describe('importCliOptions', function () {

    it('should advertise the --npm-package CLI option', function () {
      expect(createNpmConfigProvider.importCliOptions).to.have.lengthOf(1)
      expect(createNpmConfigProvider.importCliOptions[0][0]).to.match(/--npm-package/)
    })

  })

  describe('getImportOptionsForCLI', function () {

    it('should install the package and return npm provider config when --npm-package is provided', async function () {
      sandbox.stub(fsp, 'mkdir').resolves()
      sandbox.stub(childProcess, 'execSync').returns('')

      const result = await createNpmConfigProvider.getImportOptionsForCLI({ npmPackage: 'my-pkg' })

      expect(result).to.eql({ configProvider: 'npm', npmPackage: 'my-pkg' })
    })

    it('should return undefined when --npm-package is not provided', async function () {
      const result = await createNpmConfigProvider.getImportOptionsForCLI({})
      expect(result).to.equal(undefined)
    })

  })

})
