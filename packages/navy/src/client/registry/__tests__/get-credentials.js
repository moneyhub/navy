/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import * as execAsyncModule from '../../../util/exec-async'
import { DEFAULT_REGISTRY, DEFAULT_REGISTRY_AUTH } from '../../../domain/container-image'
import getAuthenticationForRegistry from '../get-credentials'

describe('get-credentials', function () {

  let sandbox

  beforeEach(function () {
    sandbox = sinon.createSandbox()
  })

  afterEach(function () {
    sandbox.restore()
  })

  it('should call docker-credential-desktop with the default auth URL when registry is the default registry', async function () {
    const execStub = sandbox.stub(execAsyncModule, 'execAsync')
      .resolves(JSON.stringify({ Username: 'u', Secret: 's' }))

    const result = await getAuthenticationForRegistry(DEFAULT_REGISTRY)

    expect(result).to.eql({ username: 'u', password: 's' })
    const args = execStub.firstCall.args
    expect(args[0]).to.equal('echo')
    expect(args[1]).to.include(DEFAULT_REGISTRY_AUTH)
    expect(args[1]).to.include('docker-credential-desktop')
    expect(args[1]).to.include('get')
  })

  it('should pass the registry hostname directly when not the default registry', async function () {
    const execStub = sandbox.stub(execAsyncModule, 'execAsync')
      .resolves(JSON.stringify({ Username: 'alice', Secret: 'pw' }))

    const result = await getAuthenticationForRegistry('myregistry.local:5000')

    expect(result).to.eql({ username: 'alice', password: 'pw' })
    expect(execStub.firstCall.args[1]).to.include('myregistry.local:5000')
  })

  it('should return empty credentials when execAsync rejects', async function () {
    sandbox.stub(execAsyncModule, 'execAsync').rejects(new Error('not installed'))

    expect(await getAuthenticationForRegistry('any')).to.eql({ username: '', password: '' })
  })

  it('should return empty credentials when stdout is not valid JSON', async function () {
    sandbox.stub(execAsyncModule, 'execAsync').resolves('not-json')

    expect(await getAuthenticationForRegistry('any')).to.eql({ username: '', password: '' })
  })

})
