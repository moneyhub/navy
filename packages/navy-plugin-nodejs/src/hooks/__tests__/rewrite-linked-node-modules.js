/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import { EventEmitter } from 'events'

describe('navy-plugin-nodejs/hooks/rewrite-linked-node-modules', function () {

  let sandbox
  let finditStub
  let finder
  let fsStub
  let pathStub
  let osStub
  let consoleLogStub
  let consoleErrorStub
  let originalCwd
  let rewriteLinkedNodeModules

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    finder = new EventEmitter()
    finditStub = sandbox.stub().returns(finder)

    fsStub = {
      realpathSync: sandbox.stub().callsFake(link => `${link}.real`),
      unlinkSync: sandbox.stub(),
      symlinkSync: sandbox.stub(),
    }

    pathStub = {
      join: sandbox.stub().callsFake((...args) => args.join('/')),
    }

    osStub = { EOL: '\n' }

    consoleLogStub = sandbox.stub(console, 'log')
    consoleErrorStub = sandbox.stub(console, 'error')

    originalCwd = process.cwd
    sandbox.stub(process, 'cwd').returns('/project')

    rewriteLinkedNodeModules = proxyquire.noCallThru()('../rewrite-linked-node-modules', {
      findit2: finditStub,
      path: pathStub,
      fs: fsStub,
      os: osStub,
      '../../package.json': { name: 'navy-plugin-nodejs' },
    })
  })

  afterEach(function () {
    process.cwd = originalCwd
    sandbox.restore()
  })

  describe('default export', function () {

    it('should walk node_modules under the current working directory', function () {
      rewriteLinkedNodeModules()

      expect(finditStub.calledOnce).to.equal(true)
      expect(finditStub.firstCall.args[0]).to.equal('/project/node_modules')
    })

    it('should log an error when finder emits an error', function () {
      rewriteLinkedNodeModules()

      finder.emit('error', new Error('walk failed'))

      expect(consoleErrorStub.calledOnce).to.equal(true)
      const printed = consoleErrorStub.firstCall.args.join(' ')
      expect(printed).to.contain('navy-plugin-nodejs')
      expect(printed).to.contain('walk failed')
    })

    it('should rewrite a symlink to its absolute path', function () {
      rewriteLinkedNodeModules()

      finder.emit('link', '/project/node_modules/foo')

      expect(fsStub.realpathSync.calledWith('/project/node_modules/foo')).to.equal(true)
      expect(fsStub.unlinkSync.calledWith('/project/node_modules/foo')).to.equal(true)
      expect(fsStub.symlinkSync.calledWith(
        '/project/node_modules/foo.real',
        '/project/node_modules/foo',
      )).to.equal(true)
    })

    it('should log the rewritten link', function () {
      rewriteLinkedNodeModules()

      finder.emit('link', '/project/node_modules/foo')

      const printed = consoleLogStub.firstCall.args.join(' ')
      expect(printed).to.contain('Linked')
      expect(printed).to.contain('/project/node_modules/foo')
      expect(printed).to.contain('/project/node_modules/foo.real')
    })

    it('should ignore links inside .bin directories', function () {
      rewriteLinkedNodeModules()

      finder.emit('link', '/project/node_modules/.bin/something')

      expect(fsStub.realpathSync.called).to.equal(false)
      expect(fsStub.unlinkSync.called).to.equal(false)
      expect(fsStub.symlinkSync.called).to.equal(false)
    })

  })

})
