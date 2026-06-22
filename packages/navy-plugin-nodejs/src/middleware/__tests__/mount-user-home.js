/* eslint-env mocha */

import { expect } from 'chai'

import mountUserHome from '../mount-user-home'

describe('navy-plugin-nodejs/middleware/mount-user-home', function () {

  let originalHome

  beforeEach(function () {
    originalHome = process.env.HOME
    process.env.HOME = '/home/test-user'
  })

  afterEach(function () {
    if (originalHome === undefined) {
      delete process.env.HOME
    } else {
      process.env.HOME = originalHome
    }
  })

  describe('default export', function () {

    it('should pass through the original config when no services have _develop state', function () {
      const config = {
        services: {
          web: { image: 'nginx' },
          api: { image: 'node' },
        },
      }
      const state = { services: {} }

      const result = mountUserHome(config, state)

      expect(result.services.web).to.eql({ image: 'nginx' })
      expect(result.services.api).to.eql({ image: 'node' })
    })

    it('should add a HOME volume mount for services in _develop state', function () {
      const config = {
        services: {
          web: { image: 'node' },
        },
      }
      const state = {
        services: {
          web: { _develop: { mounts: {} } },
        },
      }

      const result = mountUserHome(config, state)

      expect(result.services.web.volumes).to.eql([
        '/home/test-user:/home/test-user',
      ])
    })

    it('should append the HOME volume to existing volumes when in develop mode', function () {
      const config = {
        services: {
          web: { image: 'node', volumes: ['/data:/data'] },
        },
      }
      const state = {
        services: {
          web: { _develop: { mounts: {} } },
        },
      }

      const result = mountUserHome(config, state)

      expect(result.services.web.volumes).to.eql([
        '/data:/data',
        '/home/test-user:/home/test-user',
      ])
    })

    it('should leave services without _develop state untouched', function () {
      const config = {
        services: {
          web: { image: 'node', volumes: ['/data:/data'] },
        },
      }
      const state = {
        services: {
          web: {},
        },
      }

      const result = mountUserHome(config, state)

      expect(result.services.web).to.eql({ image: 'node', volumes: ['/data:/data'] })
    })

    it('should preserve the rest of the config object', function () {
      const config = {
        version: '3',
        services: { web: {} },
        networks: { default: {} },
      }
      const state = { services: {} }

      const result = mountUserHome(config, state)

      expect(result.version).to.equal('3')
      expect(result.networks).to.eql({ default: {} })
    })

  })

})
