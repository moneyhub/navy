/* eslint-env mocha */

import { expect } from 'chai'
import develop from '../develop'

describe('develop middleware', function () {

  it('should return the service unchanged when no service state exists', function () {
    const config = { services: { api: { image: 'api', command: 'npm start' } } }
    const state = { services: {} }

    const result = develop(config, state)

    expect(result.services.api).to.eql({ image: 'api', command: 'npm start' })
  })

  it('should return the service unchanged when state has no _develop entry', function () {
    const config = { services: { api: { image: 'api', command: 'npm start' } } }
    const state = { services: { api: { unrelated: true } } }

    const result = develop(config, state)

    expect(result.services.api).to.eql({ image: 'api', command: 'npm start' })
  })

  it('should set stdin_open and append _develop.mounts as volumes', function () {
    const config = {
      services: {
        api: {
          image: 'api',
          volumes: ['./preexisting:/preexisting'],
          command: 'npm start',
        },
      },
    }
    const state = {
      services: {
        api: {
          _develop: {
            mounts: { './local': '/app', './node_modules': '/app/node_modules' },
          },
        },
      },
    }

    const result = develop(config, state)

    expect(result.services.api.stdin_open).to.equal(true)
    expect(result.services.api.volumes).to.include('./preexisting:/preexisting')
    expect(result.services.api.volumes).to.include('./local:/app')
    expect(result.services.api.volumes).to.include('./node_modules:/app/node_modules')
  })

  it('should override the command when _develop.command is set', function () {
    const config = { services: { api: { image: 'api', command: 'npm start' } } }
    const state = {
      services: {
        api: { _develop: { mounts: {}, command: 'npm run dev' } },
      },
    }

    const result = develop(config, state)

    expect(result.services.api.command).to.equal('npm run dev')
  })

  it('should keep the existing command when _develop.command is not set', function () {
    const config = { services: { api: { image: 'api', command: 'npm start' } } }
    const state = {
      services: { api: { _develop: { mounts: {} } } },
    }

    const result = develop(config, state)

    expect(result.services.api.command).to.equal('npm start')
  })

})
