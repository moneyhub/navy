/* eslint-env mocha */

import { expect } from 'chai'
import setImage from '../set-image'

describe('set-image middleware', function () {

  it('should leave the image unchanged when no state image is set', function () {
    const config = { services: { api: { image: 'api:1' } } }
    const state = { services: { api: {} } }

    const result = setImage(config, state)

    expect(result.services.api.image).to.equal('api:1')
  })

  it('should leave the image unchanged when there is no service state at all', function () {
    const config = { services: { api: { image: 'api:1' } } }
    const state = { services: {} }

    const result = setImage(config, state)

    expect(result.services.api.image).to.equal('api:1')
  })

  it('should override the image when state has one', function () {
    const config = { services: { api: { image: 'api:1' } } }
    const state = { services: { api: { image: 'api:override' } } }

    const result = setImage(config, state)

    expect(result.services.api.image).to.equal('api:override')
  })

  it('should preserve other service config keys', function () {
    const config = { services: { api: { image: 'api:1', ports: ['80:80'] } } }
    const state = { services: { api: { image: 'api:override' } } }

    const result = setImage(config, state)

    expect(result.services.api.ports).to.eql(['80:80'])
  })

})
