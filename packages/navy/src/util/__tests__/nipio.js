/* eslint-env mocha */

import {expect} from 'chai'
import {getNIPSubdomain, getHostForService} from '../nipio'

describe('nipio', function () {

  describe('getNIPSubdomain', function () {

    it('should return a short nip.io domain when IP is 127.0.0.1', async function () {
      expect(await getNIPSubdomain('127.0.0.1')).to.equal('0.0.0.0.nip.io')
    })

    it('should return an nip.io domain with the correct IP address', async function () {
      expect(await getNIPSubdomain('192.168.1.10')).to.equal('192.168.1.10.nip.io')
    })

    it('should fallback to localhost when a hostname is passed instead of an IP address', async function () {
      process.env.NAVY_EXTERNAL_IP = 'somehostname'
      expect(await getNIPSubdomain('somehostname')).to.equal('0.0.0.0.nip.io')
    })

  })

  describe('getHostForService', function () {

    it('should return the correct url host for a service', async function () {
      expect(await getHostForService('someservice', 'mynavy', '127.0.0.1')).to.equal('someservice.mynavy.0.0.0.0.nip.io')
      expect(await getHostForService('someservice', 'mynavy', '192.168.1.10')).to.equal('someservice.mynavy.192.168.1.10.nip.io')
    })

  })

})
