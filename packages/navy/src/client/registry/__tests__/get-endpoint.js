/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import nock from 'nock'
import proxyquire from 'proxyquire'

function loadModule({ getCredentials, getToken } = {}) {
  return proxyquire.noCallThru()('../get-endpoint', {
    './get-credentials': getCredentials || sinon.stub().resolves({ username: 'u', password: 'p' }),
    './get-token': getToken || sinon.stub().resolves('the-token'),
  })
}

describe('get-endpoint', function () {

  afterEach(function () {
    nock.cleanAll()
  })

  it('should return the response when the registry replies 200', async function () {
    const body = { schemaVersion: 2 }
    nock('https://reg.example.com')
      .get('/v2/library/node/manifests/latest')
      .reply(200, body)

    const getEndpoint = loadModule()
    const response = await getEndpoint({
      registry: 'reg.example.com',
      endpoint: 'library/node/manifests/latest',
    })

    expect(response.status).to.equal(200)
    expect(await response.json()).to.eql(body)
  })

  it('should throw "Operation not found" when the registry returns 404', async function () {
    nock('https://reg.example.com')
      .get('/v2/missing')
      .reply(404, { errors: [] })

    const getEndpoint = loadModule()
    let caught
    try {
      await getEndpoint({ registry: 'reg.example.com', endpoint: 'missing' })
    } catch (err) {
      caught = err
    }

    expect(caught).to.be.an('error')
    expect(caught.message).to.equal('Operation not found')
  })

  it('should retry with a Bearer token when the response is 401 with a Bearer challenge', async function () {
    nock('https://reg.example.com')
      .get('/v2/secret')
      .reply(401, '', {
        'WWW-Authenticate': 'Bearer realm="https://auth.example.com/token",service="reg.example.com",scope="repository:secret:pull"',
      })
      .get('/v2/secret')
      .matchHeader('authorization', 'Bearer the-token')
      .reply(200, { ok: true })

    const getToken = sinon.stub().resolves('the-token')
    const getEndpoint = loadModule({ getToken })
    const response = await getEndpoint({ registry: 'reg.example.com', endpoint: 'secret' })

    expect(response.status).to.equal(200)
    expect(await response.json()).to.eql({ ok: true })
    expect(getToken.calledOnce).to.equal(true)
  })

  it('should throw "Access denied" when the bearer-token retry still returns 401', async function () {
    nock('https://reg.example.com')
      .get('/v2/secret')
      .reply(401, '', {
        'WWW-Authenticate': 'Bearer realm="https://auth.example.com/token",service="reg.example.com",scope="repository:secret:pull"',
      })
      .get('/v2/secret')
      .reply(401, '')

    const getEndpoint = loadModule()
    let caught
    try {
      await getEndpoint({ registry: 'reg.example.com', endpoint: 'secret' })
    } catch (err) {
      caught = err
    }

    expect(caught.message).to.equal('Access denied')
  })

  it('should throw "Invalid authentication" for a Basic challenge', async function () {
    nock('https://reg.example.com')
      .get('/v2/needs-basic')
      .reply(401, '', { 'WWW-Authenticate': 'Basic realm="reg"' })

    const getEndpoint = loadModule()
    let caught
    try {
      await getEndpoint({ registry: 'reg.example.com', endpoint: 'needs-basic' })
    } catch (err) {
      caught = err
    }

    expect(caught.message).to.equal('Invalid authentication')
  })

  it('should throw "Invalid authentication" for an unknown auth scheme', async function () {
    nock('https://reg.example.com')
      .get('/v2/weird')
      .reply(401, '', { 'WWW-Authenticate': 'Digest realm="reg"' })

    const getEndpoint = loadModule()
    let caught
    try {
      await getEndpoint({ registry: 'reg.example.com', endpoint: 'weird' })
    } catch (err) {
      caught = err
    }

    expect(caught.message).to.equal('Invalid authentication')
  })

})
