/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import path from 'path'
import { EventEmitter } from 'events'
import fs from '../../../util/fs'
import * as execAsyncModule from '../../../util/exec-async'
import * as driverLogging from '../../../driver-logging'
import { createComposeClient } from '../client'

function makeNavy({ name = 'env', normalisedName = 'env', configProvider = null } = {}) {
  return {
    name,
    normalisedName,
    getConfigProvider: sinon.stub().resolves(configProvider),
  }
}

describe('docker-compose client', function () {

  let sandbox
  let originalHome
  let execStub

  beforeEach(function () {
    sandbox = sinon.createSandbox()
    originalHome = process.env.HOME
    process.env.HOME = '/home/test'

    execStub = sandbox.stub(execAsyncModule, 'execAsync').resolves('')
    sandbox.stub(driverLogging, 'log')
  })

  afterEach(function () {
    sandbox.restore()
    if (originalHome === undefined) {
      delete process.env.HOME
    } else {
      process.env.HOME = originalHome
    }
  })

  describe('createComposeClient', function () {

    it('should expose exec, getCompiledDockerComposePath, getDockerComposeFilePath, getOriginalDockerComposeDirectory', function () {
      const client = createComposeClient(makeNavy())

      expect(client).to.have.property('exec').that.is.a('function')
      expect(client).to.have.property('getCompiledDockerComposePath').that.is.a('function')
      expect(client).to.have.property('getDockerComposeFilePath').that.is.a('function')
      expect(client).to.have.property('getOriginalDockerComposeDirectory').that.is.a('function')
    })

  })

  describe('getCompiledDockerComposePath', function () {

    it('should return $HOME/.navy/navies/<env>/docker-compose.tmp.yml', function () {
      const client = createComposeClient(makeNavy({ normalisedName: 'envname' }))

      expect(client.getCompiledDockerComposePath()).to.equal(
        path.join('/home/test', '.navy', 'navies', 'envname', 'docker-compose.tmp.yml')
      )
    })

  })

  describe('getDockerComposeFilePath', function () {

    it('should return the compiled path when the file exists', async function () {
      const client = createComposeClient(makeNavy())
      sandbox.stub(fs, 'statAsync').resolves({})

      const result = await client.getDockerComposeFilePath()
      expect(result).to.contain('docker-compose.tmp.yml')
    })

    it('should return null when the compiled file does not exist', async function () {
      const client = createComposeClient(makeNavy())
      sandbox.stub(fs, 'statAsync').rejects(new Error('ENOENT'))

      expect(await client.getDockerComposeFilePath()).to.equal(null)
    })

  })

  describe('getOriginalDockerComposeDirectory', function () {

    it('should return the navy path from the config provider', async function () {
      const client = createComposeClient(makeNavy({
        configProvider: { getNavyPath: async () => '/some/path' },
      }))

      expect(await client.getOriginalDockerComposeDirectory()).to.equal('/some/path')
    })

    it('should throw an invariant violation when there is no config provider', async function () {
      const client = createComposeClient(makeNavy({ configProvider: null }))

      let caught
      try {
        await client.getOriginalDockerComposeDirectory()
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.an('error')
      expect(caught.message).to.match(/NO_CONFIG_PROVIDER/)
    })

  })

  describe('exec', function () {

    it('should call docker compose with -p <name> -f <compiled path> when compiled file exists', async function () {
      const client = createComposeClient(makeNavy({ normalisedName: 'env' }))
      sandbox.stub(fs, 'statAsync').resolves({})

      await client.exec('up', ['-d'])

      expect(execStub.calledOnce).to.equal(true)
      const [cmd, args, , opts] = execStub.firstCall.args
      expect(cmd).to.equal('docker compose')
      expect(args[0]).to.equal('-p')
      expect(args[1]).to.equal('env')
      expect(args[2]).to.equal('-f')
      expect(args[3]).to.contain('docker-compose.tmp.yml')
      expect(args.slice(4)).to.eql(['up', '-d'])
      expect(opts.maxBuffer).to.equal(Infinity)
    })

    it('should set cwd to the original docker-compose directory when the compiled file is missing', async function () {
      const client = createComposeClient(makeNavy({
        configProvider: { getNavyPath: async () => '/orig/path' },
      }))
      sandbox.stub(fs, 'statAsync').rejects(new Error('ENOENT'))

      await client.exec('config')

      const [, args, , opts] = execStub.firstCall.args
      expect(args).to.not.include('-f')
      expect(opts.cwd).to.equal('/orig/path')
    })

    it('should pass useOriginalDockerComposeFiles to bypass the compiled file', async function () {
      const client = createComposeClient(makeNavy({
        configProvider: { getNavyPath: async () => '/orig/path' },
      }))
      sandbox.stub(fs, 'statAsync').resolves({})

      await client.exec('config', [], { useOriginalDockerComposeFiles: true })

      const [, args, , opts] = execStub.firstCall.args
      expect(args).to.not.include('-f')
      expect(opts.cwd).to.equal('/orig/path')
    })

    it('should respect a custom maxBuffer', async function () {
      const client = createComposeClient(makeNavy())
      sandbox.stub(fs, 'statAsync').resolves({})

      await client.exec('up', [], { maxBuffer: 1024 })

      const [, , , opts] = execStub.firstCall.args
      expect(opts.maxBuffer).to.equal(1024)
    })

    it('should default args to an empty array', async function () {
      const client = createComposeClient(makeNavy())
      sandbox.stub(fs, 'statAsync').resolves({})

      await client.exec('config')

      expect(execStub.calledOnce).to.equal(true)
    })

    it('should pipe child stdout/stderr through the spinner log when noLog and pipeLog are not set', async function () {
      const client = createComposeClient(makeNavy())
      sandbox.stub(fs, 'statAsync').resolves({})

      const child = new EventEmitter()
      child.stdout = new EventEmitter()
      child.stderr = new EventEmitter()
      execStub.callsFake(async (cmd, args, callback) => {
        callback(child)
        child.stdout.emit('data', 'out-line')
        child.stderr.emit('data', 'err-line')
        return ''
      })

      await client.exec('up')

      expect(driverLogging.log.callCount).to.equal(2)
      expect(driverLogging.log.firstCall.args[0]).to.equal('out-line')
      expect(driverLogging.log.secondCall.args[0]).to.equal('err-line')
    })

    it('should pipe child stdout/stderr to process.stdout/stderr when pipeLog is true', async function () {
      const client = createComposeClient(makeNavy())
      sandbox.stub(fs, 'statAsync').resolves({})

      const child = new EventEmitter()
      child.stdout = new EventEmitter()
      child.stderr = new EventEmitter()
      const stdoutWrite = sandbox.stub(process.stdout, 'write').returns(true)
      const stderrWrite = sandbox.stub(process.stderr, 'write').returns(true)

      execStub.callsFake(async (cmd, args, callback) => {
        callback(child)
        child.stdout.emit('data', 'out')
        child.stderr.emit('data', 'err')
        return ''
      })

      await client.exec('logs', [], { pipeLog: true })

      expect(stdoutWrite.calledWith('out')).to.equal(true)
      expect(stderrWrite.calledWith('err')).to.equal(true)
    })

    it('should NOT attach stdout/stderr listeners when noLog is true', async function () {
      const client = createComposeClient(makeNavy())
      sandbox.stub(fs, 'statAsync').resolves({})

      const child = new EventEmitter()
      child.stdout = new EventEmitter()
      child.stderr = new EventEmitter()

      execStub.callsFake(async (cmd, args, callback) => {
        callback(child)
        return ''
      })

      await client.exec('config', [], { noLog: true })

      expect(child.stdout.listenerCount('data')).to.equal(0)
      expect(child.stderr.listenerCount('data')).to.equal(0)
    })

    it('should map "Can\'t find a suitable configuration file" errors to NO_DOCKER_COMPOSE_FILE invariant', async function () {
      const client = createComposeClient(makeNavy())
      sandbox.stub(fs, 'statAsync').resolves({})
      execStub.rejects(new Error("Can't find a suitable configuration file"))

      let caught
      try {
        await client.exec('config')
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.an('error')
      expect(caught.message).to.match(/NO_DOCKER_COMPOSE_FILE/)
    })

    it('should rethrow other exec errors as-is', async function () {
      const client = createComposeClient(makeNavy())
      sandbox.stub(fs, 'statAsync').resolves({})
      const err = new Error('some other failure')
      execStub.rejects(err)

      let caught
      try {
        await client.exec('up')
      } catch (e) {
        caught = e
      }

      expect(caught).to.equal(err)
    })

    it('should rethrow errors that have no message', async function () {
      const client = createComposeClient(makeNavy())
      sandbox.stub(fs, 'statAsync').resolves({})
      const err = {}
      execStub.rejects(err)

      let caught
      try {
        await client.exec('up')
      } catch (e) {
        caught = e
      }

      expect(caught).to.equal(err)
    })

  })

})
