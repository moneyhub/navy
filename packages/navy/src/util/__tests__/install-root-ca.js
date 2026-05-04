/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import path from 'path'
import { NavyError } from '../../errors'

describe('util/install-root-ca', function () {

  let sandbox
  let fsStub
  let osStub
  let execFileSyncStub
  let installRootCaModule
  let platformStub

  const caPath = '/tmp/navy/ca.crt'

  function certutilPath(systemRoot = 'C:\\Windows') {
    return path.join(systemRoot, 'System32', 'certutil.exe')
  }

  function expectThrownMessage(fn, messagePattern) {
    let caught
    try {
      fn()
    } catch (err) {
      caught = err
    }
    expect(caught).to.not.equal(undefined)
    expect(String(caught.message)).to.match(messagePattern)
  }

  function loadModule() {
    installRootCaModule = proxyquire.noCallThru()('../install-root-ca', {
      '../errors': { NavyError },
      fs: fsStub,
      os: osStub,
      child_process: { execFileSync: execFileSyncStub },
    })
  }

  beforeEach(function () {
    sandbox = sinon.createSandbox()

    fsStub = {
      existsSync: sandbox.stub(),
    }
    osStub = {
      homedir: sandbox.stub().returns('/Users/tester'),
    }
    execFileSyncStub = sandbox.stub()
    platformStub = sandbox.stub(process, 'platform').value('darwin')

    loadModule()
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('caughtErrorMessage', function () {

    it('should return nullish values as strings', function () {
      expect(installRootCaModule.caughtErrorMessage(null)).to.equal('null')
      expect(installRootCaModule.caughtErrorMessage(undefined)).to.equal('undefined')
    })

    it('should return message text when it is present', function () {
      expect(installRootCaModule.caughtErrorMessage({ message: 'object failed' })).to.equal('object failed')
      expect(installRootCaModule.caughtErrorMessage(new Error('error failed'))).to.equal('error failed')
    })

    it('should fall back to String(e) when no usable message exists', function () {
      expect(installRootCaModule.caughtErrorMessage('plain failure')).to.equal('plain failure')
      expect(installRootCaModule.caughtErrorMessage({})).to.equal('[object Object]')
      expect(installRootCaModule.caughtErrorMessage({ message: '' })).to.equal('[object Object]')
    })

  })

  describe('installRootCaToTrustStore', function () {

    it('should throw when the CA file does not exist', function () {
      fsStub.existsSync.returns(false)

      expectThrownMessage(
        () => installRootCaModule.installRootCaToTrustStore(caPath),
        /CA certificate not found/
      )
    })

    describe('macOS', function () {

      beforeEach(function () {
        platformStub.value('darwin')
        fsStub.existsSync.callsFake(p => p === caPath || p.endsWith('login.keychain-db'))
      })

      it('should add the CA to the login keychain when found', function () {
        installRootCaModule.installRootCaToTrustStore(caPath)

        expect(execFileSyncStub.calledOnce).to.equal(true)
        expect(execFileSyncStub.firstCall.args[0]).to.equal('security')
        expect(execFileSyncStub.firstCall.args[1]).to.eql([
          'add-trusted-cert',
          '-d',
          '-r', 'trustRoot',
          '-k', '/Users/tester/Library/Keychains/login.keychain-db',
          caPath,
        ])
      })

      it('should fall back to login.keychain when login.keychain-db is missing', function () {
        fsStub.existsSync.callsFake(p => p === caPath || p.endsWith('login.keychain'))

        installRootCaModule.installRootCaToTrustStore(caPath)

        expect(execFileSyncStub.firstCall.args[1][5]).to.equal('/Users/tester/Library/Keychains/login.keychain')
      })

      it('should throw when no login keychain can be found', function () {
        fsStub.existsSync.callsFake(p => p === caPath)

        expectThrownMessage(
          () => installRootCaModule.installRootCaToTrustStore(caPath),
          /Could not find your macOS login keychain/
        )
      })

      it('should wrap security command failures in NavyError', function () {
        execFileSyncStub.throws(new Error('security failed'))

        expectThrownMessage(
          () => installRootCaModule.installRootCaToTrustStore(caPath),
          /Could not add the Navy root CA/
        )
      })

      it('should use error.message when the thrown value exposes one', function () {
        execFileSyncStub.throws({ message: 'security object failed' })

        expectThrownMessage(
          () => installRootCaModule.installRootCaToTrustStore(caPath),
          /security object failed/
        )
      })

      it('should stringify non-Error exec failures', function () {
        execFileSyncStub.throws('plain failure')

        expectThrownMessage(
          () => installRootCaModule.installRootCaToTrustStore(caPath),
          /plain failure/
        )
      })

      it('should stringify null exec failures', function () {
        execFileSyncStub.callsFake(() => {
          const thrown = null
          throw thrown
        })

        expectThrownMessage(
          () => installRootCaModule.installRootCaToTrustStore(caPath),
          /null/
        )
      })

    })

    describe('linux', function () {

      beforeEach(function () {
        platformStub.value('linux')
        fsStub.existsSync.callsFake(p => p === caPath)
      })

      it('should install via update-ca-certificates on Debian-style systems', function () {
        fsStub.existsSync.callsFake(p => {
          if (p === caPath) return true
          if (p === '/usr/sbin/update-ca-certificates') return true
          return false
        })

        installRootCaModule.installRootCaToTrustStore(caPath)

        expect(execFileSyncStub.callCount).to.equal(2)
        expect(execFileSyncStub.firstCall.args[0]).to.equal('sudo')
        expect(execFileSyncStub.firstCall.args[1]).to.eql([
          'cp',
          caPath,
          '/usr/local/share/ca-certificates/navy-dev-ca.crt',
        ])
        expect(execFileSyncStub.secondCall.args[1]).to.eql(['/usr/sbin/update-ca-certificates'])
      })

      it('should wrap Debian install failures in NavyError', function () {
        fsStub.existsSync.callsFake(p => {
          if (p === caPath) return true
          if (p === '/usr/sbin/update-ca-certificates') return true
          return false
        })
        execFileSyncStub.throws(new Error('sudo denied'))

        expectThrownMessage(
          () => installRootCaModule.installRootCaToTrustStore(caPath),
          /update-ca-certificates/
        )
      })

      it('should use error.message for Debian install failures when present', function () {
        fsStub.existsSync.callsFake(p => {
          if (p === caPath) return true
          if (p === '/usr/sbin/update-ca-certificates') return true
          return false
        })
        execFileSyncStub.throws({ message: 'debian object failed' })

        expectThrownMessage(
          () => installRootCaModule.installRootCaToTrustStore(caPath),
          /debian object failed/
        )
      })

      it('should stringify null Debian install failures', function () {
        fsStub.existsSync.callsFake(p => {
          if (p === caPath) return true
          if (p === '/usr/sbin/update-ca-certificates') return true
          return false
        })
        execFileSyncStub.callsFake(() => {
          const thrown = null
          throw thrown
        })

        expectThrownMessage(
          () => installRootCaModule.installRootCaToTrustStore(caPath),
          /null/
        )
      })

      it('should install via update-ca-trust on Fedora-style systems', function () {
        fsStub.existsSync.callsFake(p => {
          if (p === caPath) return true
          if (p === '/usr/bin/update-ca-trust') return true
          return false
        })

        installRootCaModule.installRootCaToTrustStore(caPath)

        expect(execFileSyncStub.callCount).to.equal(2)
        expect(execFileSyncStub.secondCall.args[1]).to.eql(['/usr/bin/update-ca-trust', 'extract'])
      })

      it('should wrap Fedora install failures in NavyError', function () {
        fsStub.existsSync.callsFake(p => {
          if (p === caPath) return true
          if (p === '/usr/bin/update-ca-trust') return true
          return false
        })
        execFileSyncStub.throws(new Error('trust failed'))

        expectThrownMessage(
          () => installRootCaModule.installRootCaToTrustStore(caPath),
          /update-ca-trust/
        )
      })

      it('should use error.message for Fedora install failures when present', function () {
        fsStub.existsSync.callsFake(p => {
          if (p === caPath) return true
          if (p === '/usr/bin/update-ca-trust') return true
          return false
        })
        execFileSyncStub.throws({ message: 'fedora object failed' })

        expectThrownMessage(
          () => installRootCaModule.installRootCaToTrustStore(caPath),
          /fedora object failed/
        )
      })

      it('should stringify null Fedora install failures', function () {
        fsStub.existsSync.callsFake(p => {
          if (p === caPath) return true
          if (p === '/usr/bin/update-ca-trust') return true
          return false
        })
        execFileSyncStub.callsFake(() => {
          const thrown = null
          throw thrown
        })

        expectThrownMessage(
          () => installRootCaModule.installRootCaToTrustStore(caPath),
          /null/
        )
      })

      it('should throw when no supported Linux tooling is present', function () {
        expectThrownMessage(
          () => installRootCaModule.installRootCaToTrustStore(caPath),
          /Automatic Linux install needs/
        )
      })

    })

    describe('windows', function () {

      beforeEach(function () {
        platformStub.value('win32')
        fsStub.existsSync.callsFake(p => p === caPath)
      })

      it('should add the CA via certutil when available', function () {
        const certutil = certutilPath()
        fsStub.existsSync.callsFake(p => p === caPath || p === certutil)

        installRootCaModule.installRootCaToTrustStore(caPath)

        expect(execFileSyncStub.calledOnce).to.equal(true)
        expect(execFileSyncStub.firstCall.args[0]).to.equal(certutil)
        expect(execFileSyncStub.firstCall.args[1]).to.eql(['-user', '-addstore', 'Root', caPath])
      })

      it('should use SystemRoot from the environment when set', function () {
        const previousSystemRoot = process.env.SystemRoot
        process.env.SystemRoot = 'D:\\WinRoot'
        const certutil = certutilPath('D:\\WinRoot')
        fsStub.existsSync.callsFake(p => p === caPath || p === certutil)

        try {
          installRootCaModule.installRootCaToTrustStore(caPath)

          expect(execFileSyncStub.firstCall.args[0]).to.equal(certutil)
        } finally {
          if (previousSystemRoot === undefined) {
            delete process.env.SystemRoot
          } else {
            process.env.SystemRoot = previousSystemRoot
          }
        }
      })

      it('should throw when certutil.exe is missing', function () {
        expectThrownMessage(
          () => installRootCaModule.installRootCaToTrustStore(caPath),
          /certutil.exe not found/
        )
      })

      it('should wrap certutil failures in NavyError', function () {
        const certutil = certutilPath()
        fsStub.existsSync.callsFake(p => p === caPath || p === certutil)
        execFileSyncStub.throws(new Error('certutil failed'))

        expectThrownMessage(
          () => installRootCaModule.installRootCaToTrustStore(caPath),
          /Trusted Root store/
        )
      })

      it('should use error.message for certutil failures when present', function () {
        const certutil = certutilPath()
        fsStub.existsSync.callsFake(p => p === caPath || p === certutil)
        execFileSyncStub.throws({ message: 'certutil object failed' })

        expectThrownMessage(
          () => installRootCaModule.installRootCaToTrustStore(caPath),
          /certutil object failed/
        )
      })

      it('should stringify null certutil failures', function () {
        const certutil = certutilPath()
        fsStub.existsSync.callsFake(p => p === caPath || p === certutil)
        execFileSyncStub.callsFake(() => {
          const thrown = null
          throw thrown
        })

        expectThrownMessage(
          () => installRootCaModule.installRootCaToTrustStore(caPath),
          /null/
        )
      })

    })

    it('should throw on unsupported platforms', function () {
      platformStub.value('freebsd')
      fsStub.existsSync.returns(true)

      expectThrownMessage(
        () => installRootCaModule.installRootCaToTrustStore(caPath),
        /not supported on freebsd/
      )
    })

  })

})
