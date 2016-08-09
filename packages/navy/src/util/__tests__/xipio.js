/* eslint-env mocha */

import {expect} from 'chai'
import {getXIPSubdomain, getHostForService} from '../xipio'

describe('xipio', function () {

  describe('getXIPSubdomain', function () {

    it('should return a short xip.io domain when IP is 127.0.0.1', function () {
      process.env.NAVY_EXTERNAL_IP = '127.0.0.1'
      expect(getXIPSubdomain()).to.equal('0.xip.io')
    })

    it('should return an xip.io domain with the correct IP address', function () {
      process.env.NAVY_EXTERNAL_IP = '192.168.1.10'
      expect(getXIPSubdomain()).to.equal('192.168.1.10.xip.io')
    })

    it('should fallback to localhost when a hostname is passed instead of an IP address', function () {
      process.env.NAVY_EXTERNAL_IP = 'somehostname'
      expect(getXIPSubdomain()).to.equal('0.xip.io')
    })

  })

  describe('getHostForService', function () {

    it('should return the correct url host for a service', function () {
      process.env.NAVY_EXTERNAL_IP = '127.0.0.1'
      expect(getHostForService('someservice', 'mynavy')).to.equal('someservice.mynavy.0.xip.io')
    })

  })

})
