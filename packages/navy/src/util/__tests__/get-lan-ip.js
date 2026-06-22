/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import dns from 'dns'
import os from 'os'
import { getLANIP } from '../get-lan-ip'

describe('get-lan-ip', function () {

  describe('getLANIP', function () {

    let sandbox

    beforeEach(function () {
      sandbox = sinon.createSandbox()
    })

    afterEach(function () {
      sandbox.restore()
    })

    it('should resolve with the looked-up address for the host name', async function () {
      sandbox.stub(os, 'hostname').returns('my-laptop.local')
      const dnsStub = sandbox.stub(dns, 'lookup').callsFake((host, opts, cb) => {
        cb(null, '10.0.0.42')
      })

      const result = await getLANIP()

      expect(result).to.equal('10.0.0.42')
      expect(dnsStub.calledOnce).to.equal(true)
      expect(dnsStub.firstCall.args[0]).to.equal('my-laptop.local')
      expect(dnsStub.firstCall.args[1]).to.equal(null)
    })

    it('should reject if dns.lookup fails', async function () {
      sandbox.stub(os, 'hostname').returns('unknown.local')
      const lookupError = new Error('lookup failed')
      sandbox.stub(dns, 'lookup').callsFake((host, opts, cb) => {
        cb(lookupError)
      })

      let caught
      try {
        await getLANIP()
      } catch (err) {
        caught = err
      }

      expect(caught).to.equal(lookupError)
    })

  })

})
