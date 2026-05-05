/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import { EventEmitter } from 'events'
import childProcess from 'child_process'
import { execAsync } from '../exec-async'

function createFakeChild() {
  const child = new EventEmitter()
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  return child
}

describe('exec-async', function () {

  describe('execAsync', function () {

    let sandbox
    let execStub
    let fakeChild

    beforeEach(function () {
      sandbox = sinon.createSandbox()
      fakeChild = createFakeChild()

      execStub = sandbox.stub(childProcess, 'exec').callsFake((cmd, opts, cb) => {
        process.nextTick(() => {
          fakeChild.stdout.emit('data', Buffer.from('hello'))
          fakeChild.stderr.emit('data', Buffer.from('warn'))
          cb(null, 'hello world', '')
        })
        return fakeChild
      })
    })

    afterEach(function () {
      sandbox.restore()
    })

    it('should resolve with stdout when the command succeeds', async function () {
      const result = await execAsync('echo', ['hello', 'world'])

      expect(result).to.equal('hello world')
      expect(execStub.calledOnce).to.equal(true)
      expect(execStub.firstCall.args[0]).to.equal('echo hello world')
    })

    it('should default args to an empty array when not provided', async function () {
      const result = await execAsync('echo')

      expect(result).to.equal('hello world')
      expect(execStub.firstCall.args[0]).to.equal('echo ')
    })

    it('should pass opts through to child_process.exec', async function () {
      const opts = { cwd: '/tmp', env: { FOO: 'bar' } }

      await execAsync('ls', ['-la'], null, opts)

      expect(execStub.firstCall.args[1]).to.equal(opts)
    })

    it('should invoke the callback with the spawned child process', async function () {
      const callback = sinon.spy()

      await execAsync('echo', ['hi'], callback)

      expect(callback.calledOnce).to.equal(true)
      expect(callback.firstCall.args[0]).to.equal(fakeChild)
    })

    it('should not invoke the callback when none is supplied', async function () {
      await execAsync('echo', ['hi'])
    })

    it('should reject when the command fails', async function () {
      execStub.restore()
      const failure = new Error('boom')
      execStub = sandbox.stub(childProcess, 'exec').callsFake((cmd, opts, cb) => {
        process.nextTick(() => cb(failure))
        return fakeChild
      })

      let caught
      try {
        await execAsync('false')
      } catch (err) {
        caught = err
      }

      expect(caught).to.equal(failure)
    })

  })

})
