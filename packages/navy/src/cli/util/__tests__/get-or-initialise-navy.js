/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

describe('cli/util/get-or-initialise-navy', function () {

  let sandbox
  let getNavyStub
  let importNavyStub
  let getImportOptionsForCLIStub
  let navyStub
  let getOrInitialiseNavy

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    navyStub = {
      isInitialised: sandbox.stub(),
    }
    getNavyStub = sandbox.stub().returns(navyStub)
    importNavyStub = sandbox.stub().resolves()
    getImportOptionsForCLIStub = sandbox.stub()
      .resolves({ configProvider: 'filesystem', path: '/cwd' })

    getOrInitialiseNavy = proxyquire.noCallThru()('../get-or-initialise-navy', {
      '../../': { getNavy: getNavyStub },
      './import': { importNavy: importNavyStub },
      '../../config-providers/filesystem': {
        getImportOptionsForCLI: getImportOptionsForCLIStub,
      },
    }).getOrInitialiseNavy
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('getOrInitialiseNavy', function () {

    it('should return the navy without importing when already initialised', async function () {
      navyStub.isInitialised.resolves(true)

      const result = await getOrInitialiseNavy('env-1')

      expect(result).to.equal(navyStub)
      expect(getNavyStub.calledOnce).to.equal(true)
      expect(getNavyStub.firstCall.args[0]).to.equal('env-1')
      expect(importNavyStub.called).to.equal(false)
      expect(getImportOptionsForCLIStub.called).to.equal(false)
    })

    it('should import the navy using filesystem provider opts when not initialised', async function () {
      navyStub.isInitialised.resolves(false)

      const result = await getOrInitialiseNavy('env-2')

      expect(result).to.equal(navyStub)
      expect(getImportOptionsForCLIStub.calledOnce).to.equal(true)
      expect(getImportOptionsForCLIStub.firstCall.args[0]).to.eql({})
      expect(importNavyStub.calledOnce).to.equal(true)
      expect(importNavyStub.firstCall.args[0]).to.equal(navyStub)
      expect(importNavyStub.firstCall.args[1]).to.eql({
        configProvider: 'filesystem',
        path: '/cwd',
      })
    })

  })

})
