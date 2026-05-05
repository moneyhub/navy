/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import path from 'path'
import fs from '../../../util/fs'
import * as execAsyncModule from '../../../util/exec-async'
import createFileSystemConfigProvider from '../index'

function makeNavy({ name = 'env', state = null } = {}) {
  return {
    name,
    getState: sinon.stub().resolves(state),
  }
}

describe('filesystem config provider', function () {

  let sandbox

  beforeEach(function () {
    sandbox = sinon.createSandbox()
    sandbox.stub(process, 'cwd').returns('/work/dir')
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('getNavyPath', function () {

    it('should return the path from state when the path exists on disk', async function () {
      const provider = createFileSystemConfigProvider(makeNavy({ state: { path: '/some/path' } }))
      sandbox.stub(fs, 'statAsync').resolves({})

      expect(await provider.getNavyPath()).to.equal('/some/path')
    })

    it('should throw STATE_NONEXISTANT when state is missing', async function () {
      const provider = createFileSystemConfigProvider(makeNavy({ state: null }))

      let caught
      try { await provider.getNavyPath() } catch (e) { caught = e }
      expect(caught.message).to.match(/STATE_NONEXISTANT/)
    })

    it('should throw FILESYSTEM_PROVIDER_REQUIRES_PATH when state has no path', async function () {
      const provider = createFileSystemConfigProvider(makeNavy({ state: {} }))

      let caught
      try { await provider.getNavyPath() } catch (e) { caught = e }
      expect(caught.message).to.match(/FILESYSTEM_PROVIDER_REQUIRES_PATH/)
    })

    it('should throw FILESYSTEM_PROVIDER_INVALID_PATH when stat of the path fails', async function () {
      const provider = createFileSystemConfigProvider(makeNavy({ state: { path: '/missing' } }))
      sandbox.stub(fs, 'statAsync').rejects(new Error('ENOENT'))

      let caught
      try { await provider.getNavyPath() } catch (e) { caught = e }
      expect(caught.message).to.match(/FILESYSTEM_PROVIDER_INVALID_PATH/)
    })

  })

  describe('getNavyFilePath', function () {

    it('should return <navyPath>/Navyfile.js', async function () {
      const provider = createFileSystemConfigProvider(makeNavy({ state: { path: '/some/path' } }))
      sandbox.stub(fs, 'statAsync').resolves({})

      expect(await provider.getNavyFilePath()).to.equal(path.join('/some/path', 'Navyfile.js'))
    })

  })

  describe('refreshConfig', function () {

    it('should be a no-op that returns false', async function () {
      const provider = createFileSystemConfigProvider(makeNavy())
      expect(await provider.refreshConfig()).to.equal(false)
    })

  })

  describe('getLocationDisplayName', function () {

    it('should return the path from state', async function () {
      const provider = createFileSystemConfigProvider(makeNavy({ state: { path: '/x' } }))
      expect(await provider.getLocationDisplayName()).to.equal('/x')
    })

    it('should throw STATE_NONEXISTANT when state is missing', async function () {
      const provider = createFileSystemConfigProvider(makeNavy({ state: null }))

      let caught
      try { await provider.getLocationDisplayName() } catch (e) { caught = e }
      expect(caught.message).to.match(/STATE_NONEXISTANT/)
    })

  })

  describe('isDangling', function () {

    it('should return true when state is null', async function () {
      const provider = createFileSystemConfigProvider(makeNavy({ state: null }))
      expect(await provider.isDangling()).to.equal(true)
    })

    it('should return true when state has no path', async function () {
      const provider = createFileSystemConfigProvider(makeNavy({ state: {} }))
      expect(await provider.isDangling()).to.equal(true)
    })

    it('should return true when stat of the path fails', async function () {
      const provider = createFileSystemConfigProvider(makeNavy({ state: { path: '/x' } }))
      sandbox.stub(fs, 'statAsync').rejects(new Error('ENOENT'))
      expect(await provider.isDangling()).to.equal(true)
    })

    it('should return false when state has a valid path', async function () {
      const provider = createFileSystemConfigProvider(makeNavy({ state: { path: '/x' } }))
      sandbox.stub(fs, 'statAsync').resolves({})
      expect(await provider.isDangling()).to.equal(false)
    })

  })

  describe('importCliOptions', function () {

    it('should expose an empty CLI options array', function () {
      expect(createFileSystemConfigProvider.importCliOptions).to.eql([])
    })

  })

  describe('getImportOptionsForCLI', function () {

    it('should return { configProvider: "filesystem", path: cwd } when docker-compose config is valid', async function () {
      sandbox.stub(execAsyncModule, 'execAsync').resolves('')

      expect(await createFileSystemConfigProvider.getImportOptionsForCLI({})).to.eql({
        configProvider: 'filesystem',
        path: '/work/dir',
      })
    })

    it('should throw NO_DOCKER_COMPOSE_FILE when docker-compose config fails', async function () {
      sandbox.stub(execAsyncModule, 'execAsync').rejects(new Error('boom'))

      let caught
      try {
        await createFileSystemConfigProvider.getImportOptionsForCLI({})
      } catch (e) {
        caught = e
      }
      expect(caught.message).to.match(/NO_DOCKER_COMPOSE_FILE/)
    })

  })

})
