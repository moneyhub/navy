/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

describe('navy-plugin-nodejs/index', function () {

  let sandbox
  let mountUserHomeMiddleware
  let rewriteLinkedNodeModules
  let plugin

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    mountUserHomeMiddleware = function () {}
    rewriteLinkedNodeModules = function () {}

    plugin = proxyquire.noCallThru()('../index', {
      './middleware/mount-user-home': mountUserHomeMiddleware,
      './hooks/rewrite-linked-node-modules': rewriteLinkedNodeModules,
    })
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('default export', function () {

    it('should register the mount-user-home middleware on the navy', function () {
      const navy = {
        registerMiddleware: sandbox.stub(),
        on: sandbox.stub(),
      }

      plugin(navy)

      expect(navy.registerMiddleware.calledOnce).to.equal(true)
      expect(navy.registerMiddleware.firstCall.args[0]).to.equal(mountUserHomeMiddleware)
    })

    it('should register the rewrite-linked-node-modules hook for cli.develop.beforeLaunch', function () {
      const navy = {
        registerMiddleware: sandbox.stub(),
        on: sandbox.stub(),
      }

      plugin(navy)

      expect(navy.on.calledOnce).to.equal(true)
      expect(navy.on.firstCall.args[0]).to.equal('cli.develop.beforeLaunch')
      expect(navy.on.firstCall.args[1]).to.equal(rewriteLinkedNodeModules)
    })

  })

})
