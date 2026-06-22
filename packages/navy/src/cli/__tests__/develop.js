/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import { NavyError } from '../../errors'

describe('cli/develop', function () {

  let sandbox
  let getNavyStub
  let navyStub
  let getNavyRcStub
  let dockerStub
  let containerObj
  let consoleLogStub
  let originalCwd
  let developCli

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    navyStub = {
      name: 'env-1',
      getState: sandbox.stub().resolves({}),
      saveState: sandbox.stub().resolves(),
      emitAsync: sandbox.stub().resolves(),
      kill: sandbox.stub().resolves(),
      launch: sandbox.stub().resolves(),
      ps: sandbox.stub().resolves([{ name: 'web', id: 'abc123' }]),
    }
    getNavyStub = sandbox.stub().returns(navyStub)
    getNavyRcStub = sandbox.stub().resolves({
      services: ['web'],
      develop: { mounts: { './src': '/app/src' }, command: 'npm start' },
    })

    containerObj = {
      attach: sandbox.stub().resolves('stream'),
      modem: { demuxStream: sandbox.stub() },
    }
    dockerStub = { getContainer: sandbox.stub().returns(containerObj) }

    consoleLogStub = sandbox.stub(console, 'log')

    originalCwd = process.cwd
    sandbox.stub(process, 'cwd').returns('/work')

    developCli = proxyquire.noCallThru()('../develop', {
      '../': { getNavy: getNavyStub },
      '../errors': { NavyError },
      '../util/docker-client': dockerStub,
      '../util/navyrc': getNavyRcStub,
    })
  })

  afterEach(function () {
    process.cwd = originalCwd
    sandbox.restore()
  })

  describe('default export', function () {

    it('should throw a NavyError when navyrc is null', async function () {
      getNavyRcStub.resolves(null)

      let caught
      try {
        await developCli('web', { navy: 'env-1' })
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.instanceof(NavyError)
      expect(caught.message).to.contain('No valid .navyrc')
    })

    it('should throw a NavyError when navyrc has no services', async function () {
      getNavyRcStub.resolves({ services: undefined })

      let caught
      try {
        await developCli('web', { navy: 'env-1' })
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.instanceof(NavyError)
    })

    it('should throw a NavyError when develop key is missing', async function () {
      getNavyRcStub.resolves({ services: ['web'] })

      let caught
      try {
        await developCli('web', { navy: 'env-1' })
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.instanceof(NavyError)
      expect(caught.message).to.contain('No develop mounts')
    })

    it('should throw when multiple services are listed and none specified', async function () {
      getNavyRcStub.resolves({
        services: ['web', 'api'],
        develop: { mounts: {}, command: 'x' },
      })

      let caught
      try {
        await developCli(undefined, { navy: 'env-1' })
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.instanceof(NavyError)
      expect(caught.message).to.contain('Multiple service mappings')
    })

    it('should infer the only service when one is listed', async function () {
      await developCli(undefined, { navy: 'env-1' })

      expect(navyStub.kill.calledWith(['web'])).to.equal(true)
    })

    it('should throw when the service is not in the navyrc list', async function () {
      let caught
      try {
        await developCli('unknown', { navy: 'env-1' })
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.instanceof(NavyError)
      expect(caught.message).to.contain('not a valid development target')
    })

    it('should resolve mount keys to absolute paths and persist them in state', async function () {
      await developCli('web', { navy: 'env-1' })

      expect(navyStub.saveState.calledOnce).to.equal(true)
      const newState = navyStub.saveState.firstCall.args[0]
      const mountKeys = Object.keys(newState.services.web._develop.mounts)
      expect(mountKeys[0].endsWith('src')).to.equal(true)
      expect(newState.services.web._develop.command).to.equal('npm start')
    })

    it('should preserve existing state.services entries on save', async function () {
      navyStub.getState.resolves({
        services: {
          api: { _tag: 'v1' },
        },
      })

      await developCli('web', { navy: 'env-1' })

      const newState = navyStub.saveState.firstCall.args[0]
      expect(newState.services.api).to.eql({ _tag: 'v1' })
    })

    it('should default to {} when navy.getState returns null', async function () {
      navyStub.getState.resolves(null)

      await developCli('web', { navy: 'env-1' })

      const newState = navyStub.saveState.firstCall.args[0]
      // eslint-disable-next-line no-unused-expressions
      expect(newState.services.web._develop).to.exist
    })

    it('should kill, then launch the service in develop mode', async function () {
      await developCli('web', { navy: 'env-1' })

      expect(navyStub.emitAsync.calledWith('cli.develop.beforeLaunch')).to.equal(true)
      expect(navyStub.kill.calledOnce).to.equal(true)
      expect(navyStub.launch.calledOnce).to.equal(true)
      expect(navyStub.launch.firstCall.args[0]).to.eql(['web'])
      expect(navyStub.launch.firstCall.args[1]).to.eql({ noDeps: true })
    })

    it('should attach to the container and demux the stream', async function () {
      await developCli('web', { navy: 'env-1' })

      expect(dockerStub.getContainer.calledWith('abc123')).to.equal(true)
      expect(containerObj.attach.calledOnce).to.equal(true)

      // Wait for the .then callback to fire on the attach promise
      await new Promise(resolve => setImmediate(resolve))

      expect(containerObj.modem.demuxStream.calledOnce).to.equal(true)
      expect(containerObj.modem.demuxStream.firstCall.args[0]).to.equal('stream')
    })

    it('should log a graceful exit message when attach rejects', async function () {
      containerObj.attach.rejects(new Error('attach failed'))

      await developCli('web', { navy: 'env-1' })

      // Wait microtask flush
      await new Promise(resolve => setImmediate(resolve))
      await new Promise(resolve => setImmediate(resolve))

      const printed = consoleLogStub.getCalls().map(c => c.args[0] || '').join('\n')
      expect(printed).to.contain('exited')
    })

    it('should throw an invariant violation when no container is found for the service', async function () {
      navyStub.ps.resolves([{ name: 'other', id: 'xyz' }])

      let caught
      try {
        await developCli('web', { navy: 'env-1' })
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.an('error')
      expect(caught.message).to.contain('DEVELOP_NO_CONTAINER_ID')
    })

  })

})
