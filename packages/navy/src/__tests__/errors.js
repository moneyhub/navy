/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import { NavyError, NavyNotInitialisedError } from '../errors'

describe('errors', function () {

  describe('NavyError', function () {

    it('should expose the message passed to the constructor', function () {
      const err = new NavyError('something went wrong')

      expect(err.message).to.equal('something went wrong')
    })

    it('should print a red ERROR banner followed by the message and blank lines via prettyPrint', function () {
      const log = sinon.stub(console, 'log')
      try {
        new NavyError('boom').prettyPrint()
      } finally {
        log.restore()
      }

      expect(log.callCount).to.equal(5)
      expect(log.firstCall.args).to.eql([])
      expect(log.secondCall.args[0]).to.contain('ERROR')
      expect(log.thirdCall.args).to.eql([])
      expect(log.getCall(3).args[0]).to.equal(' boom')
      expect(log.getCall(4).args).to.eql([])
    })

  })

  describe('NavyNotInitialisedError', function () {

    it('should be a NavyError that includes the navy name in the message', function () {
      const err = new NavyNotInitialisedError('myenv')

      expect(err).to.be.instanceof(NavyError)
      expect(err.message).to.equal('Navy "myenv" not imported')
    })

    it('should call the parent prettyPrint and add a hint about navy import', function () {
      const log = sinon.stub(console, 'log')
      try {
        new NavyNotInitialisedError('foo').prettyPrint()
      } finally {
        log.restore()
      }

      const messages = log.getCalls().map(call => call.args[0] || '')
      const hint = messages.find(m => typeof m === 'string' && m.includes('navy import'))
      expect(hint).to.be.a('string')
      expect(hint).to.contain('imported the navy')
    })

  })

})
