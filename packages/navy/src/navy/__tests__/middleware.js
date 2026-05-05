/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import { middlewareRunner } from '../middleware'

function makeNavy({ driver, registered = [] } = {}) {
  return {
    name: 'env',
    normalisedName: 'env',
    getDriver: sinon.stub().resolves(driver),
    ensurePluginsLoaded: sinon.stub().resolves(),
    getNavyFile: sinon.stub().resolves(null),
    externalIP: sinon.stub().resolves('127.0.0.1'),
    _registeredMiddleware: registered,
  }
}

function makeDriver() {
  return {
    getConfig: sinon.stub().resolves({ services: {} }),
    writeConfig: sinon.stub().resolves(),
  }
}

describe('navy/middleware', function () {

  describe('middlewareRunner', function () {

    it('should be a no-op when the navy has no driver', async function () {
      const navy = makeNavy({ driver: null })

      await middlewareRunner(navy, { services: {} })

      expect(navy.ensurePluginsLoaded.called).to.equal(false)
    })

    it('should ensure plugins are loaded before running middleware', async function () {
      const driver = makeDriver()
      const navy = makeNavy({ driver })

      await middlewareRunner(navy, { services: {} })

      expect(navy.ensurePluginsLoaded.calledOnce).to.equal(true)
    })

    it('should pipe the driver config through default + registered middleware and write the result', async function () {
      const driver = makeDriver()
      const tagged = sinon.stub().callsFake(async config => ({ ...config, _tagged: true }))
      const navy = makeNavy({ driver, registered: [tagged] })

      await middlewareRunner(navy, { services: {} })

      expect(tagged.calledOnce).to.equal(true)
      expect(driver.writeConfig.calledOnce).to.equal(true)
      const written = driver.writeConfig.firstCall.args[0]
      expect(written).to.have.property('_tagged', true)
    })

  })

})
