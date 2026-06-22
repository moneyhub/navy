/* eslint-env mocha */

import { expect } from 'chai'
import {
  DEFAULT_REGISTRY,
  DEFAULT_REGISTRY_AUTH,
  getImageFromImageWithTag,
  getTagFromImageWithTag,
  getRegistryFromImage,
  getRepositoryFromImage,
} from '../container-image'

describe('container-image', function () {

  describe('constants', function () {

    it('should expose the default registry hostname', function () {
      expect(DEFAULT_REGISTRY).to.equal('registry-1.docker.io')
    })

    it('should expose the docker config.json auth URL', function () {
      expect(DEFAULT_REGISTRY_AUTH).to.equal('https://index.docker.io/v1/')
    })

  })

  describe('getImageFromImageWithTag', function () {

    it('should strip the tag from a registry/org/image:tag string', function () {
      expect(getImageFromImageWithTag('someregistry.com/some/image:latest'))
        .to.equal('someregistry.com/some/image')
    })

    it('should return the image unchanged when it has slashes but no tag', function () {
      expect(getImageFromImageWithTag('someregistry.com/some/image'))
        .to.equal('someregistry.com/some/image')
    })

    it('should strip the tag from a single-segment image:tag string', function () {
      expect(getImageFromImageWithTag('node:18')).to.equal('node')
    })

    it('should return a single-segment image unchanged when it has no tag', function () {
      expect(getImageFromImageWithTag('node')).to.equal('node')
    })

    it('should not be confused by a colon in the registry port (no tag)', function () {
      expect(getImageFromImageWithTag('myregistry.local:5000/foo/bar'))
        .to.equal('myregistry.local:5000/foo/bar')
    })

    it('should strip the tag while preserving the registry port', function () {
      expect(getImageFromImageWithTag('myregistry.local:5000/foo/bar:1.0'))
        .to.equal('myregistry.local:5000/foo/bar')
    })

  })

  describe('getTagFromImageWithTag', function () {

    it('should extract the tag from a registry/org/image:tag string', function () {
      expect(getTagFromImageWithTag('someregistry.com/some/image:1.2.3')).to.equal('1.2.3')
    })

    it('should default to "latest" when slashes exist but no tag', function () {
      expect(getTagFromImageWithTag('someregistry.com/some/image')).to.equal('latest')
    })

    it('should extract the tag from a single-segment image:tag', function () {
      expect(getTagFromImageWithTag('node:18-alpine')).to.equal('18-alpine')
    })

    it('should default to "latest" for a single-segment image with no tag', function () {
      expect(getTagFromImageWithTag('node')).to.equal('latest')
    })

    it('should not treat the registry port colon as a tag', function () {
      expect(getTagFromImageWithTag('myregistry.local:5000/foo/bar')).to.equal('latest')
    })

    it('should extract the tag with a registry port present', function () {
      expect(getTagFromImageWithTag('myregistry.local:5000/foo/bar:1.0')).to.equal('1.0')
    })

  })

  describe('getRegistryFromImage', function () {

    it('should return the registry from a registry/org/image string', function () {
      expect(getRegistryFromImage('someregistry.com/some/image')).to.equal('someregistry.com')
    })

    it('should fall back to the default registry when no registry is present', function () {
      expect(getRegistryFromImage('library/node')).to.equal(DEFAULT_REGISTRY)
    })

    it('should fall back to default for an unprefixed image', function () {
      expect(getRegistryFromImage('node')).to.equal(DEFAULT_REGISTRY)
    })

  })

  describe('getRepositoryFromImage', function () {

    it('should prefix a single-segment image with library/', function () {
      expect(getRepositoryFromImage('node')).to.equal('library/node')
    })

    it('should strip the registry from a 3-segment image', function () {
      expect(getRepositoryFromImage('someregistry.com/some/image')).to.equal('some/image')
    })

    it('should return a 2-segment image unchanged', function () {
      expect(getRepositoryFromImage('library/node')).to.equal('library/node')
    })

    it('should return a 4+-segment image unchanged', function () {
      expect(getRepositoryFromImage('host/a/b/c')).to.equal('host/a/b/c')
    })

  })

})
