/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import * as serviceHostModule from '../../util/service-host'
import * as httpsModule from '../../util/https'
import addServiceProxyConfig from '../add-service-proxy-config'

function makeNavy({ navyFile = null, externalIP = '10.0.0.1' } = {}) {
  return {
    name: 'env',
    normalisedName: 'env',
    getNavyFile: sinon.stub().resolves(navyFile),
    externalIP: sinon.stub().resolves(externalIP),
  }
}

describe('add-service-proxy-config middleware', function () {

  let sandbox
  let createCertStub
  let createHostStub

  beforeEach(function () {
    sandbox = sinon.createSandbox()
    createCertStub = sandbox.stub(httpsModule, 'createCert').resolves()
    createHostStub = sandbox.stub(serviceHostModule, 'createHostForService')
      .callsFake(async (svc, navyName) => `${svc}.${navyName}.test.local`)
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('factory', function () {

    it('should return an async middleware function when invoked with a navy', function () {
      const fn = addServiceProxyConfig(makeNavy())
      expect(fn).to.be.a('function')
    })

  })

  describe('auto-proxy of port 80', function () {

    it('should add VIRTUAL_HOST/VIRTUAL_PORT for services exposing port 80 by default', async function () {
      const middleware = addServiceProxyConfig(makeNavy())
      const config = {
        services: {
          web: { ports: ['80:80'] },
        },
      }

      const result = await middleware(config, {})

      expect(result.services.web.environment.VIRTUAL_HOST).to.equal('web.env.test.local')
      expect(result.services.web.environment.VIRTUAL_PORT).to.equal(80)
    })

    it('should not auto-proxy services that do not expose port 80', async function () {
      const middleware = addServiceProxyConfig(makeNavy())
      const config = {
        services: {
          worker: { ports: ['8080:8080'] },
        },
      }

      const result = await middleware(config, {})

      expect(result.services.worker).to.eql({ ports: ['8080:8080'] })
    })

    it('should not auto-proxy services that have no ports declared', async function () {
      const middleware = addServiceProxyConfig(makeNavy())
      const config = {
        services: {
          worker: {},
        },
      }

      const result = await middleware(config, {})

      expect(result.services.worker).to.eql({})
    })

  })

  describe('explicit httpProxy config in navyFile', function () {

    it('should use the explicit httpProxy config to set VIRTUAL_HOST and VIRTUAL_PORT', async function () {
      const navy = makeNavy({
        navyFile: { httpProxy: { api: { port: 3000 } } },
      })
      const middleware = addServiceProxyConfig(navy)

      const result = await middleware({
        services: {
          api: { ports: ['3000:3000'] },
        },
      }, {})

      expect(result.services.api.environment.VIRTUAL_PORT).to.equal(3000)
      expect(result.services.api.environment.VIRTUAL_HOST).to.equal('api.env.test.local')
    })

    it('should issue a TLS cert when proxyConfig.enableHttps is set', async function () {
      const navy = makeNavy({
        navyFile: { httpProxy: { api: { port: 3000, enableHttps: true } } },
      })
      const middleware = addServiceProxyConfig(navy)

      await middleware({ services: { api: {} } }, {})

      expect(createCertStub.calledOnce).to.equal(true)
      expect(createCertStub.firstCall.args[0]).to.eql({ hostName: 'api.env.test.local' })
    })

    it('should not issue a TLS cert when proxyConfig is implicit (no enableHttps)', async function () {
      const middleware = addServiceProxyConfig(makeNavy())

      await middleware({ services: { web: { ports: ['80:80'] } } }, {})

      expect(createCertStub.called).to.equal(false)
    })

  })

  describe('httpProxyAutoPorts navyFile config', function () {

    it('should auto-proxy a different port when configured via httpProxyAutoPorts', async function () {
      const navy = makeNavy({ navyFile: { httpProxyAutoPorts: ['3000'] } })
      const middleware = addServiceProxyConfig(navy)

      const result = await middleware({
        services: {
          api: { ports: ['3000:3000'] },
        },
      }, {})

      expect(result.services.api.environment.VIRTUAL_PORT).to.equal(3000)
    })

    it('should fall back to ["80"] when httpProxyAutoPorts is not an array', async function () {
      const navy = makeNavy({ navyFile: { httpProxyAutoPorts: 'not-an-array' } })
      const middleware = addServiceProxyConfig(navy)

      const result = await middleware({
        services: {
          web: { ports: ['80:80'] },
        },
      }, {})

      expect(result.services.web.environment.VIRTUAL_PORT).to.equal(80)
    })

  })

  describe('port matching forms', function () {

    it('should match a numeric port equal to the auto port', async function () {
      const middleware = addServiceProxyConfig(makeNavy())
      const result = await middleware({ services: { web: { ports: [80] } } }, {})
      // eslint-disable-next-line no-unused-expressions
      expect(result.services.web.environment).to.exist
    })

    it('should match a "80/tcp" protocol-suffixed port', async function () {
      const middleware = addServiceProxyConfig(makeNavy())
      const result = await middleware({ services: { web: { ports: ['80/tcp'] } } }, {})
      // eslint-disable-next-line no-unused-expressions
      expect(result.services.web.environment).to.exist
    })

    it('should match a port object with a target field equal to the auto port', async function () {
      const middleware = addServiceProxyConfig(makeNavy())
      const result = await middleware({ services: { web: { ports: [{ target: 80, published: 8080 }] } } }, {})
      // eslint-disable-next-line no-unused-expressions
      expect(result.services.web.environment).to.exist
    })

  })

  describe('environment merge', function () {

    it('should not overwrite existing env vars with VIRTUAL_HOST/VIRTUAL_PORT', async function () {
      const middleware = addServiceProxyConfig(makeNavy())

      const result = await middleware({
        services: {
          web: {
            ports: ['80:80'],
            environment: { VIRTUAL_HOST: 'preset.host', OTHER: 'x' },
          },
        },
      }, {})

      expect(result.services.web.environment.VIRTUAL_HOST).to.equal('preset.host')
      expect(result.services.web.environment.OTHER).to.equal('x')
    })

  })

  it('should preserve other top-level config keys', async function () {
    const middleware = addServiceProxyConfig(makeNavy())

    const result = await middleware({
      version: '3.7',
      services: { web: { ports: ['80:80'] } },
      networks: { default: {} },
    }, {})

    expect(result.version).to.equal('3.7')
    expect(result.networks).to.eql({ default: {} })
  })

  it('should not call externalIP/createHostForService for services without proxy config', async function () {
    const middleware = addServiceProxyConfig(makeNavy())

    await middleware({
      services: { worker: { ports: ['9000:9000'] } },
    }, {})

    expect(createHostStub.called).to.equal(false)
  })

})
