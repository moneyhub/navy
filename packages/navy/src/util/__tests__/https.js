/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import { NavyError } from '../../errors'

describe('util/https', function () {

  let sandbox
  let getConfigStub
  let getConfigDirStub
  let DEFAULT_TLS_ROOT_CA_DIR
  let getNavyStub
  let navyStub
  let fsStub
  let pkiStub
  let mdStub
  let httpsModule

  function loadModule() {
    httpsModule = proxyquire.noCallThru()('../https', {
      '../config': {
        getConfig: getConfigStub,
        getConfigDir: getConfigDirStub,
        DEFAULT_TLS_ROOT_CA_DIR,
      },
      '../errors': { NavyError },
      '../navy': { getNavy: getNavyStub },
      fs: fsStub,
      'node-forge': { pki: pkiStub, md: mdStub },
    })
  }

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    getConfigStub = sandbox.stub().returns({})
    getConfigDirStub = sandbox.stub().returns('/cfg')
    DEFAULT_TLS_ROOT_CA_DIR = '/default-ca-dir'

    navyStub = {
      url: sandbox.stub().resolves('https://web.local'),
    }
    getNavyStub = sandbox.stub().returns(navyStub)

    fsStub = {
      existsSync: sandbox.stub().returns(true),
      mkdirSync: sandbox.stub(),
      unlinkSync: sandbox.stub(),
      readFileSync: sandbox.stub().returns('--PEM--'),
      writeFileSync: sandbox.stub(),
    }

    const certObj = {
      publicKey: null,
      serialNumber: null,
      validity: { notBefore: new Date(), notAfter: new Date() },
      setSubject: sandbox.stub(),
      setIssuer: sandbox.stub(),
      setExtensions: sandbox.stub(),
      sign: sandbox.stub(),
      subject: { attributes: [] },
    }

    pkiStub = {
      rsa: {
        generateKeyPair: sandbox.stub().returns({
          publicKey: 'pub',
          privateKey: 'priv',
        }),
      },
      createCertificate: sandbox.stub().returns(certObj),
      privateKeyToPem: sandbox.stub().returns('priv-pem'),
      publicKeyToPem: sandbox.stub().returns('pub-pem'),
      certificateToPem: sandbox.stub().returns('cert-pem'),
      privateKeyFromPem: sandbox.stub().returns('priv-key-obj'),
      certificateFromPem: sandbox.stub().returns({ subject: { attributes: [{ name: 'commonName', value: 'ca' }] } }),
    }

    mdStub = { sha256: { create: sandbox.stub().returns('digest') } }

    loadModule()
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('getCertsPath', function () {

    it('should return the certs path when it exists', function () {
      fsStub.existsSync.returns(true)

      const result = httpsModule.getCertsPath()

      expect(result).to.contain('tls-certs')
      expect(fsStub.mkdirSync.called).to.equal(false)
    })

    it('should return an empty string when path does not exist and create is false', function () {
      fsStub.existsSync.returns(false)

      const result = httpsModule.getCertsPath()

      expect(result).to.equal('')
      expect(fsStub.mkdirSync.called).to.equal(false)
    })

    it('should create the path when create is true and it does not exist', function () {
      fsStub.existsSync.returns(false)

      const result = httpsModule.getCertsPath(true)

      expect(fsStub.mkdirSync.calledOnce).to.equal(true)
      expect(fsStub.mkdirSync.firstCall.args[0]).to.contain('tls-certs')
      expect(fsStub.mkdirSync.firstCall.args[1]).to.eql({ recursive: true })
      expect(result).to.contain('tls-certs')
    })

  })

  describe('removeCert', function () {

    it('should unlink each existing cert/key file', async function () {
      fsStub.existsSync.callsFake(p => p === '/cfg/tls-certs' || p.endsWith('web.local.crt') || p.endsWith('web.local.key'))
      navyStub.url.resolves('https://web.local')

      await httpsModule.removeCert({ navy: 'env-1', disable: 'web' })

      expect(fsStub.unlinkSync.callCount).to.equal(2)
      const paths = fsStub.unlinkSync.getCalls().map(c => c.args[0])
      expect(paths.some(p => p.endsWith('web.local.crt'))).to.equal(true)
      expect(paths.some(p => p.endsWith('web.local.key'))).to.equal(true)
    })

    it('should skip files that do not exist', async function () {
      fsStub.existsSync.callsFake(p => p === '/cfg/tls-certs')

      await httpsModule.removeCert({ navy: 'env-1', disable: 'web' })

      expect(fsStub.unlinkSync.called).to.equal(false)
    })

    it('should wrap unlink errors in NavyError', async function () {
      fsStub.existsSync.callsFake(p => p === '/cfg/tls-certs' || p.endsWith('.crt') || p.endsWith('.key'))
      fsStub.unlinkSync.throws(new Error('permission denied'))

      let caught
      try {
        await httpsModule.removeCert({ navy: 'env-1', disable: 'web' })
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.instanceof(NavyError)
    })

  })

  describe('generateRootCa', function () {

    it('should create the root CA dir when missing', async function () {
      fsStub.existsSync.callsFake(p => {
        if (p === '/default-ca-dir') return false
        return false
      })

      await httpsModule.generateRootCa()

      expect(fsStub.mkdirSync.calledWith('/default-ca-dir')).to.equal(true)
      expect(fsStub.writeFileSync.calledThrice).to.equal(true)
    })

    it('should wrap mkdir errors in NavyError', async function () {
      fsStub.existsSync.returns(false)
      fsStub.mkdirSync.throws(new Error('permission denied'))

      let caught
      try {
        await httpsModule.generateRootCa()
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.instanceof(NavyError)
    })

    it('should skip generation when CA already exists', async function () {
      fsStub.existsSync.callsFake(p => p.endsWith('ca.crt') || p.endsWith('ca.key') || p === '/default-ca-dir')

      await httpsModule.generateRootCa()

      expect(pkiStub.rsa.generateKeyPair.called).to.equal(false)
      expect(fsStub.writeFileSync.called).to.equal(false)
    })

    it('should generate, sign, and write CA files when missing', async function () {
      fsStub.existsSync.callsFake(p => p === '/default-ca-dir')

      await httpsModule.generateRootCa()

      expect(pkiStub.rsa.generateKeyPair.calledWith(2048)).to.equal(true)
      expect(pkiStub.createCertificate.calledOnce).to.equal(true)
      expect(fsStub.writeFileSync.calledThrice).to.equal(true)

      const writtenPaths = fsStub.writeFileSync.getCalls().map(c => c.args[0])
      expect(writtenPaths.some(p => p.endsWith('ca.key'))).to.equal(true)
      expect(writtenPaths.some(p => p.endsWith('ca.pub.key'))).to.equal(true)
      expect(writtenPaths.some(p => p.endsWith('ca.crt'))).to.equal(true)
    })

    it('should use a custom root CA dir when supplied via config', async function () {
      getConfigStub.returns({ tlsRootCaDir: '/custom-ca' })
      fsStub.existsSync.callsFake(p => p === '/custom-ca')

      await httpsModule.generateRootCa()

      const writtenPaths = fsStub.writeFileSync.getCalls().map(c => c.args[0])
      expect(writtenPaths.every(p => p.startsWith('/custom-ca/'))).to.equal(true)
    })

    it('should wrap signing errors in NavyError', async function () {
      fsStub.existsSync.callsFake(p => p === '/default-ca-dir')
      const cert = pkiStub.createCertificate()
      cert.sign = sandbox.stub().throws(new Error('sign failure'))
      pkiStub.createCertificate.returns(cert)

      let caught
      try {
        await httpsModule.generateRootCa()
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.instanceof(NavyError)
    })

  })

  describe('createCert', function () {

    it('should skip creation when the cert already exists', async function () {
      fsStub.existsSync.callsFake(p => p === '/cfg/tls-certs' || p === '/cfg/tls-certs/web.local.crt')

      await httpsModule.createCert({ serviceUrl: 'https://web.local' })

      expect(fsStub.writeFileSync.called).to.equal(false)
    })

    it('should generate, sign, and write a service cert', async function () {
      fsStub.existsSync.callsFake(p => {
        if (p === '/cfg/tls-certs') return true
        if (p === '/default-ca-dir') return true
        if (p === '/default-ca-dir/ca.crt' || p === '/default-ca-dir/ca.key') return true
        return false
      })

      await httpsModule.createCert({ serviceUrl: 'https://web.local' })

      expect(pkiStub.privateKeyFromPem.calledOnce).to.equal(true)
      expect(pkiStub.certificateFromPem.calledOnce).to.equal(true)
      expect(fsStub.writeFileSync.calledTwice).to.equal(true)

      const writtenPaths = fsStub.writeFileSync.getCalls().map(c => c.args[0])
      expect(writtenPaths.some(p => p.endsWith('web.local.key'))).to.equal(true)
      expect(writtenPaths.some(p => p.endsWith('web.local.crt'))).to.equal(true)
    })

    it('should use opts.hostName when supplied', async function () {
      fsStub.existsSync.callsFake(p => {
        if (p === '/cfg/tls-certs') return true
        if (p === '/default-ca-dir') return true
        if (p === '/default-ca-dir/ca.crt' || p === '/default-ca-dir/ca.key') return true
        return false
      })

      await httpsModule.createCert({ hostName: 'custom-host' })

      const writtenPaths = fsStub.writeFileSync.getCalls().map(c => c.args[0])
      expect(writtenPaths.some(p => p.endsWith('custom-host.key'))).to.equal(true)
      expect(writtenPaths.some(p => p.endsWith('custom-host.crt'))).to.equal(true)
    })

    it('should use a custom tlsRootCaDir from config', async function () {
      getConfigStub.returns({ tlsRootCaDir: '/custom-ca' })
      fsStub.existsSync.callsFake(p => {
        if (p === '/cfg/tls-certs') return true
        if (p === '/custom-ca') return true
        if (p === '/custom-ca/ca.crt' || p === '/custom-ca/ca.key') return true
        return false
      })

      await httpsModule.createCert({ serviceUrl: 'https://web.local' })

      const readPaths = fsStub.readFileSync.getCalls().map(c => c.args[0])
      expect(readPaths.some(p => p === '/custom-ca/ca.crt')).to.equal(true)
      expect(readPaths.some(p => p === '/custom-ca/ca.key')).to.equal(true)
    })

    it('should wrap signing errors in NavyError', async function () {
      fsStub.existsSync.callsFake(p => {
        if (p === '/cfg/tls-certs') return true
        if (p === '/default-ca-dir') return true
        if (p === '/default-ca-dir/ca.crt' || p === '/default-ca-dir/ca.key') return true
        return false
      })

      const cert = pkiStub.createCertificate()
      cert.sign = sandbox.stub().throws(new Error('sign fail'))
      pkiStub.createCertificate.returns(cert)

      let caught
      try {
        await httpsModule.createCert({ serviceUrl: 'https://web.local' })
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.instanceof(NavyError)
    })

  })

})
