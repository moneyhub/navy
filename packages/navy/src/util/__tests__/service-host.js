/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import fs from 'fs'
import * as httpsModule from '../https'
import { getNIPSubdomain, getUrlFromService, createHostForService, createUrlForService } from '../service-host'

describe('service-host', function () {

  let sandbox
  const originalSubdomain = process.env.NAVY_EXTERNAL_SUBDOMAIN

  beforeEach(function () {
    sandbox = sinon.createSandbox()
    sandbox.stub(httpsModule, 'getCertsPath').returns('/fake/certs')
    sandbox.stub(fs, 'existsSync').returns(false)
  })

  afterEach(function () {
    sandbox.restore()

    if (originalSubdomain === undefined) {
      delete process.env.NAVY_EXTERNAL_SUBDOMAIN
    } else {
      process.env.NAVY_EXTERNAL_SUBDOMAIN = originalSubdomain
    }
  })

  describe('getNIPSubdomain', function () {

    it('should return an nip.io domain with the correct IP address', async function () {
      expect(await getNIPSubdomain('192.168.1.10')).to.equal('192.168.1.10.nip.io')
    })

    it('should fallback to localhost when a hostname is passed instead of an IP address', async function () {
      process.env.NAVY_EXTERNAL_IP = 'somehostname'
      expect(await getNIPSubdomain('somehostname')).to.equal('127.0.0.1.nip.io')
      delete process.env.NAVY_EXTERNAL_IP
    })

    it('should treat malformed IPs (out-of-range octets) as invalid', async function () {
      expect(await getNIPSubdomain('999.0.0.1')).to.equal('127.0.0.1.nip.io')
    })

  })

  describe('createHostForService', function () {

    it('should return the correct host for a service', async function () {
      expect(await createHostForService('someservice', 'mynavy', '127.0.0.1')).to.equal('someservice.mynavy.127.0.0.1.nip.io')
      expect(await createHostForService('someservice', 'mynavy', '192.168.1.10')).to.equal('someservice.mynavy.192.168.1.10.nip.io')
    })

    it('should use NAVY_EXTERNAL_SUBDOMAIN when set, in preference to nip.io', async function () {
      process.env.NAVY_EXTERNAL_SUBDOMAIN = 'dev.example.com'
      expect(await createHostForService('api', 'env', '10.0.0.1')).to.equal('api.env.dev.example.com')
    })

  })

  describe('createUrlForService', function () {

    it('should return an http URL when no certificate exists', async function () {
      expect(await createUrlForService('someservice', 'mynavy', '192.168.99.100'))
        .to.equal('http://someservice.mynavy.192.168.99.100.nip.io')
    })

    it('should return an https URL when a matching .crt exists in the certs path', async function () {
      fs.existsSync.restore()
      sandbox.stub(fs, 'existsSync').callsFake(filePath =>
        filePath === '/fake/certs/someservice.mynavy.192.168.99.100.nip.io.crt'
      )

      expect(await createUrlForService('someservice', 'mynavy', '192.168.99.100'))
        .to.equal('https://someservice.mynavy.192.168.99.100.nip.io')
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

    it('should return https when a certificate exists for the VIRTUAL_HOST', function () {
      fs.existsSync.restore()
      sandbox.stub(fs, 'existsSync').callsFake(filePath =>
        filePath === '/fake/certs/myservice.coolnavy.127.0.0.1.nip.io.crt'
      )

      const service = {
        raw: {
          Config: {
            Env: [
              'OTHER=value',
              'VIRTUAL_HOST=myservice.coolnavy.127.0.0.1.nip.io',
            ],
          },
        },
      }

      expect(getUrlFromService(service)).to.equal('https://myservice.coolnavy.127.0.0.1.nip.io')
    })

    it('should return null when env contains no VIRTUAL_HOST entry', function () {
      const service = {
        raw: {
          Config: {
            Env: [
              'FOO=bar',
              'BAZ=qux',
            ],
          },
        },
      }

      expect(getUrlFromService(service)).to.equal(null)
    })

    it('should return null when the service object is not valid', function () {
      expect(getUrlFromService({ raw: { Config: {} } })).to.equal(null)
      expect(getUrlFromService({ raw: {} })).to.equal(null)
      expect(getUrlFromService({})).to.equal(null)
      expect(getUrlFromService(undefined)).to.equal(null)
      expect(getUrlFromService(null)).to.equal(null)
    })

  })

})
