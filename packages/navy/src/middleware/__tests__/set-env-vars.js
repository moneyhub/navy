/* eslint-env mocha */

import { expect } from 'chai'
import setEnvVars from '../set-env-vars'

describe('set-env-vars middleware', function () {

  it('should leave the service environment unchanged when no state exists for it', function () {
    const config = { services: { api: { environment: { FOO: 'bar' } } } }
    const state = { services: {} }

    const result = setEnvVars(config, state)

    expect(result.services.api.environment).to.eql({ FOO: 'bar' })
  })

  it('should merge state.services[name].environment over the config environment', function () {
    const config = { services: { api: { environment: { FOO: 'bar', BAZ: 'qux' } } } }
    const state = { services: { api: { environment: { FOO: 'overridden', NEW: 'value' } } } }

    const result = setEnvVars(config, state)

    expect(result.services.api.environment).to.eql({
      FOO: 'overridden',
      BAZ: 'qux',
      NEW: 'value',
    })
  })

  it('should produce an empty environment when neither config nor state defines one', function () {
    const config = { services: { api: {} } }
    const state = { services: {} }

    const result = setEnvVars(config, state)

    expect(result.services.api.environment).to.eql({})
  })

  it('should preserve service config keys other than environment', function () {
    const config = { services: { api: { image: 'api:1', environment: { A: '1' } } } }
    const state = { services: { api: { environment: { B: '2' } } } }

    const result = setEnvVars(config, state)

    expect(result.services.api.image).to.equal('api:1')
    expect(result.services.api.environment).to.eql({ A: '1', B: '2' })
  })

})
