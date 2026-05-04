/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import { NavyError } from '../../errors'

describe('cli/https', function () {

  let sandbox
  let getNavyStub
  let navyStub
  let getConfigStub
  let getConfigDirStub
  let DEFAULT_TLS_ROOT_CA_DIR
  let reconfigureHTTPProxyStub
  let createCertStub
  let generateRootCaStub
  let removeCertStub
  let issueLeafCertForUrlStub
  let installRootCaToTrustStoreStub
  let fsStub
  let consoleLogStub
  let httpsCli

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    navyStub = {
      isInitialised: sandbox.stub().resolves(true),
      getNavyFile: sandbox.stub().resolves({ ports: 'whatever' }),
      ensurePluginsLoaded: sandbox.stub().resolves(),
      getAvailableServiceNames: sandbox.stub().resolves(['web', 'api']),
      url: sandbox.stub().resolves('https://web.local'),
    }
    getNavyStub = sandbox.stub().resolves(navyStub)

    getConfigStub = sandbox.stub().returns({})
    getConfigDirStub = sandbox.stub().returns('/cfg')
    DEFAULT_TLS_ROOT_CA_DIR = '/default-ca-dir'

    reconfigureHTTPProxyStub = sandbox.stub().resolves()
    createCertStub = sandbox.stub().resolves()
    generateRootCaStub = sandbox.stub().resolves()
    removeCertStub = sandbox.stub().resolves()
    issueLeafCertForUrlStub = sandbox.stub().resolves({
      certPath: '/out/host.crt',
      keyPath: '/out/host.key',
      caCopyPath: '/out/navy-root-ca.crt',
    })
    installRootCaToTrustStoreStub = sandbox.stub()

    fsStub = {
      existsSync: sandbox.stub().returns(true),
      readdirSync: sandbox.stub().returns(['web.local.crt', 'api.local.crt', 'something.txt']),
    }

    consoleLogStub = sandbox.stub(console, 'log')

    httpsCli = proxyquire.noCallThru()('../https', {
      '../errors': { NavyError },
      '../navy': { getNavy: getNavyStub },
      '../config': {
        getConfig: getConfigStub,
        getConfigDir: getConfigDirStub,
        DEFAULT_TLS_ROOT_CA_DIR,
      },
      '../http-proxy': { reconfigureHTTPProxy: reconfigureHTTPProxyStub },
      '../util/https': {
        createCert: createCertStub,
        generateRootCa: generateRootCaStub,
        removeCert: removeCertStub,
        issueLeafCertForUrl: issueLeafCertForUrlStub,
      },
      '../util/install-root-ca': {
        installRootCaToTrustStore: installRootCaToTrustStoreStub,
      },
      fs: fsStub,
    })
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('default export', function () {

    describe('disable mode', function () {

      it('should remove the cert and reconfigure the proxy', async function () {
        await httpsCli([], { navy: 'env-1', disable: 'web' })

        expect(removeCertStub.calledOnce).to.equal(true)
        expect(reconfigureHTTPProxyStub.calledOnce).to.equal(true)
        expect(reconfigureHTTPProxyStub.firstCall.args[0].restart).to.equal(true)
      })

      it('should pass navyFile to reconfigureHTTPProxy when the navy is initialised', async function () {
        navyStub.isInitialised.resolves(true)
        navyStub.getNavyFile.resolves({ foo: 'bar' })

        await httpsCli([], { navy: 'env-1', disable: 'web' })

        expect(reconfigureHTTPProxyStub.firstCall.args[0].navyFile).to.eql({ foo: 'bar' })
      })

      it('should pass undefined navyFile when the navy is not initialised', async function () {
        navyStub.isInitialised.resolves(false)

        await httpsCli([], { navy: 'env-1', disable: 'web' })

        expect(reconfigureHTTPProxyStub.firstCall.args[0].navyFile).to.equal(undefined)
        expect(navyStub.getNavyFile.called).to.equal(false)
      })

      it('should print a confirmation message naming the disabled service', async function () {
        await httpsCli([], { navy: 'env-1', disable: 'web' })

        const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join('\n')
        expect(printed).to.contain('web')
        expect(printed).to.contain('disabled')
      })

    })

    describe('list mode (no services and no disable)', function () {

      it('should return early when the certs path does not exist', async function () {
        fsStub.existsSync.returns(false)

        await httpsCli([], { navy: 'env-1' })

        expect(fsStub.readdirSync.called).to.equal(false)
        expect(generateRootCaStub.called).to.equal(false)
      })

      it('should print only .crt urls when listing', async function () {
        fsStub.existsSync.callsFake(p => p === '/cfg/tls-certs')

        await httpsCli([], { navy: 'env-1' })

        const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join('\n')
        expect(printed).to.contain('https://web.local')
        expect(printed).to.contain('https://api.local')
        expect(printed).to.not.contain('something.txt')
      })

      it('should also handle a null services arg as list mode', async function () {
        fsStub.existsSync.returns(false)

        await httpsCli(null, { navy: 'env-1' })

        expect(generateRootCaStub.called).to.equal(false)
      })

    })

    describe('enable mode', function () {

      it('should generate the root CA when the CA cert/key are missing', async function () {
        fsStub.existsSync.callsFake(p => !p.endsWith('ca.crt'))

        await httpsCli(['web'], { navy: 'env-1' })

        expect(generateRootCaStub.calledOnce).to.equal(true)
      })

      it('should skip generating the root CA when ca.crt and ca.key both exist', async function () {
        fsStub.existsSync.returns(true)

        await httpsCli(['web'], { navy: 'env-1' })

        expect(generateRootCaStub.called).to.equal(false)
      })

      it('should create a cert for each available service', async function () {
        await httpsCli(['web', 'api'], { navy: 'env-1' })

        expect(createCertStub.callCount).to.equal(2)
      })

      it('should skip services that are not in the available service list', async function () {
        await httpsCli(['web', 'unknown'], { navy: 'env-1' })

        expect(createCertStub.callCount).to.equal(1)
        const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join('\n')
        expect(printed).to.contain('unknown')
        expect(printed).to.contain('not found')
      })

      it('should rethrow as NavyError when createCert fails', async function () {
        createCertStub.rejects(new Error('cert error'))

        let caught
        try {
          await httpsCli(['web'], { navy: 'env-1' })
        } catch (err) {
          caught = err
        }

        expect(caught).to.be.instanceof(NavyError)
        expect(caught.message).to.contain('Could not generate TLS cert')
      })

      it('should reconfigure HTTPS proxy after enabling and print services list', async function () {
        await httpsCli(['web', 'api'], { navy: 'env-1' })

        expect(reconfigureHTTPProxyStub.calledOnce).to.equal(true)
        const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join('\n')
        expect(printed).to.contain('web')
        expect(printed).to.contain('api')
        expect(printed).to.contain('HTTPS')
      })

      it('should use a custom tlsRootCaDir when set in config', async function () {
        getConfigStub.returns({ tlsRootCaDir: '/custom-ca' })
        fsStub.existsSync.callsFake(p => p === '/custom-ca/ca.crt' || p === '/custom-ca/ca.key')

        await httpsCli(['web'], { navy: 'env-1' })

        const checkedPaths = fsStub.existsSync.getCalls().map(c => c.args[0])
        expect(checkedPaths.some(p => p === '/custom-ca/ca.crt')).to.equal(true)
      })

      it('should accept a single string service name', async function () {
        await httpsCli('web', { navy: 'env-1' })

        expect(createCertStub.callCount).to.equal(1)
      })

      it('should ignore non-string entries in a services array', async function () {
        await httpsCli(['web', '', null, 42, 'api'], { navy: 'env-1' })

        expect(createCertStub.callCount).to.equal(2)
      })

      it('should treat unsupported service arg types as an empty list', async function () {
        fsStub.existsSync.returns(false)

        await httpsCli(42, { navy: 'env-1' })

        expect(createCertStub.called).to.equal(false)
        expect(generateRootCaStub.called).to.equal(false)
      })

      it('should treat an empty string service arg as list mode', async function () {
        fsStub.existsSync.returns(false)

        await httpsCli('', { navy: 'env-1' })

        expect(createCertStub.called).to.equal(false)
      })

    })

    describe('validation', function () {

      async function expectNavyError(promise, messagePattern) {
        let caught
        try {
          await promise
        } catch (err) {
          caught = err
        }
        expect(caught).to.be.instanceof(NavyError)
        expect(caught.message).to.match(messagePattern)
      }

      it('should reject combining disable with setup', async function () {
        await expectNavyError(httpsCli([], { disable: 'web', setup: true }), /cannot be combined/)
      })

      it('should reject combining disable with all', async function () {
        await expectNavyError(httpsCli([], { disable: 'web', all: true }), /cannot be combined/)
      })

      it('should reject combining disable with issue', async function () {
        await expectNavyError(httpsCli([], { disable: 'web', issue: 'https://host' }), /cannot be combined/)
      })

      it('should reject combining setup with all', async function () {
        await expectNavyError(httpsCli([], { setup: true, all: true }), /Use only one/)
      })

      it('should reject combining setup with issue', async function () {
        await expectNavyError(httpsCli([], { setup: true, issue: 'https://host' }), /Use only one/)
      })

      it('should reject combining all with issue', async function () {
        await expectNavyError(httpsCli([], { all: true, issue: 'https://host' }), /Use only one/)
      })

    })

    describe('setup mode', function () {

      it('should generate the root CA and install it in the trust store', async function () {
        getConfigStub.returns({ tlsRootCaDir: '/custom-ca' })

        await httpsCli([], { setup: true })

        expect(generateRootCaStub.calledOnce).to.equal(true)
        expect(installRootCaToTrustStoreStub.calledOnce).to.equal(true)
        expect(installRootCaToTrustStoreStub.firstCall.args[0]).to.equal('/custom-ca/ca.crt')
        const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join('\n')
        expect(printed).to.contain('trust store')
      })

      it('should reject service names with setup', async function () {
        let caught
        try {
          await httpsCli(['web'], { setup: true })
        } catch (err) {
          caught = err
        }

        expect(caught).to.be.instanceof(NavyError)
        expect(caught.message).to.contain('does not take service names')
      })

    })

    describe('all mode', function () {

      it('should enable HTTPS for every available service', async function () {
        await httpsCli([], { all: true, navy: 'env-1' })

        expect(createCertStub.callCount).to.equal(2)
        expect(reconfigureHTTPProxyStub.calledOnce).to.equal(true)
        const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join('\n')
        expect(printed).to.contain('web')
        expect(printed).to.contain('api')
      })

      it('should generate the root CA when cert files are missing', async function () {
        fsStub.existsSync.callsFake(p => !p.endsWith('ca.crt') && !p.endsWith('ca.key'))

        await httpsCli([], { all: true, navy: 'env-1' })

        expect(generateRootCaStub.calledOnce).to.equal(true)
      })

      it('should warn and return when no services are available', async function () {
        navyStub.getAvailableServiceNames.resolves([])

        await httpsCli([], { all: true, navy: 'env-1' })

        expect(createCertStub.called).to.equal(false)
        const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join('\n')
        expect(printed).to.contain('No services found')
      })

      it('should reject service names with all', async function () {
        let caught
        try {
          await httpsCli(['web'], { all: true })
        } catch (err) {
          caught = err
        }

        expect(caught).to.be.instanceof(NavyError)
        expect(caught.message).to.contain('does not take service names')
      })

    })

    describe('issue mode', function () {

      it('should issue a leaf cert for an external URL', async function () {
        const cwdStub = sandbox.stub(process, 'cwd').returns('/current')

        await httpsCli([], { issue: 'https://external.local', navy: 'env-1' })

        expect(issueLeafCertForUrlStub.calledOnce).to.equal(true)
        expect(issueLeafCertForUrlStub.firstCall.args).to.eql(['https://external.local', '/current'])
        const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join('\n')
        expect(printed).to.contain('/out/host.crt')
        expect(printed).to.contain('/out/host.key')
        expect(printed).to.contain('/out/navy-root-ca.crt')

        cwdStub.restore()
      })

      it('should honour issueOut when provided', async function () {
        await httpsCli([], { issue: 'https://external.local', issueOut: '/custom/out' })

        expect(issueLeafCertForUrlStub.firstCall.args[1]).to.equal('/custom/out')
      })

      it('should reject service names with issue', async function () {
        let caught
        try {
          await httpsCli(['web'], { issue: 'https://external.local' })
        } catch (err) {
          caught = err
        }

        expect(caught).to.be.instanceof(NavyError)
        expect(caught.message).to.contain('does not take service names')
      })

    })

  })

})
