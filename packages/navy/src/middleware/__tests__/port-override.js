/* eslint-env mocha */

import { expect } from 'chai'
import portOverride from '../port-override'

describe('port-override middleware', function () {

  it('should leave service.ports untouched when no port state exists', function () {
    const config = { services: { api: { ports: ['80:80'] } } }
    const state = { services: {} }

    const result = portOverride(config, state)

    expect(result.services.api.ports).to.eql(['80:80'])
  })

  it('should leave ports untouched when state has the service but no _ports', function () {
    const config = { services: { api: { ports: ['80:80'] } } }
    const state = { services: { api: {} } }

    const result = portOverride(config, state)

    expect(result.services.api.ports).to.eql(['80:80'])
  })

  it('should override an internal port mapping with the configured external port', function () {
    const config = { services: { api: { ports: ['80', '443'] } } }
    const state = { services: { api: { _ports: { 80: 8080 } } } }

    const result = portOverride(config, state)

    expect(result.services.api.ports).to.include('443')
    expect(result.services.api.ports).to.include('8080:80')
    expect(result.services.api.ports).to.not.include('80')
  })

  it('should drop entries whose external port is falsy when port state exists', function () {
    const config = { services: { api: { ports: ['80', '443'] } } }
    const state = { services: { api: { _ports: { 80: undefined, 443: 4433 } } } }

    const result = portOverride(config, state)

    expect(result.services.api.ports).to.eql(['80', '4433:443'])
  })

  it('should produce an empty ports list when service.ports is missing and there are no internal overrides', function () {
    const config = { services: { api: { } } }
    const state = { services: { api: { _ports: { 80: undefined } } } }

    const result = portOverride(config, state)

    expect(result.services.api.ports).to.eql([])
  })

  it('should set ports to an empty array when neither the service nor state declare any ports', function () {
    const config = { services: { api: {} } }
    const state = { services: {} }

    const result = portOverride(config, state)

    expect(result.services.api.ports).to.eql([])
  })

  it('should preserve top-level config keys', function () {
    const config = { version: '3', services: { api: {} } }
    const state = { services: {} }

    const result = portOverride(config, state)

    expect(result).to.have.property('version', '3')
  })

})
