/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

// NOTE: hasUpdate has a defect at line 17 in `../has-update`: when the
// supplied navyFile is null/undefined or has no
// `ignoreUnauthorizedRequestsForRegistries` array, `R.includes(registry,
// undefined)` throws (in current ramda). The tests below provide a valid
// navyFile shape to exercise the supported call patterns.
function withMocks({ inspect, getFatManifest = sinon.stub() }) {
  const docker = { getImage: sinon.stub().returns({ inspect }) }
  const stubs = {
    './docker-client': docker,
    '../client/registry/get-fat-manifest': getFatManifest,
  }
  return {
    docker,
    getFatManifest,
    hasUpdate: proxyquire.noCallThru()('../has-update', stubs),
  }
}

describe('has-update', function () {

  it('should return false when the remote digest matches one of the local RepoDigests', async function () {
    const inspect = sinon.stub().resolves({
      RepoDigests: ['library/node@sha256:abc', 'library/node@sha256:other'],
    })
    const { hasUpdate } = withMocks({
      inspect,
      getFatManifest: sinon.stub().resolves({ tag: 'sha256:abc' }),
    })

    const result = await hasUpdate('library/node:lts', 'image-id', {
      ignoreUnauthorizedRequestsForRegistries: [],
    })

    expect(result).to.equal(false)
  })

  it('should return true when the remote digest is not in the local RepoDigests', async function () {
    const inspect = sinon.stub().resolves({ RepoDigests: ['library/node@sha256:old'] })
    const { hasUpdate } = withMocks({
      inspect,
      getFatManifest: sinon.stub().resolves({ tag: 'sha256:new' }),
    })

    const result = await hasUpdate('library/node:lts', 'image-id', {
      ignoreUnauthorizedRequestsForRegistries: [],
    })

    expect(result).to.equal(true)
  })

  it('should return "INVALID_REMOTE" when getFatManifest fails', async function () {
    const inspect = sinon.stub().resolves({ RepoDigests: [] })
    const { hasUpdate } = withMocks({
      inspect,
      getFatManifest: sinon.stub().rejects(new Error('boom')),
    })

    const result = await hasUpdate('library/node:lts', 'image-id', {
      ignoreUnauthorizedRequestsForRegistries: [],
    })

    expect(result).to.equal('INVALID_REMOTE')
  })

  it('should return "INVALID_REMOTE" when docker.getImage().inspect() fails', async function () {
    const inspect = sinon.stub().rejects(new Error('no such image'))
    const { hasUpdate } = withMocks({ inspect })

    const result = await hasUpdate('library/node:lts', 'image-id', {
      ignoreUnauthorizedRequestsForRegistries: [],
    })

    expect(result).to.equal('INVALID_REMOTE')
  })

  it('should pass allowUnauthorizedRequest=true when navyFile lists the registry as ignored', async function () {
    const inspect = sinon.stub().resolves({ RepoDigests: ['someregistry.com/some/image@sha256:abc'] })
    const getFatManifest = sinon.stub().resolves({ tag: 'sha256:abc' })
    const { hasUpdate } = withMocks({ inspect, getFatManifest })

    await hasUpdate('someregistry.com/some/image:1', 'image-id', {
      ignoreUnauthorizedRequestsForRegistries: ['someregistry.com'],
    })

    expect(getFatManifest.firstCall.args[0]).to.eql({
      allowUnauthorizedRequest: true,
      registry: 'someregistry.com',
      repository: 'some/image',
      tag: '1',
    })
  })

  it('should pass allowUnauthorizedRequest=false when registry is not in the ignore list', async function () {
    const inspect = sinon.stub().resolves({ RepoDigests: [] })
    const getFatManifest = sinon.stub().resolves({ tag: 'sha256:abc' })
    const { hasUpdate } = withMocks({ inspect, getFatManifest })

    await hasUpdate('someregistry.com/some/image:1', 'image-id', {
      ignoreUnauthorizedRequestsForRegistries: ['otherregistry.com'],
    })

    expect(getFatManifest.firstCall.args[0].allowUnauthorizedRequest).to.equal(false)
  })

})
