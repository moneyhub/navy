/* eslint-env mocha */

import { expect } from 'chai'
import { restSpecification, MEDIA_TYPES } from '../oci-api-specification'

describe('oci-api-specification', function () {

  describe('restSpecification.operation', function () {

    it('should build a v2 endpoint URL for the given registry and endpoint', function () {
      expect(restSpecification.operation('registry-1.docker.io', 'library/node/manifests/latest'))
        .to.equal('https://registry-1.docker.io/v2/library/node/manifests/latest')
    })

  })

  describe('restSpecification.getManifest', function () {

    it('should produce <repository>/manifests/<tag>', function () {
      expect(restSpecification.getManifest('library/node', 'lts'))
        .to.equal('library/node/manifests/lts')
    })

  })

  describe('MEDIA_TYPES', function () {

    it('should expose the docker fat manifest list media type', function () {
      expect(MEDIA_TYPES.FAT_MANIFEST)
        .to.equal('application/vnd.docker.distribution.manifest.list.v2+json')
    })

  })

})
