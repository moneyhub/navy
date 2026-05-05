/* eslint-env mocha */

import { expect } from 'chai'
import * as navyModule from '../index'

describe('navy package entry point', function () {

  it('should re-export the Navy class and navy lookup helpers', function () {
    expect(navyModule).to.have.property('Navy').that.is.a('function')
    expect(navyModule).to.have.property('getNavy').that.is.a('function')
    expect(navyModule).to.have.property('getLaunchedNavies').that.is.a('function')
    expect(navyModule).to.have.property('getLaunchedNavyNames').that.is.a('function')
  })

  it('should expose the Service module under Service', function () {
    expect(navyModule).to.have.property('Service').that.is.an('object')
    expect(navyModule.Service).to.have.property('Status').that.is.an('object')
  })

  it('should re-export NavyError', function () {
    expect(navyModule).to.have.property('NavyError').that.is.a('function')
  })

  it('should re-export middlewareHelpers', function () {
    expect(navyModule).to.have.property('middlewareHelpers').that.is.an('object')
  })

})
