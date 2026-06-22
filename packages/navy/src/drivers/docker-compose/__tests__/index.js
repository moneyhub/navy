/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import yaml from 'js-yaml'
import dockerClient from '../../../util/docker-client'
import fs from '../../../util/fs'
import * as execAsyncModule from '../../../util/exec-async'
import * as driverLogging from '../../../driver-logging'
import { Status } from '../../../service'
import createDockerComposeDriver from '../index'

function makeNavy({ normalisedName = 'env', configProvider = null } = {}) {
  return {
    name: normalisedName,
    normalisedName,
    getConfigProvider: sinon.stub().resolves(configProvider),
  }
}

describe('docker-compose driver', function () {

  let sandbox
  let originalHome
  let execStub

  beforeEach(function () {
    sandbox = sinon.createSandbox()
    originalHome = process.env.HOME
    process.env.HOME = '/home/test'

    execStub = sandbox.stub(execAsyncModule, 'execAsync').resolves('')
    sandbox.stub(driverLogging, 'log')
    sandbox.stub(fs, 'statAsync').resolves({})
  })

  afterEach(function () {
    sandbox.restore()
    if (originalHome === undefined) {
      delete process.env.HOME
    } else {
      process.env.HOME = originalHome
    }
  })

  describe('launch', function () {

    it('should run "docker compose up -d" with the given services and no extra args by default', async function () {
      const driver = createDockerComposeDriver(makeNavy())

      await driver.launch(['api'])

      const [, args] = execStub.firstCall.args
      expect(args).to.include('up')
      expect(args).to.include('-d')
      expect(args).to.include('api')
    })

    it('should map opts.noDeps to --no-deps and opts.forceRecreate to --force-recreate', async function () {
      const driver = createDockerComposeDriver(makeNavy())

      await driver.launch(['api'], { noDeps: true, forceRecreate: true })

      const [, args] = execStub.firstCall.args
      expect(args).to.include('--no-deps')
      expect(args).to.include('--force-recreate')
    })

    it('should ignore unknown opts keys', async function () {
      const driver = createDockerComposeDriver(makeNavy())

      await driver.launch(['api'], { unknownOption: true })

      const [, args] = execStub.firstCall.args
      expect(args.includes('unknownOption')).to.equal(false)
    })

    it('should default services to an empty array if not given', async function () {
      const driver = createDockerComposeDriver(makeNavy())

      await driver.launch(undefined, {})

      const [, args] = execStub.firstCall.args
      expect(args.slice(-2)).to.eql(['up', '-d'])
    })

    it('should default opts to an empty object', async function () {
      const driver = createDockerComposeDriver(makeNavy())

      await driver.launch(['api'])

      expect(execStub.calledOnce).to.equal(true)
    })

    it('should still call exec when opts is null (treated falsy by checks)', async function () {
      const driver = createDockerComposeDriver(makeNavy())

      await driver.launch(['api'], null)

      expect(execStub.calledOnce).to.equal(true)
    })

  })

  describe('destroy', function () {

    it('should run kill followed by down -v', async function () {
      const driver = createDockerComposeDriver(makeNavy())

      await driver.destroy()

      expect(execStub.callCount).to.equal(2)
      expect(execStub.firstCall.args[1]).to.include('kill')
      expect(execStub.secondCall.args[1]).to.include('down')
      expect(execStub.secondCall.args[1]).to.include('-v')
    })

  })

  describe('start/stop/restart/kill', function () {

    [
      { method: 'start', cmd: 'start' },
      { method: 'stop', cmd: 'stop' },
      { method: 'restart', cmd: 'restart' },
      { method: 'kill', cmd: 'kill' },
    ].forEach(({ method, cmd }) => {
      it(`should call docker compose ${cmd} with the given services`, async function () {
        const driver = createDockerComposeDriver(makeNavy())

        await driver[method](['api'])

        const [, args] = execStub.firstCall.args
        expect(args).to.include(cmd)
        expect(args).to.include('api')
      })
    })

  })

  describe('rm', function () {

    it('should call docker compose rm -f -v with services', async function () {
      const driver = createDockerComposeDriver(makeNavy())

      await driver.rm(['api'])

      const [, args] = execStub.firstCall.args
      expect(args).to.include('rm')
      expect(args).to.include('-f')
      expect(args).to.include('-v')
      expect(args).to.include('api')
    })

    it('should default services to [] when not provided', async function () {
      const driver = createDockerComposeDriver(makeNavy())

      await driver.rm()

      const [, args] = execStub.firstCall.args
      expect(args).to.include('rm')
      expect(args).to.include('-f')
      expect(args).to.include('-v')
    })

  })

  describe('update', function () {

    it('should pull all services then relaunch only the running ones', async function () {
      const navy = makeNavy()
      const driver = createDockerComposeDriver(navy)
      sandbox.stub(dockerClient, 'listContainers').resolves([
        { Labels: { 'com.docker.compose.service': 'api' } },
        { Labels: { 'com.docker.compose.service': 'redis' } },
      ])

      await driver.update(['api', 'web', 'redis'])

      const pullCall = execStub.getCalls().find(c => c.args[1].includes('pull'))
      const relaunchCall = execStub.getCalls()
        .find(c => c.args[1].includes('up') && c.args[1].includes('--no-deps'))

      expect(pullCall.args[1]).to.include('api')
      expect(pullCall.args[1]).to.include('web')
      expect(pullCall.args[1]).to.include('redis')

      expect(relaunchCall.args[1]).to.include('api')
      expect(relaunchCall.args[1]).to.include('redis')
      expect(relaunchCall.args[1].includes('web')).to.equal(false)
    })

    it('should not call up when no services need relaunching', async function () {
      const driver = createDockerComposeDriver(makeNavy())
      sandbox.stub(dockerClient, 'listContainers').resolves([])

      await driver.update(['api'])

      const upCall = execStub.getCalls().find(c => c.args[1].includes('--no-deps'))
      expect(upCall).to.equal(undefined)
    })

    it('should default services to an empty array when not provided', async function () {
      const driver = createDockerComposeDriver(makeNavy())
      sandbox.stub(dockerClient, 'listContainers').resolves([])

      await driver.update()

      expect(execStub.firstCall.args[1]).to.include('pull')
    })

  })

  describe('spawnLogStream', function () {

    it('should call docker compose logs -f --tail=250 services with pipeLog', async function () {
      const driver = createDockerComposeDriver(makeNavy())

      await driver.spawnLogStream(['api'])

      const [, args, , opts] = execStub.firstCall.args
      expect(args).to.include('logs')
      expect(args).to.include('-f')
      expect(args).to.include('--tail=250')
      expect(args).to.include('api')
      expect(opts.maxBuffer).to.equal(Infinity)
    })

    it('should default services to [] when not provided', async function () {
      const driver = createDockerComposeDriver(makeNavy())

      await driver.spawnLogStream()

      const [, args] = execStub.firstCall.args
      expect(args).to.include('logs')
    })

  })

  describe('ps', function () {

    let listContainersStub
    let getContainerStub

    beforeEach(function () {
      listContainersStub = sandbox.stub(dockerClient, 'listContainers')
      getContainerStub = sandbox.stub(dockerClient, 'getContainer')
    })

    it('should map docker inspect output to a ServiceList of running services', async function () {
      const driver = createDockerComposeDriver(makeNavy({ normalisedName: 'env' }))
      listContainersStub.resolves([{ Id: 'c1' }])
      getContainerStub.returns({
        inspect: async () => ({
          Id: 'c1-full',
          Config: { Image: 'api:1', Labels: { 'com.docker.compose.service': 'api' } },
          State: { Running: true },
        })
      })

      const services = await driver.ps()

      expect(services).to.have.lengthOf(1)
      expect(services[0]).to.include({
        id: 'c1-full',
        name: 'api',
        image: 'api:1',
        status: Status.RUNNING,
      })
      expect(services[0].raw).to.have.property('Id', 'c1-full')
    })

    it('should mark non-running services as EXITED', async function () {
      const driver = createDockerComposeDriver(makeNavy())
      listContainersStub.resolves([{ Id: 'c1' }])
      getContainerStub.returns({
        inspect: async () => ({
          Id: 'c1', Config: { Image: 'a', Labels: { 'com.docker.compose.service': 'a' } }, State: { Running: false },
        })
      })

      const services = await driver.ps()

      expect(services[0].status).to.equal(Status.EXITED)
    })

    it('should add a service-specific label filter when service is provided', async function () {
      const driver = createDockerComposeDriver(makeNavy({ normalisedName: 'env' }))
      listContainersStub.resolves([])

      await driver.ps('api')

      const filter = listContainersStub.firstCall.args[0]
      expect(filter.filters.label).to.include('com.docker.compose.project=env')
      expect(filter.filters.label).to.include('com.docker.compose.service=api')
    })

  })

  describe('port', function () {

    it('should return the host port from container.NetworkSettings.Ports[<priv>/tcp]', async function () {
      const driver = createDockerComposeDriver(makeNavy())
      sandbox.stub(dockerClient, 'listContainers').resolves([{ Id: 'c1' }])
      sandbox.stub(dockerClient, 'getContainer').returns({
        inspect: async () => ({
          Id: 'c1',
          Config: { Image: 'a', Labels: { 'com.docker.compose.service': 'api' } },
          State: { Running: true },
          NetworkSettings: { Ports: { '80/tcp': [{ HostPort: '8080' }] } },
        })
      })

      expect(await driver.port('api', 80)).to.equal(8080)
    })

    it('should return null when no container is found for the service', async function () {
      const driver = createDockerComposeDriver(makeNavy())
      sandbox.stub(dockerClient, 'listContainers').resolves([])

      expect(await driver.port('api', 80)).to.equal(null)
    })

    it('should return null when port mapping is missing or empty', async function () {
      const driver = createDockerComposeDriver(makeNavy())
      sandbox.stub(dockerClient, 'listContainers').resolves([{ Id: 'c1' }])
      sandbox.stub(dockerClient, 'getContainer').returns({
        inspect: async () => ({
          Id: 'c1',
          Config: { Image: 'a', Labels: { 'com.docker.compose.service': 'api' } },
          State: { Running: true },
          NetworkSettings: { Ports: {} },
        })
      })

      expect(await driver.port('api', 80)).to.equal(null)
    })

    it('should default the index argument to 1 when not provided', async function () {
      const driver = createDockerComposeDriver(makeNavy())
      sandbox.stub(dockerClient, 'listContainers').resolves([{ Id: 'c1' }])
      sandbox.stub(dockerClient, 'getContainer').returns({
        inspect: async () => ({
          Id: 'c1',
          Config: { Image: 'a', Labels: { 'com.docker.compose.service': 'api' } },
          State: { Running: true },
          NetworkSettings: { Ports: { '80/tcp': [{ HostPort: '8080' }] } },
        })
      })

      expect(await driver.port('api', 80)).to.equal(8080)
    })

  })

  describe('writeConfig', function () {

    it('should write the YAML serialised config to the compiled compose path', async function () {
      const driver = createDockerComposeDriver(makeNavy({ normalisedName: 'env' }))
      const writeStub = sandbox.stub(fs, 'writeFileAsync').resolves()

      const config = { version: '3', services: { api: { image: 'api' } } }
      await driver.writeConfig(config)

      expect(writeStub.calledOnce).to.equal(true)
      expect(writeStub.firstCall.args[0]).to.contain('docker-compose.tmp.yml')
      const written = yaml.load(writeStub.firstCall.args[1])
      expect(written).to.eql(config)
    })

  })

  describe('getConfig', function () {

    it('should run docker compose config and parse the YAML output', async function () {
      const driver = createDockerComposeDriver(makeNavy({
        configProvider: { getNavyPath: async () => '/orig' },
      }))
      execStub.resolves('version: "3"\nservices:\n  api:\n    image: api:1\n')

      const config = await driver.getConfig()

      expect(config).to.eql({ version: '3', services: { api: { image: 'api:1' } } })
    })

  })

  describe('getLaunchedServiceNames', function () {

    it('should return the compose service names of all running containers', async function () {
      const driver = createDockerComposeDriver(makeNavy({ normalisedName: 'env' }))
      const listStub = sandbox.stub(dockerClient, 'listContainers').resolves([
        { Labels: { 'com.docker.compose.service': 'api' } },
        { Labels: { 'com.docker.compose.service': 'web' } },
      ])

      const names = await driver.getLaunchedServiceNames()

      expect(names).to.eql(['api', 'web'])
      const filter = listStub.firstCall.args[0]
      expect(filter.filters.label).to.include('com.docker.compose.project=env')
    })

  })

  describe('getAvailableServiceNames', function () {

    it('should return the keys of services from the parsed config', async function () {
      const driver = createDockerComposeDriver(makeNavy({
        configProvider: { getNavyPath: async () => '/orig' },
      }))
      execStub.resolves('services:\n  api:\n    image: a\n  web:\n    image: w\n')

      const names = await driver.getAvailableServiceNames()

      expect(names).to.eql(['api', 'web'])
    })

  })

})
