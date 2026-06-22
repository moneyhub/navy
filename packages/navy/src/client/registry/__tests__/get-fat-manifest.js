/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import { MEDIA_TYPES } from '../../../domain/oci-api-specification'

function fakeResponse({ digest, body }) {
  return {
    headers: { get: name => name === 'docker-content-digest' ? digest : null },
    json: async () => body,
  }
}

function loadModule(getEndpointStub) {
  return proxyquire.noCallThru()('../get-fat-manifest', {
    './get-endpoint': getEndpointStub,
  })
}

describe('get-fat-manifest', function () {

  it('should call getEndpoint with the manifest path and the FAT_MANIFEST accept header', async function () {
    const getEndpoint = sinon.stub().resolves(fakeResponse({ digest: 'sha256:abc', body: { manifests: [] } }))
    const getFatManifest = loadModule(getEndpoint)

    const result = await getFatManifest({
      repository: 'library/node',
      registry: 'registry-1.docker.io',
      tag: 'lts',
    })

    expect(result).to.eql({ tag: 'sha256:abc', data: { manifests: [] } })
    expect(getEndpoint.calledOnce).to.equal(true)
    const args = getEndpoint.firstCall.args[0]
    expect(args.endpoint).to.equal('library/node/manifests/lts')
    expect(args.options.headers.Accept).to.equal(MEDIA_TYPES.FAT_MANIFEST)
    expect(args.allowUnauthorizedRequest).to.equal(false)
    expect(args.registry).to.equal('registry-1.docker.io')
  })

  it('should propagate allowUnauthorizedRequest=true', async function () {
    const getEndpoint = sinon.stub().resolves(fakeResponse({ digest: 'd', body: {} }))
    const getFatManifest = loadModule(getEndpoint)

    await getFatManifest({
      allowUnauthorizedRequest: true,
      repository: 'org/img',
      registry: 'r',
      tag: 't',
    })

    expect(getEndpoint.firstCall.args[0].allowUnauthorizedRequest).to.equal(true)
  })

})
