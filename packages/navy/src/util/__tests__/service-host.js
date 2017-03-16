/* eslint-env mocha */

import {expect} from 'chai'
import {getNIPSubdomain, getUrlFromService, createHostForService, createUrlForService} from '../service-host'

describe('service-host', function () {

  describe('getNIPSubdomain', function () {

    it('should return an nip.io domain with the correct IP address', async function () {
      expect(await getNIPSubdomain('192.168.1.10')).to.equal('192.168.1.10.nip.io')
    })

    it('should fallback to localhost when a hostname is passed instead of an IP address', async function () {
      process.env.NAVY_EXTERNAL_IP = 'somehostname'
      expect(await getNIPSubdomain('somehostname')).to.equal('127.0.0.1.nip.io')
    })

  })

  describe('createHostForService', function () {

    it('should return the correct host for a service', async function () {
      expect(await createHostForService('someservice', 'mynavy', '127.0.0.1')).to.equal('someservice.mynavy.127.0.0.1.nip.io')
      expect(await createHostForService('someservice', 'mynavy', '192.168.1.10')).to.equal('someservice.mynavy.192.168.1.10.nip.io')
    })

  })

  describe('createUrlForService', function () {

    it('should return the correct url for a service', async function () {
      expect(await createUrlForService('someservice', 'mynavy', '192.168.99.100')).to.equal('http://someservice.mynavy.192.168.99.100.nip.io')
    })
  })

  describe('getUrlFromService', function () {

    it('should extract the host from service ENV config', function () {
      const service = {
        raw: {
          Config: {
            Env: [
              'VIRTUAL_HOST=myservice.coolnavy.127.0.0.1.nip.io',
            ],
          },
        },
      }

      expect(getUrlFromService(service)).to.equal('http://myservice.coolnavy.127.0.0.1.nip.io')
    })

    it('should return null when the service object is not valid', function () {
      const service = {
        raw: {
          Config: {},
        },
      }

      expect(getUrlFromService(service)).to.equal(null)
      expect(getUrlFromService(undefined)).to.equal(null)
    })
  })

})
