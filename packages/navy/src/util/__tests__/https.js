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
  let certObj

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
      copyFileSync: sandbox.stub(),
    }

    const caCertFromPem = {
      subject: { attributes: [{ name: 'commonName', value: 'ca' }] },
      generateSubjectKeyIdentifier: sandbox.stub().returns({ getBytes: () => 'ca-subject-key-id' }),
    }

    certObj = {
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
      certificateFromPem: sandbox.stub().returns(caCertFromPem),
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

    it('should prefer the parsed hostname over the raw certName segment', async function () {
      fsStub.existsSync.callsFake(p => {
        if (p === '/cfg/tls-certs') return true
        if (p === '/default-ca-dir') return true
        if (p === '/default-ca-dir/ca.crt' || p === '/default-ca-dir/ca.key') return true
        return false
      })

      await httpsModule.createCert({ serviceUrl: 'https://tls-host.example.com:8443/app' })

      expect(certObj.setSubject.firstCall.args[0][0].value).to.equal('tls-host.example.com')
    })

    it('should keep certName when serviceUrl is not a valid URL', async function () {
      fsStub.existsSync.callsFake(p => {
        if (p === '/cfg/tls-certs') return true
        if (p === '/default-ca-dir') return true
        if (p === '/default-ca-dir/ca.crt' || p === '/default-ca-dir/ca.key') return true
        return false
      })

      await httpsModule.createCert({ serviceUrl: 'https://bad[' })

      const writtenPaths = fsStub.writeFileSync.getCalls().map(c => c.args[0])
      expect(writtenPaths.some(p => p.endsWith('bad[.key'))).to.equal(true)
    })

    it('should fall back to certName when serviceUrl has no hostname', async function () {
      fsStub.existsSync.callsFake(p => {
        if (p === '/cfg/tls-certs') return true
        if (p === '/default-ca-dir') return true
        if (p === '/default-ca-dir/ca.crt' || p === '/default-ca-dir/ca.key') return true
        return false
      })

      await httpsModule.createCert({ serviceUrl: 'https://?q=1' })

      expect(certObj.setSubject.firstCall.args[0][0].value).to.equal('?q=1')
    })

    it('should wrap non-Error signing failures in NavyError', async function () {
      fsStub.existsSync.callsFake(p => {
        if (p === '/cfg/tls-certs') return true
        if (p === '/default-ca-dir') return true
        if (p === '/default-ca-dir/ca.crt' || p === '/default-ca-dir/ca.key') return true
        return false
      })
      pkiStub.certificateFromPem.callsFake(() => {
        const failure = 'string failure'
        throw failure
      })

      let caught
      try {
        await httpsModule.createCert({ serviceUrl: 'https://web.local' })
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.instanceof(NavyError)
      expect(caught.message).to.equal('string failure')
    })

    it('should use IP SAN when hostName is an IP address', async function () {
      fsStub.existsSync.callsFake(p => {
        if (p === '/cfg/tls-certs') return true
        if (p === '/default-ca-dir') return true
        if (p === '/default-ca-dir/ca.crt' || p === '/default-ca-dir/ca.key') return true
        return false
      })

      await httpsModule.createCert({ hostName: '127.0.0.1' })

      const extensions = certObj.setExtensions.firstCall.args[0]
      const sanExt = extensions.find(ext => ext.name === 'subjectAltName')
      expect(sanExt.altNames).to.eql([{ type: 7, ip: '127.0.0.1' }])
    })

  })

  describe('hostNameFromIssueUrl', function () {

    it('should throw when the URL is empty', function () {
      expect(() => httpsModule.hostNameFromIssueUrl('')).to.throw(/must not be empty/)
      expect(() => httpsModule.hostNameFromIssueUrl('   ')).to.throw(/must not be empty/)
    })

    it('should prepend https when no scheme is supplied', function () {
      expect(httpsModule.hostNameFromIssueUrl('example.local')).to.equal('example.local')
    })

    it('should accept an explicit scheme', function () {
      expect(httpsModule.hostNameFromIssueUrl('http://example.local')).to.equal('example.local')
    })

    it('should throw when the URL cannot be parsed', function () {
      expect(() => httpsModule.hostNameFromIssueUrl('http://')).to.throw(/Invalid URL/)
    })

    it('should throw when no hostname can be determined', function () {
      expect(() => httpsModule.hostNameFromIssueUrl('file:///tmp/cert.crt')).to.throw(
        /Could not determine a hostname/
      )
    })

  })

  describe('issueLeafCertForUrl', function () {

    it('should write cert, key, and CA copy files to the output dir', async function () {
      fsStub.existsSync.callsFake(p => {
        if (p === '/default-ca-dir') return true
        if (p === '/default-ca-dir/ca.crt' || p === '/default-ca-dir/ca.key') return true
        return false
      })

      const result = await httpsModule.issueLeafCertForUrl('https://issued.local', '/out/certs')

      expect(fsStub.mkdirSync.calledWith('/out/certs', { recursive: true })).to.equal(true)
      expect(fsStub.writeFileSync.callCount).to.equal(2)
      expect(fsStub.copyFileSync.calledOnce).to.equal(true)
      expect(result.certPath).to.equal('/out/certs/issued.local.crt')
      expect(result.keyPath).to.equal('/out/certs/issued.local.key')
      expect(result.caCopyPath).to.equal('/out/certs/navy-root-ca.crt')
    })

    it('should sanitise unsafe characters in the output file base name', async function () {
      fsStub.existsSync.callsFake(p => {
        if (p === '/default-ca-dir') return true
        if (p === '/default-ca-dir/ca.crt' || p === '/default-ca-dir/ca.key') return true
        return false
      })

      const result = await httpsModule.issueLeafCertForUrl('https://[::1]', '/out')

      expect(result.certPath).to.equal('/out/___1_.crt')
      expect(result.keyPath).to.equal('/out/___1_.key')
    })

    it('should wrap non-Error build failures in NavyError', async function () {
      fsStub.existsSync.callsFake(p => {
        if (p === '/default-ca-dir') return true
        if (p === '/default-ca-dir/ca.crt' || p === '/default-ca-dir/ca.key') return true
        return false
      })
      pkiStub.certificateFromPem.callsFake(() => {
        const failure = 'forge broke'
        throw failure
      })

      let caught
      try {
        await httpsModule.issueLeafCertForUrl('https://issued.local', '/out')
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.instanceof(NavyError)
      expect(caught.message).to.equal('forge broke')
    })

    it('should wrap build failures in NavyError', async function () {
      fsStub.existsSync.callsFake(p => {
        if (p === '/default-ca-dir') return true
        if (p === '/default-ca-dir/ca.crt' || p === '/default-ca-dir/ca.key') return true
        return false
      })
      pkiStub.certificateFromPem.throws(new Error('forge broke'))

      let caught
      try {
        await httpsModule.issueLeafCertForUrl('https://issued.local', '/out')
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.instanceof(NavyError)
      expect(caught.message).to.equal('forge broke')
    })

    it('should use IP SAN when issuing for an IP address URL', async function () {
      fsStub.existsSync.callsFake(p => {
        if (p === '/default-ca-dir') return true
        if (p === '/default-ca-dir/ca.crt' || p === '/default-ca-dir/ca.key') return true
        return false
      })

      await httpsModule.issueLeafCertForUrl('https://192.168.1.10', '/out')

      const extensions = certObj.setExtensions.firstCall.args[0]
      const sanExt = extensions.find(ext => ext.name === 'subjectAltName')
      expect(sanExt.altNames).to.eql([{ type: 7, ip: '192.168.1.10' }])
    })

  })

})
