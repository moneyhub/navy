/* eslint-env mocha */

import { expect } from 'chai'
import * as cliUtil from '../index'

describe('cli/util/index', function () {

  describe('module exports', function () {

    it('should re-export getOrInitialiseNavy as a function', function () {
      expect(cliUtil).to.have.property('getOrInitialiseNavy').that.is.a('function')
    })

    it('should re-export importNavy as a function', function () {
      expect(cliUtil).to.have.property('importNavy').that.is.a('function')
    })

  })

})
