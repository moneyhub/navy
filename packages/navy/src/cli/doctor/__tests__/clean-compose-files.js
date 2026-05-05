/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

describe('cli/doctor/clean-compose-files', function () {

  let sandbox
  let getLaunchedNavyNamesStub
  let startStub
  let pathToNavyStub
  let normaliseNavyNameStub
  let rmStub
  let cleanComposeFiles

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    getLaunchedNavyNamesStub = sandbox.stub().resolves([])
    startStub = sandbox.stub()
    pathToNavyStub = sandbox.stub().callsFake(name => `/state/${name}`)
    normaliseNavyNameStub = sandbox.stub().callsFake(name => name.toLowerCase())
    rmStub = sandbox.stub().resolves()

    cleanComposeFiles = proxyquire.noCallThru()('../clean-compose-files', {
      '../../': { getLaunchedNavyNames: getLaunchedNavyNamesStub },
      './util': { start: startStub },
      '../../navy/state': { pathToNavy: pathToNavyStub },
      '../../navy/util': { normaliseNavyName: normaliseNavyNameStub },
      fs: { promises: { rm: rmStub } },
    })
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('default export', function () {

    it('should print a starting message', async function () {
      await cleanComposeFiles()

      expect(startStub.calledOnce).to.equal(true)
      expect(startStub.firstCall.args[0]).to.contain('Cleaning')
    })

    it('should not call rm when there are no launched navies', async function () {
      getLaunchedNavyNamesStub.resolves([])

      await cleanComposeFiles()

      expect(rmStub.called).to.equal(false)
    })

    it('should remove docker-compose.tmp.yml from each launched navy path', async function () {
      getLaunchedNavyNamesStub.resolves(['env-1', 'Dev'])

      await cleanComposeFiles()

      expect(rmStub.callCount).to.equal(2)
      const paths = rmStub.getCalls().map(c => c.args[0])
      expect(paths).to.include('/state/env-1/docker-compose.tmp.yml')
      expect(paths).to.include('/state/dev/docker-compose.tmp.yml')

      rmStub.getCalls().forEach(call => {
        expect(call.args[1]).to.eql({ recursive: true, force: true })
      })
    })

    it('should normalise navy names when resolving paths', async function () {
      getLaunchedNavyNamesStub.resolves(['MyEnv'])

      await cleanComposeFiles()

      expect(normaliseNavyNameStub.calledWith('MyEnv')).to.equal(true)
    })

  })

})
