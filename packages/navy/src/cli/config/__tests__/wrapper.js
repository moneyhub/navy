/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

describe('cli/config/wrapper', function () {

  let sandbox
  let execSyncStub
  let originalArgv
  let wrapperCli

  beforeEach(function () {
    sandbox = sinon.createSandbox()
    execSyncStub = sandbox.stub()

    originalArgv = process.argv

    wrapperCli = proxyquire.noCallThru()('../wrapper', {
      child_process: { execSync: execSyncStub },
    })
  })

  afterEach(function () {
    process.argv = originalArgv
    sandbox.restore()
  })

  describe('default export', function () {

    it('should invoke navy-config.js via execSync with stdio inherit', async function () {
      process.argv = ['node', 'navy', 'config']

      await wrapperCli('env-1')

      expect(execSyncStub.calledOnce).to.equal(true)
      const command = execSyncStub.firstCall.args[0]
      expect(command).to.contain('navy-config.js')
      const opts = execSyncStub.firstCall.args[1]
      expect(opts).to.eql({ stdio: 'inherit' })
    })

    it('should pass through any extra command-line args from process.argv', async function () {
      process.argv = ['node', 'navy', 'config', 'set', 'default-navy', 'dev']

      await wrapperCli('env-1')

      const command = execSyncStub.firstCall.args[0]
      expect(command).to.contain('set default-navy dev')
    })

    it('should invoke with no extra args when only the wrapper command is supplied', async function () {
      process.argv = ['node', 'navy', 'config']

      await wrapperCli('env-1')

      const command = execSyncStub.firstCall.args[0]
      expect(command.endsWith('navy-config.js ')).to.equal(true)
    })

  })

})
