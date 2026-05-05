/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import os from 'os'
import path from 'path'
import yaml from 'js-yaml'
import fs from 'fs'
import dockerClient from '../util/docker-client'
import * as httpsModule from '../util/https'
import * as execAsyncModule from '../util/exec-async'
import * as driverLogging from '../driver-logging'
import * as navyModule from '../navy'
import { resolveProxyImage, resolveDockerSocketPath, reconfigureHTTPProxy } from '../http-proxy'

describe('resolveProxyImage', function () {

  afterEach(function () {
    delete process.env.NAVY_HTTP_PROXY_IMAGE
  })

  it('should return the default image when no env var or navyFile config is provided', function () {
    expect(resolveProxyImage()).to.equal('navycloud/navy-proxy')
    expect(resolveProxyImage(null)).to.equal('navycloud/navy-proxy')
    expect(resolveProxyImage(undefined)).to.equal('navycloud/navy-proxy')
  })

  it('should return the default image when navyFile has no httpProxyImage', function () {
    expect(resolveProxyImage({})).to.equal('navycloud/navy-proxy')
    expect(resolveProxyImage({ plugins: [] })).to.equal('navycloud/navy-proxy')
  })

  it('should use httpProxyImage from navyFile when set', function () {
    const navyFile = { httpProxyImage: 'myregistry/custom-proxy:latest' }
    expect(resolveProxyImage(navyFile)).to.equal('myregistry/custom-proxy:latest')
  })

  it('should use NAVY_HTTP_PROXY_IMAGE env var when set', function () {
    process.env.NAVY_HTTP_PROXY_IMAGE = 'envregistry/env-proxy:v2'
    expect(resolveProxyImage()).to.equal('envregistry/env-proxy:v2')
  })

  it('should give NAVY_HTTP_PROXY_IMAGE env var precedence over navyFile httpProxyImage', function () {
    process.env.NAVY_HTTP_PROXY_IMAGE = 'envregistry/env-proxy:v2'
    const navyFile = { httpProxyImage: 'myregistry/custom-proxy:latest' }
    expect(resolveProxyImage(navyFile)).to.equal('envregistry/env-proxy:v2')
  })

  it('should give NAVY_HTTP_PROXY_IMAGE env var precedence over default', function () {
    process.env.NAVY_HTTP_PROXY_IMAGE = 'override/image:tag'
    expect(resolveProxyImage(null)).to.equal('override/image:tag')
  })

  it('should fall back to default when httpProxyImage is an empty string', function () {
    expect(resolveProxyImage({ httpProxyImage: '' })).to.equal('navycloud/navy-proxy')
  })

  it('should fall back to default when NAVY_HTTP_PROXY_IMAGE is an empty string', function () {
    process.env.NAVY_HTTP_PROXY_IMAGE = ''
    expect(resolveProxyImage()).to.equal('navycloud/navy-proxy')
  })

})

describe('resolveDockerSocketPath', function () {

  let originalDockerHost

  beforeEach(function () {
    originalDockerHost = process.env.DOCKER_HOST
    delete process.env.DOCKER_HOST
  })

  afterEach(function () {
    if (originalDockerHost === undefined) {
      delete process.env.DOCKER_HOST
    } else {
      process.env.DOCKER_HOST = originalDockerHost
    }
  })

  it('should default to /var/run/docker.sock when DOCKER_HOST is not set', function () {
    expect(resolveDockerSocketPath()).to.equal('/var/run/docker.sock')
  })

  it('should default to /var/run/docker.sock when DOCKER_HOST is empty', function () {
    process.env.DOCKER_HOST = ''
    expect(resolveDockerSocketPath()).to.equal('/var/run/docker.sock')
  })

  it('should extract the socket path when DOCKER_HOST uses the unix:// scheme', function () {
    process.env.DOCKER_HOST = 'unix:///home/runner/setup-docker-action-abc/docker.sock'
    expect(resolveDockerSocketPath()).to.equal('/home/runner/setup-docker-action-abc/docker.sock')
  })

  it('should fall back to default when DOCKER_HOST is unix:// with no path', function () {
    process.env.DOCKER_HOST = 'unix://'
    expect(resolveDockerSocketPath()).to.equal('/var/run/docker.sock')
  })

  it('should fall back to default when DOCKER_HOST uses tcp:// scheme', function () {
    process.env.DOCKER_HOST = 'tcp://localhost:2375'
    expect(resolveDockerSocketPath()).to.equal('/var/run/docker.sock')
  })

})

describe('reconfigureHTTPProxy', function () {

  let sandbox
  let writeFileSyncStub
  let existsSyncStub
  let listNetworksStub
  let execStub
  let originalDockerHost

  const composeFile = path.join(os.tmpdir(), 'navyinternaldockercompose.yml')

  beforeEach(function () {
    originalDockerHost = process.env.DOCKER_HOST
    delete process.env.DOCKER_HOST

    sandbox = sinon.createSandbox()

    listNetworksStub = sandbox.stub(dockerClient, 'listNetworks')
    sandbox.stub(httpsModule, 'getCertsPath').resolves('')
    sandbox.stub(driverLogging, 'log')
    sandbox.stub(navyModule, 'getLaunchedNavyNames').resolves([])

    execStub = sandbox.stub(execAsyncModule, 'execAsync').resolves('')
    writeFileSyncStub = sandbox.stub(fs, 'writeFileSync')
    existsSyncStub = sandbox.stub(fs, 'existsSync').returns(false)
  })

  afterEach(function () {
    sandbox.restore()
    if (originalDockerHost === undefined) {
      delete process.env.DOCKER_HOST
    } else {
      process.env.DOCKER_HOST = originalDockerHost
    }
  })

  it('should default opts.navies via getLaunchedNavyNames when not supplied', async function () {
    listNetworksStub.resolves([])
    navyModule.getLaunchedNavyNames.resolves(['navyA'])

    await reconfigureHTTPProxy()

    expect(navyModule.getLaunchedNavyNames.calledOnce).to.equal(true)
  })

  it('should write a docker-compose config containing only matching docker-compose networks', async function () {
    listNetworksStub.resolves([
      { Name: 'navyA_default' },
      { Name: 'navyB_default' },
      { Name: 'host' },
      { Name: 'navyB_other' },
      { Name: 'name-without-underscore' },
    ])

    await reconfigureHTTPProxy({ navies: ['navyA'] })

    expect(writeFileSyncStub.calledOnce).to.equal(true)
    expect(writeFileSyncStub.firstCall.args[0]).to.equal(composeFile)
    const written = yaml.load(writeFileSyncStub.firstCall.args[1])
    expect(written.networks).to.have.property('navyA_default').that.eql({ external: true })
    expect(written.networks).to.not.have.property('navyB_default')
    expect(written.networks).to.not.have.property('host')
    expect(written.services['nginx-proxy'].image).to.equal('navycloud/navy-proxy')
    expect(written.services['nginx-proxy'].ports).to.eql(['80:80'])
    expect(written.services['nginx-proxy'].volumes[0])
      .to.equal('/var/run/docker.sock:/tmp/docker.sock:ro')
  })

  it('should mount certs and expose port 443 when a certs path is available', async function () {
    httpsModule.getCertsPath.resolves('/certs')
    listNetworksStub.resolves([])

    await reconfigureHTTPProxy({ navies: [] })

    const written = yaml.load(writeFileSyncStub.firstCall.args[1])
    expect(written.services['nginx-proxy'].ports).to.eql(['80:80', '443:443'])
    expect(written.services['nginx-proxy'].volumes).to.include('/certs:/etc/nginx/certs')
    expect(written.services['nginx-proxy'].volumes).to.include('/certs:/etc/nginx/dhparam')
  })

  it('should pass the configured proxy image from navyFile through to the compose config', async function () {
    listNetworksStub.resolves([])

    await reconfigureHTTPProxy({ navies: [], navyFile: { httpProxyImage: 'custom/proxy:1' } })

    const written = yaml.load(writeFileSyncStub.firstCall.args[1])
    expect(written.services['nginx-proxy'].image).to.equal('custom/proxy:1')
  })

  it('should run docker compose up after writing the config', async function () {
    listNetworksStub.resolves([])

    await reconfigureHTTPProxy({ navies: [] })

    const upCall = execStub.getCalls()
      .find(c => Array.isArray(c.args[1]) && c.args[1].includes('up'))
    // eslint-disable-next-line no-unused-expressions
    expect(upCall).to.exist
    expect(upCall.args[0]).to.equal('docker compose')
    expect(upCall.args[1]).to.eql(['-f', composeFile, '-p', 'navyinternal', 'up', '-d'])
  })

  it('should rm the existing nginx-proxy container before reconfiguring when restart=true and the file exists', async function () {
    listNetworksStub.resolves([])
    existsSyncStub.withArgs(composeFile).returns(true)

    await reconfigureHTTPProxy({ navies: [], restart: true })

    const rmCall = execStub.getCalls()
      .find(c => Array.isArray(c.args[1]) && c.args[1].includes('rm'))
    // eslint-disable-next-line no-unused-expressions
    expect(rmCall).to.exist
    expect(rmCall.args[1]).to.eql([
      '-f', composeFile,
      '-p', 'navyinternal', 'rm', '-s', '-f', 'nginx-proxy',
    ])
  })

  it('should skip the rm step when restart=true but no compose file exists yet', async function () {
    listNetworksStub.resolves([])
    existsSyncStub.withArgs(composeFile).returns(false)

    await reconfigureHTTPProxy({ navies: [], restart: true })

    const rmCall = execStub.getCalls()
      .find(c => Array.isArray(c.args[1]) && c.args[1].includes('rm'))
    expect(rmCall).to.equal(undefined)
  })

})
