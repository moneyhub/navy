/* eslint-env mocha */

import { expect } from 'chai'
import nock from 'nock'
import getToken from '../get-token'

describe('get-token', function () {

  afterEach(function () {
    nock.cleanAll()
  })

  it('should call the realm with service+scope and return the token from the JSON body', async function () {
    const scope = nock('https://auth.docker.io')
      .get('/token')
      .query({ service: 'registry.docker.io', scope: 'repository:library/node:pull' })
      .matchHeader('authorization', 'Basic dXNlcjpwYXNz')
      .reply(200, { token: 'abc123' })

    const token = await getToken({
      realm: 'https://auth.docker.io/token',
      service: 'registry.docker.io',
      scope: 'repository:library/node:pull',
    }, {
      headers: { Authorization: 'Basic dXNlcjpwYXNz' },
    })

    expect(token).to.equal('abc123')
    scope.done()
  })

  it('should throw "Invalid authentication" when the realm responds 401', async function () {
    nock('https://auth.docker.io')
      .get('/token')
      .query(true)
      .reply(401, {})

    let caught
    try {
      await getToken({
        realm: 'https://auth.docker.io/token',
        service: 'reg',
        scope: 'sc',
      }, { headers: {} })
    } catch (err) {
      caught = err
    }

    expect(caught).to.be.an('error')
    expect(caught.message).to.equal('Invalid authentication')
  })

  it('should pick only the Authorization header from the supplied headers (no other headers leak)', async function () {
    nock('https://auth.example.com')
      .get('/token')
      .query(true)
      .matchHeader('authorization', 'Basic xyz')
      .reply(200, { token: 't' })

    const token = await getToken({
      realm: 'https://auth.example.com/token',
      service: 'svc',
      scope: 'sc',
    }, {
      headers: {
        Authorization: 'Basic xyz',
        Cookie: 'should-not-be-sent',
        'X-Custom': 'should-not-be-sent',
      },
    })

    expect(token).to.equal('t')
  })

})
