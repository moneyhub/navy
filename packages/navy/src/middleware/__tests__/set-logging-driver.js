/* eslint-env mocha */

import { expect } from 'chai'
import setLoggingDriver from '../set-logging-driver'

describe('set-logging-driver middleware', function () {

  it('should produce an empty logging object when neither config nor state set one', function () {
    const config = { services: { api: {} } }
    const state = { services: {} }

    const result = setLoggingDriver(config, state)

    expect(result.services.api.logging).to.eql({})
  })

  it('should pass the config logging through when state has no logging entry', function () {
    const config = { services: { api: { logging: { driver: 'json-file' } } } }
    const state = { services: { api: {} } }

    const result = setLoggingDriver(config, state)

    expect(result.services.api.logging).to.eql({ driver: 'json-file' })
  })

  it('should merge state logging over config logging', function () {
    const config = { services: { api: { logging: { driver: 'json-file', options: { 'max-size': '10m' } } } } }
    const state = { services: { api: { logging: { driver: 'syslog' } } } }

    const result = setLoggingDriver(config, state)

    expect(result.services.api.logging).to.eql({
      driver: 'syslog',
      options: { 'max-size': '10m' },
    })
  })

  it('should preserve other service config keys', function () {
    const config = { services: { api: { image: 'api:1' } } }
    const state = { services: { api: { logging: { driver: 'syslog' } } } }

    const result = setLoggingDriver(config, state)

    expect(result.services.api.image).to.equal('api:1')
    expect(result.services.api.logging).to.eql({ driver: 'syslog' })
  })

})
