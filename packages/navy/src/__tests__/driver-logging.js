/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import { dots } from 'cli-spinners'
import {
  startDriverLogging,
  stopDriverLogging,
  isDriverLogging,
  log,
} from '../driver-logging'

describe('driver-logging', function () {

  let sandbox
  let clock
  let stdoutWrite
  let cursorTo
  let moveCursor
  let consoleLog
  let originalIsTTY
  let originalCursorTo
  let originalMoveCursor

  beforeEach(function () {
    sandbox = sinon.createSandbox()
    clock = sandbox.useFakeTimers()

    stdoutWrite = sandbox.stub(process.stdout, 'write').returns(true)

    originalCursorTo = process.stdout.cursorTo
    originalMoveCursor = process.stdout.moveCursor
    process.stdout.cursorTo = function () {}
    process.stdout.moveCursor = function () {}

    cursorTo = sandbox.stub(process.stdout, 'cursorTo')
    moveCursor = sandbox.stub(process.stdout, 'moveCursor')
    consoleLog = sandbox.stub(console, 'log')

    originalIsTTY = process.stdout.isTTY
    process.stdout.isTTY = true
  })

  afterEach(function () {
    if (isDriverLogging()) {
      stopDriverLogging({ success: true })
    }
    process.stdout.isTTY = originalIsTTY
    sandbox.restore()
    if (originalCursorTo === undefined) {
      delete process.stdout.cursorTo
    } else {
      process.stdout.cursorTo = originalCursorTo
    }
    if (originalMoveCursor === undefined) {
      delete process.stdout.moveCursor
    } else {
      process.stdout.moveCursor = originalMoveCursor
    }
  })

  describe('startDriverLogging / isDriverLogging', function () {

    it('should mark logging as active and write the initial spinner frame', function () {
      expect(isDriverLogging()).to.equal(false)

      startDriverLogging('Doing thing')

      expect(isDriverLogging()).to.equal(true)
      expect(stdoutWrite.called).to.equal(true)
      const written = stdoutWrite.getCalls().map(c => c.args[0]).join('')
      expect(written).to.contain('Doing thing')
    })

    it('should advance the spinner frame on each interval tick', function () {
      startDriverLogging('Working')

      const writesBefore = stdoutWrite.callCount
      clock.tick(dots.interval)
      expect(stdoutWrite.callCount).to.be.greaterThan(writesBefore)
    })

    it('should wrap the spinner frame index back to 0 after exhausting all frames', function () {
      startDriverLogging('Wrap test')

      clock.tick(dots.interval * (dots.frames.length + 1))

      expect(isDriverLogging()).to.equal(true)
    })

  })

  describe('stopDriverLogging', function () {

    it('should clear the logging state and emit a final success line', function () {
      startDriverLogging('Working')

      stopDriverLogging({ success: true })

      expect(isDriverLogging()).to.equal(false)
    })

    it('should default success to true when not provided', function () {
      startDriverLogging('Working')

      stopDriverLogging()

      expect(isDriverLogging()).to.equal(false)
    })

    it('should mark a failure when success is false', function () {
      startDriverLogging('Working')

      stopDriverLogging({ success: false })

      expect(isDriverLogging()).to.equal(false)
    })

    it('should be a no-op if logging was never started', function () {
      expect(isDriverLogging()).to.equal(false)

      stopDriverLogging({ success: true })

      expect(stdoutWrite.called).to.equal(false)
      expect(cursorTo.called).to.equal(false)
      expect(moveCursor.called).to.equal(false)
    })

  })

  describe('non-TTY behaviour', function () {

    beforeEach(function () {
      process.stdout.isTTY = false
    })

    it('should print a SUCCESS line via console.log when stopping with success', function () {
      startDriverLogging('Working')

      stopDriverLogging({ success: true })

      const messages = consoleLog.getCalls().map(c => c.args.join(' '))
      const success = messages.find(m => m.includes('SUCCESS'))
      expect(success).to.be.a('string')
    })

    it('should print a FAILURE line via console.log when stopping with success=false', function () {
      startDriverLogging('Working')

      stopDriverLogging({ success: false })

      const messages = consoleLog.getCalls().map(c => c.args.join(' '))
      const failure = messages.find(m => m.includes('FAILURE'))
      expect(failure).to.be.a('string')
    })

    it('should not print anything during ongoing spinner ticks while non-TTY', function () {
      startDriverLogging('Working')
      const callsAtStart = consoleLog.callCount

      clock.tick(dots.interval * 3)

      expect(consoleLog.callCount).to.equal(callsAtStart)
    })

  })

  describe('log', function () {

    const written = () => stdoutWrite.getCalls().map(c => c.args[0]).join('')

    it('should write the message to stdout while logging is active', function () {
      startDriverLogging('Active')

      stdoutWrite.resetHistory()
      log('hello')

      expect(written()).to.contain('hello')
    })

    it('should only show the latest line, without scrolling', function () {
      startDriverLogging('Active')

      stdoutWrite.resetHistory()
      log(' abc Downloading 1MB\n abc Downloading 2MB\n')

      expect(written()).to.contain('abc Downloading 2MB')
      expect(written()).not.to.contain('1MB')
    })

    it('should keep the latest line on spinner ticks', function () {
      startDriverLogging('Active')
      log('pulling')

      stdoutWrite.resetHistory()
      clock.tick(dots.interval)

      expect(written()).to.contain('pulling')
    })

    it('should truncate the line to the terminal width', function () {
      const originalColumns = process.stdout.columns
      process.stdout.columns = 10
      startDriverLogging('Active')

      stdoutWrite.resetHistory()
      log('x'.repeat(50))
      process.stdout.columns = originalColumns

      expect(written()).to.contain('x'.repeat(9))
      expect(written()).not.to.contain('x'.repeat(10))
    })

    it('should not write anything when not a TTY', function () {
      process.stdout.isTTY = false
      startDriverLogging('Active')

      stdoutWrite.resetHistory()
      log('hello')

      expect(stdoutWrite.called).to.equal(false)
    })

    it('should print the start message once when not a TTY', function () {
      process.stdout.isTTY = false
      startDriverLogging('Active')
      clock.tick(dots.interval * 3)

      expect(consoleLog.getCalls().filter(c => c.args.join(' ').includes('Active'))).to.have.length(1)
    })

    it('should be a no-op when logging is not active', function () {
      expect(isDriverLogging()).to.equal(false)

      stdoutWrite.resetHistory()
      log('ignored')

      expect(stdoutWrite.called).to.equal(false)
    })

  })

})
