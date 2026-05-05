/* eslint-env mocha */

import { expect } from 'chai'
import { basicAuthentication } from '../helpers'

describe('registry helpers', function () {

  describe('basicAuthentication', function () {

    it('should return null for empty credentials', function () {
      expect(basicAuthentication({})).to.equal(null)
    })

    it('should base64-encode user:password into a Basic header', function () {
      const result = basicAuthentication({ username: 'alice', password: 's3cret' })

      expect(result).to.equal('Basic ' + Buffer.from('alice:s3cret').toString('base64'))
    })

    it('should still return a Basic header for non-empty objects with empty values', function () {
      expect(basicAuthentication({ username: '', password: '' }))
        .to.equal('Basic ' + Buffer.from(':').toString('base64'))
    })

  })

})
