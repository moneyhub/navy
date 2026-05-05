/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import path from 'path'
import fs from 'fs'
import { promises as fsPromises } from 'fs'
import { getConfig, getConfigDir, getConfigPath, setConfig, DEFAULT_TLS_ROOT_CA_DIR } from '../config'

async function clearConfigCache(sandbox) {
  const mkdirRestore = sandbox.stub(fsPromises, 'mkdir').resolves()
  const writeRestore = sandbox.stub(fsPromises, 'writeFile').resolves()
  await setConfig(null)
  mkdirRestore.restore()
  writeRestore.restore()
}

describe('config', function () {

  let sandbox
  let originalHome

  beforeEach(async function () {
    sandbox = sinon.createSandbox()
    originalHome = process.env.HOME
    process.env.HOME = '/home/test-user'
    await clearConfigCache(sandbox)
  })

  afterEach(function () {
    sandbox.restore()
    if (originalHome === undefined) {
      delete process.env.HOME
    } else {
      process.env.HOME = originalHome
    }
  })

  describe('getConfigDir', function () {

    it('should join $HOME with .navy', function () {
      expect(getConfigDir()).to.equal(path.join('/home/test-user', '.navy'))
    })

    it('should throw when HOME is not set', function () {
      delete process.env.HOME
      expect(() => getConfigDir()).to.throw(/NO_HOME_DIRECTORY/)
    })

  })

  describe('getConfigPath', function () {

    it('should return <configDir>/config.json', function () {
      expect(getConfigPath()).to.equal(path.join('/home/test-user', '.navy', 'config.json'))
    })

  })

  describe('DEFAULT_TLS_ROOT_CA_DIR', function () {

    it('should be exported as a string referencing tls-root-ca', function () {
      expect(DEFAULT_TLS_ROOT_CA_DIR).to.be.a('string')
      expect(DEFAULT_TLS_ROOT_CA_DIR).to.contain('tls-root-ca')
    })

  })

  describe('getConfig', function () {

    it('should read the config file from disk and parse it as JSON', function () {
      const onDisk = { defaultNavy: 'mine', externalIP: '10.0.0.1', tlsRootCaDir: '/tmp/ca' }
      sandbox.stub(fs, 'readFileSync').returns(JSON.stringify(onDisk))

      expect(getConfig()).to.eql(onDisk)
    })

    it('should return the cached config on subsequent calls', function () {
      const onDisk = { defaultNavy: 'mine' }
      const readStub = sandbox.stub(fs, 'readFileSync').returns(JSON.stringify(onDisk))

      getConfig()
      getConfig()
      getConfig()

      expect(readStub.callCount).to.equal(1)
    })

    it('should fall back to default config when reading the file fails', function () {
      sandbox.stub(fs, 'readFileSync').throws(new Error('ENOENT'))

      const cfg = getConfig()
      expect(cfg).to.have.property('defaultNavy', 'dev')
      expect(cfg).to.have.property('externalIP', null)
      expect(cfg).to.have.property('tlsRootCaDir').that.is.a('string')
    })

  })

  describe('setConfig', function () {

    it('should write the provided config to the config file', async function () {
      const mkdirStub = sandbox.stub(fsPromises, 'mkdir').resolves()
      const writeStub = sandbox.stub(fsPromises, 'writeFile').resolves()

      await setConfig({ defaultNavy: 'env-1' })

      expect(mkdirStub.calledOnce).to.equal(true)
      expect(mkdirStub.firstCall.args[0]).to.equal(path.join('/home/test-user', '.navy'))
      expect(mkdirStub.firstCall.args[1]).to.eql({ recursive: true })

      expect(writeStub.calledOnce).to.equal(true)
      expect(writeStub.firstCall.args[0]).to.equal(path.join('/home/test-user', '.navy', 'config.json'))
      expect(JSON.parse(writeStub.firstCall.args[1])).to.eql({ defaultNavy: 'env-1' })
    })

    it('should write the default config when called with null', async function () {
      sandbox.stub(fsPromises, 'mkdir').resolves()
      const writeStub = sandbox.stub(fsPromises, 'writeFile').resolves()

      await setConfig(null)

      const written = JSON.parse(writeStub.firstCall.args[1])
      expect(written).to.have.property('defaultNavy', 'dev')
    })

    it('should invalidate the cached config so the next getConfig re-reads', async function () {
      const readStub = sandbox.stub(fs, 'readFileSync').returns(JSON.stringify({ defaultNavy: 'one' }))

      getConfig()
      expect(readStub.callCount).to.equal(1)

      sandbox.stub(fsPromises, 'mkdir').resolves()
      sandbox.stub(fsPromises, 'writeFile').resolves()
      await setConfig({ defaultNavy: 'two' })

      readStub.returns(JSON.stringify({ defaultNavy: 'two' }))
      const cfg = getConfig()
      expect(readStub.callCount).to.equal(2)
      expect(cfg).to.eql({ defaultNavy: 'two' })
    })

  })

})
