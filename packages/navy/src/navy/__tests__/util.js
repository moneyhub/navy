/* eslint-env mocha */

import { expect } from 'chai'
import { normaliseNavyName } from '../util'

describe('navy/util', function () {

  describe('normaliseNavyName', function () {

    it('should strip non-word characters from a navy name', function () {
      expect(normaliseNavyName('my-navy')).to.equal('mynavy')
      expect(normaliseNavyName('my navy')).to.equal('mynavy')
      expect(normaliseNavyName('a.b.c')).to.equal('abc')
    })

    it('should preserve underscores and digits (which are word characters)', function () {
      expect(normaliseNavyName('env_1_test_2')).to.equal('env_1_test_2')
    })

    it('should leave a name with no special characters unchanged', function () {
      expect(normaliseNavyName('plain')).to.equal('plain')
    })

    it('should return an empty string for a name made entirely of special characters', function () {
      expect(normaliseNavyName('!@#$%^&*()')).to.equal('')
    })

  })

})
