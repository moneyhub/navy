/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import dns from 'dns'
import { getExternalIP, dnsLookup } from '../external-ip'

describe('getExternalIP', function () {

  it('should return NAVY_EXTERNAL_IP if set', async function () {
    process.env.NAVY_EXTERNAL_IP = '192.168.1.10'
    expect(await getExternalIP()).to.equal('192.168.1.10')
    delete process.env.NAVY_EXTERNAL_IP
  })

  it('should return correct extract from DOCKER_HOST if set', async function () {
    process.env.DOCKER_HOST = 'tcp://192.168.1.12:2375'
    expect(await getExternalIP()).to.equal('192.168.1.12')
    delete process.env.DOCKER_HOST
  })

  it('should resolve the hostname from DOCKER_HOST if it isn\'t an ipv4 address', async function () {
    process.env.DOCKER_HOST = 'tcp://localhost:2375'
    expect(await getExternalIP()).to.equal('127.0.0.1')

    process.env.DOCKER_HOST = 'tcp://testfoo.192.168.1.13.nip.io:2375'
    expect(await getExternalIP()).to.equal('192.168.1.13')
    delete process.env.DOCKER_HOST
  })

})

describe('external-ip (mocked)', function () {

  let sandbox
  let originalEnv

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    originalEnv = {
      DOCKER_HOST: process.env.DOCKER_HOST,
      NAVY_HOST: process.env.NAVY_HOST,
      NAVY_EXTERNAL_IP: process.env.NAVY_EXTERNAL_IP,
    }

    delete process.env.DOCKER_HOST
    delete process.env.NAVY_HOST
    delete process.env.NAVY_EXTERNAL_IP
  })

  afterEach(function () {
    sandbox.restore()

    for (const [name, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[name]
      } else {
        process.env[name] = value
      }
    }
  })

  describe('dnsLookup', function () {

    it('should resolve with the IPv4 address when dns returns family 4', async function () {
      sandbox.stub(dns, 'lookup').callsFake((hostname, opts, cb) => {
        cb(null, '10.20.30.40', 4)
      })

      const ip = await dnsLookup('example.com')

      expect(ip).to.equal('10.20.30.40')
    })

    it('should reject when dns.lookup returns an error', async function () {
      sandbox.stub(dns, 'lookup').callsFake((hostname, opts, cb) => {
        cb(new Error('ENOTFOUND'))
      })

      let caught
      try {
        await dnsLookup('does-not-exist')
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.an('error')
      expect(caught.message).to.equal('Failed to lookup hostname "does-not-exist"')
    })

    it('should reject when dns.lookup returns a non-ipv4 family', async function () {
      sandbox.stub(dns, 'lookup').callsFake((hostname, opts, cb) => {
        cb(null, '::1', 6)
      })

      let caught
      try {
        await dnsLookup('ipv6-only.example')
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.an('error')
      expect(caught.message).to.equal('Failed to lookup hostname "ipv6-only.example"')
    })

  })

  describe('getExternalIP (additional branches)', function () {

    it('should return NAVY_HOST (deprecated) when set', async function () {
      process.env.NAVY_HOST = 'legacy.host'

      expect(await getExternalIP()).to.equal('legacy.host')
    })

    it('should give NAVY_HOST precedence over NAVY_EXTERNAL_IP', async function () {
      process.env.NAVY_HOST = 'legacy.host'
      process.env.NAVY_EXTERNAL_IP = '1.2.3.4'

      expect(await getExternalIP()).to.equal('legacy.host')
    })

    it('should DNS-resolve ipInConfig when provided', async function () {
      sandbox.stub(dns, 'lookup').callsFake((hostname, opts, cb) => {
        expect(hostname).to.equal('docker.internal')
        cb(null, '172.16.0.5', 4)
      })

      expect(await getExternalIP('docker.internal')).to.equal('172.16.0.5')
    })

    it('should resolve a hostname embedded in DOCKER_HOST tcp:// using DNS', async function () {
      process.env.DOCKER_HOST = 'tcp://my-docker-host.example:2375'
      sandbox.stub(dns, 'lookup').callsFake((hostname, opts, cb) => {
        expect(hostname).to.equal('my-docker-host.example')
        cb(null, '203.0.113.7', 4)
      })

      expect(await getExternalIP()).to.equal('203.0.113.7')
    })

    it('should fall back to 127.0.0.1 when no env vars or config are set', async function () {
      expect(await getExternalIP()).to.equal('127.0.0.1')
    })

    it('should fall back to 127.0.0.1 when DOCKER_HOST is set without tcp://', async function () {
      process.env.DOCKER_HOST = 'unix:///var/run/docker.sock'

      expect(await getExternalIP()).to.equal('127.0.0.1')
    })

  })

})
