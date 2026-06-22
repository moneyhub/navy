/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import stripAnsi from 'strip-ansi'

describe('cli/ps', function () {

  let sandbox
  let getNavyStub
  let getUrlFromServiceStub
  let navyStub
  let consoleLogStub
  let originalIsTTY
  let originalGetWindowSize
  let psCli

  function makeService(overrides = {}) {
    return {
      id: 'abcdefghijklmnop',
      name: 'api',
      image: 'navy/api:latest',
      status: 'running',
      raw: undefined,
      ...overrides,
    }
  }

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    navyStub = {
      ps: sandbox.stub().resolves([]),
      getState: sandbox.stub().resolves(null),
    }

    getNavyStub = sandbox.stub().returns(navyStub)
    getUrlFromServiceStub = sandbox.stub().returns(null)
    consoleLogStub = sandbox.stub(console, 'log')

    originalIsTTY = process.stdout.isTTY
    originalGetWindowSize = process.stdout.getWindowSize
    process.stdout.isTTY = false
    process.stdout.getWindowSize = () => [200, 50]

    psCli = proxyquire.noCallThru()('../ps', {
      '../': { getNavy: getNavyStub },
      '../util/service-host': { getUrlFromService: getUrlFromServiceStub },
    })
  })

  afterEach(function () {
    sandbox.restore()
    process.stdout.isTTY = originalIsTTY
    if (originalGetWindowSize === undefined) {
      delete process.stdout.getWindowSize
    } else {
      process.stdout.getWindowSize = originalGetWindowSize
    }
  })

  function lastLoggedString() {
    const last = consoleLogStub.lastCall
    return last ? String(last.args[0]) : ''
  }

  describe('default export', function () {

    it('should resolve the navy instance using opts.navy', async function () {
      await psCli({ navy: 'env-1' })

      expect(getNavyStub.calledOnce).to.equal(true)
      expect(getNavyStub.firstCall.args[0]).to.equal('env-1')
    })

    it('should print JSON when opts.json is true', async function () {
      const services = [makeService({ id: 'svc-id', name: 'api' })]
      navyStub.ps.resolves(services)

      await psCli({ navy: 'env-1', json: true })

      expect(consoleLogStub.calledOnce).to.equal(true)
      expect(consoleLogStub.firstCall.args[0]).to.equal(JSON.stringify(services, null, 2))
    })

    it('should render the wide 6-column table by default in non-TTY', async function () {
      navyStub.ps.resolves([makeService()])

      await psCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.contain('IMAGE')
      expect(text).to.contain('navy/api:latest')
    })

    it('should render the small 5-column table when TTY width is below threshold', async function () {
      process.stdout.isTTY = true
      process.stdout.getWindowSize = () => [80, 50]
      navyStub.ps.resolves([makeService()])

      await psCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.contain('NAME')
      expect(text).to.contain('STATUS')
      expect(text).to.not.contain('IMAGE')
    })

    it('should render the wide 6-column table when TTY width is at or above threshold', async function () {
      process.stdout.isTTY = true
      process.stdout.getWindowSize = () => [200, 50]
      navyStub.ps.resolves([makeService()])

      await psCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.contain('IMAGE')
    })

    it('should truncate the service id to 12 characters', async function () {
      navyStub.ps.resolves([makeService({ id: '0123456789abcdef9999' })])

      await psCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.contain('0123456789ab')
      expect(text).not.to.contain('0123456789abcdef')
    })

  })

  describe('getStatus (via default export)', function () {

    it('should print the status as-is when not exited and no state present', async function () {
      navyStub.ps.resolves([makeService({ status: 'running' })])

      await psCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.contain('running')
      expect(text).not.to.contain('(development)')
      expect(text).not.to.contain('@')
    })

    it('should render the exited status (taking the chalk.red branch)', async function () {
      navyStub.ps.resolves([makeService({ status: 'exited' })])

      await psCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.contain('exited')
    })

    it('should append (development) when the service has _develop set in state', async function () {
      navyStub.ps.resolves([makeService({ name: 'api' })])
      navyStub.getState.resolves({ services: { api: { _develop: true } } })

      await psCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.contain('(development)')
    })

    it('should append the @ tag when the service has _tag set in state', async function () {
      navyStub.ps.resolves([makeService({ name: 'api' })])
      navyStub.getState.resolves({ services: { api: { _tag: 'v1.2.3' } } })

      await psCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.contain('@ v1.2.3')
    })

    it('should append both (development) and the @ tag when both are set', async function () {
      navyStub.ps.resolves([makeService({ name: 'api' })])
      navyStub.getState.resolves({ services: { api: { _develop: true, _tag: 'v9' } } })

      await psCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.contain('(development)')
      expect(text).to.contain('@ v9')
    })

    it('should not annotate the status when state has no entry for the service name', async function () {
      navyStub.ps.resolves([makeService({ name: 'api' })])
      navyStub.getState.resolves({ services: { web: { _develop: true } } })

      await psCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).not.to.contain('(development)')
    })

    it('should handle a state object with no services map', async function () {
      navyStub.ps.resolves([makeService({ name: 'api' })])
      navyStub.getState.resolves({})

      await psCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.contain('running')
      expect(text).not.to.contain('(development)')
    })

  })

  describe('getPorts (via default export)', function () {

    it('should render - when raw is missing', async function () {
      navyStub.ps.resolves([makeService({ raw: undefined })])

      await psCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.match(/-/)
    })

    it('should render - when raw.NetworkSettings is missing', async function () {
      navyStub.ps.resolves([makeService({ raw: {} })])

      await psCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.match(/-/)
    })

    it('should render - when raw.NetworkSettings.Ports is missing', async function () {
      navyStub.ps.resolves([makeService({ raw: { NetworkSettings: {} } })])

      await psCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.match(/-/)
    })

    it('should render only the port key when there are no host bindings', async function () {
      navyStub.ps.resolves([makeService({
        raw: { NetworkSettings: { Ports: { '8080/tcp': null } } },
      })])

      await psCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.contain('8080/tcp')
      expect(text).not.to.contain('->')
    })

    it('should render HostPort->portKey when bindings exist', async function () {
      navyStub.ps.resolves([makeService({
        raw: {
          NetworkSettings: {
            Ports: {
              '8080/tcp': [{ HostPort: '32001' }, { HostPort: '32002' }],
            },
          },
        },
      })])

      await psCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.contain('32001, 32002->8080/tcp')
    })

    it('should join multiple port keys with commas', async function () {
      navyStub.ps.resolves([makeService({
        raw: {
          NetworkSettings: {
            Ports: {
              '8080/tcp': [{ HostPort: '32001' }],
              '9090/tcp': null,
            },
          },
        },
      })])

      await psCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.contain('32001->8080/tcp')
      expect(text).to.contain('9090/tcp')
    })

  })

  describe('getDisplayUrl (via default export)', function () {

    it('should render - when getUrlFromService returns null', async function () {
      getUrlFromServiceStub.returns(null)
      navyStub.ps.resolves([makeService()])

      await psCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.match(/\s-\s|\s-$/)
    })

    it('should render the URL string when getUrlFromService returns a string', async function () {
      getUrlFromServiceStub.returns('https://api.example.local')
      navyStub.ps.resolves([makeService()])

      await psCli({ navy: 'env-1' })

      const text = stripAnsi(lastLoggedString())
      expect(text).to.contain('https://api.example.local')
    })

  })

})
