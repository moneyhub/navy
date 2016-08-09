/* eslint-env mocha */

import {expect} from 'chai'
import {getAuthForRegistry, registryFromImage, credentialsFromAuth} from '../registry-client'

describe('docker registry client', function () {

  describe('getAuthForRegistry', function () {

    beforeEach(function () {
      this.config = {
        auths: {
          'quay.io': {
            auth: 'pretend-base64-of-username-and-password',
            email: 'test@navy.rocks',
          },
          'https://index.docker.io/v1/': {
            auth: 'pretend-base64-of-username-and-password',
            email: 'test@navy.rocks',
          },
        },
      }
    })

    it('should return the auth config for the given registry', function () {
      expect(getAuthForRegistry('quay.io', this.config)).to.eql({
        auth: 'pretend-base64-of-username-and-password',
        email: 'test@navy.rocks',
      })
    })

    it('should return the auth config for Docker Hub if given', function () {
      expect(getAuthForRegistry('registry-1.docker.io', this.config)).to.eql({
        auth: 'pretend-base64-of-username-and-password',
        email: 'test@navy.rocks',
      })
    })

    it('should return null if there is no authentication for the given registry', function () {
      expect(getAuthForRegistry('foo.bar', this.config)).to.be.null
    })

    it('should return null if there is no docker config', function () {
      expect(getAuthForRegistry('foo.bar', null)).to.be.null
    })

  })

  describe('credentialsFromAuth', function () {

    it('should return the username and password from base64 encoded auth', function () {
      expect(credentialsFromAuth({ auth: 'YmFyOnBhc3N3b3Jk' })).to.eql({
        username: 'bar',
        password: 'password',
      })
    })

    it('should throw invariant violation when auth is invalid base64', function () {
      expect(() => credentialsFromAuth({ auth: 'zjasj' })).to.throw(
        'Invalid base64 string in docker/config.json for registry authentication',
      )
    })

  })

  describe('registryFromImage', function () {

    it('should return the correct registry domain from the given image', function () {
      expect(registryFromImage('quay.io/someorg/someimage')).to.equal('quay.io')
    })

    it('should return the correct registry domain from the given image with tag', function () {
      expect(registryFromImage('quay.io/someorg/someimage:some-tag')).to.equal('quay.io')
    })

    it('should return the correct registry domain from the given image from docker hub', function () {
      expect(registryFromImage('someuser/someimage')).to.equal('registry-1.docker.io')
    })

    it('should return the correct registry domain from the given image with tag from docker hub', function () {
      expect(registryFromImage('someuser/someimage:some-tag')).to.equal('registry-1.docker.io')
    })

    it('should return the correct registry domain from the given library image from docker hub', function () {
      expect(registryFromImage('someimage')).to.equal('registry-1.docker.io')
    })

    it('should return the correct registry domain from the given library image with tag from docker hub', function () {
      expect(registryFromImage('someimage:some-tag')).to.equal('registry-1.docker.io')
    })

  })

})
