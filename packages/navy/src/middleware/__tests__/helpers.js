/* eslint-env mocha */

import { expect } from 'chai'
import { middlewareHelpers } from '../helpers'

describe('middlewareHelpers', function () {

  describe('rewriteServices', function () {

    it('should map every service in config.services through the mapper, preserving config', function () {
      const config = {
        version: '3',
        services: {
          api: { image: 'api:1', ports: ['80'] },
          web: { image: 'web:1' },
        },
        networks: { default: {} },
      }

      const result = middlewareHelpers.rewriteServices(config, (service, name) => ({
        ...service,
        image: name + '-rewritten',
      }))

      expect(result).to.have.property('version', '3')
      expect(result).to.have.property('networks').that.eql({ default: {} })
      expect(result.services.api).to.eql({ image: 'api-rewritten', ports: ['80'] })
      expect(result.services.web).to.eql({ image: 'web-rewritten' })
    })

    it('should treat a missing services property as an empty object', function () {
      const result = middlewareHelpers.rewriteServices({}, () => ({}))

      expect(result).to.have.property('services').that.eql({})
    })

  })

  describe('rewriteServicesWithState', function () {

    it('should pass per-service state into the mapper', function () {
      const config = {
        services: {
          api: { image: 'api' },
        },
      }
      const state = {
        services: {
          api: { _ports: { 80: 8080 } },
        },
      }

      const result = middlewareHelpers.rewriteServicesWithState(config, state, (service, name, serviceState) => ({
        ...service,
        meta: { name, hasState: !!serviceState, ports: serviceState && serviceState._ports },
      }))

      expect(result.services.api.meta).to.eql({
        name: 'api',
        hasState: true,
        ports: { 80: 8080 },
      })
    })

    it('should pass undefined service state when the service is not in state', function () {
      const config = { services: { web: { image: 'web' } } }
      const state = { services: {} }

      const result = middlewareHelpers.rewriteServicesWithState(config, state, (service, name, serviceState) => ({
        ...service,
        seenState: serviceState,
      }))

      expect(result.services.web.seenState).to.equal(undefined)
    })

    it('should normalise a null state to an empty services map', function () {
      const config = { services: { api: { image: 'api' } } }

      const result = middlewareHelpers.rewriteServicesWithState(config, null, (service, name, serviceState) => ({
        ...service,
        seenState: serviceState,
      }))

      expect(result.services.api.seenState).to.equal(undefined)
    })

    it('should preserve other keys on the config object', function () {
      const config = { version: '3', services: {}, volumes: { v1: {} } }

      const result = middlewareHelpers.rewriteServicesWithState(config, { services: {} }, s => s)

      expect(result.version).to.equal('3')
      expect(result.volumes).to.eql({ v1: {} })
    })

    it('should treat a missing services property on config as an empty object', function () {
      const result = middlewareHelpers.rewriteServicesWithState({}, { services: {} }, () => ({}))

      expect(result).to.have.property('services').that.eql({})
    })

  })

  describe('addVolumes', function () {

    it('should append the new volumes to existing service volumes', function () {
      const result = middlewareHelpers.addVolumes(
        { volumes: ['./local:/app'] },
        ['./extra:/extra']
      )

      expect(result).to.eql(['./local:/app', './extra:/extra'])
    })

    it('should treat a missing volumes property as an empty array', function () {
      const result = middlewareHelpers.addVolumes({}, ['./extra:/extra'])

      expect(result).to.eql(['./extra:/extra'])
    })

    it('should not mutate the existing volumes array on the service', function () {
      const original = ['./local:/app']
      const service = { volumes: original }

      middlewareHelpers.addVolumes(service, ['./extra:/extra'])

      expect(original).to.eql(['./local:/app'])
    })

  })

})
