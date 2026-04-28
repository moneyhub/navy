/* eslint-env mocha */

import { expect } from 'chai'
import { resolveProxyImage } from '../http-proxy'

describe('resolveProxyImage', function () {

  afterEach(function () {
    delete process.env.NAVY_HTTP_PROXY_IMAGE
  })

  it('should return the default image when no env var or navyFile config is provided', function () {
    expect(resolveProxyImage()).to.equal('navycloud/navy-proxy')
    expect(resolveProxyImage(null)).to.equal('navycloud/navy-proxy')
    expect(resolveProxyImage(undefined)).to.equal('navycloud/navy-proxy')
  })

  it('should return the default image when navyFile has no httpProxyImage', function () {
    expect(resolveProxyImage({})).to.equal('navycloud/navy-proxy')
    expect(resolveProxyImage({ plugins: [] })).to.equal('navycloud/navy-proxy')
  })

  it('should use httpProxyImage from navyFile when set', function () {
    const navyFile = { httpProxyImage: 'myregistry/custom-proxy:latest' }
    expect(resolveProxyImage(navyFile)).to.equal('myregistry/custom-proxy:latest')
  })

  it('should use NAVY_HTTP_PROXY_IMAGE env var when set', function () {
    process.env.NAVY_HTTP_PROXY_IMAGE = 'envregistry/env-proxy:v2'
    expect(resolveProxyImage()).to.equal('envregistry/env-proxy:v2')
  })

  it('should give NAVY_HTTP_PROXY_IMAGE env var precedence over navyFile httpProxyImage', function () {
    process.env.NAVY_HTTP_PROXY_IMAGE = 'envregistry/env-proxy:v2'
    const navyFile = { httpProxyImage: 'myregistry/custom-proxy:latest' }
    expect(resolveProxyImage(navyFile)).to.equal('envregistry/env-proxy:v2')
  })

  it('should give NAVY_HTTP_PROXY_IMAGE env var precedence over default', function () {
    process.env.NAVY_HTTP_PROXY_IMAGE = 'override/image:tag'
    expect(resolveProxyImage(null)).to.equal('override/image:tag')
  })

  it('should fall back to default when httpProxyImage is an empty string', function () {
    expect(resolveProxyImage({ httpProxyImage: '' })).to.equal('navycloud/navy-proxy')
  })

  it('should fall back to default when NAVY_HTTP_PROXY_IMAGE is an empty string', function () {
    process.env.NAVY_HTTP_PROXY_IMAGE = ''
    expect(resolveProxyImage()).to.equal('navycloud/navy-proxy')
  })

})
