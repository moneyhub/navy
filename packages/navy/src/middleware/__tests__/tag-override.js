/* eslint-env mocha */

import { expect } from 'chai'
import tagOverride from '../tag-override'

describe('tag-override middleware', function () {

  it('should add the tag when service image has no tag', function () {
    const config = { services: { api: { image: 'navy/api' } } }
    const state = { services: { api: { _tag: 'v1.2.3' } } }

    const result = tagOverride(config, state)

    expect(result.services.api.image).to.equal('navy/api:v1.2.3')
  })

  it('should replace an existing tag with the override', function () {
    const config = { services: { api: { image: 'navy/api:old' } } }
    const state = { services: { api: { _tag: 'new' } } }

    const result = tagOverride(config, state)

    expect(result.services.api.image).to.equal('navy/api:new')
  })

  it('should leave the image untouched when state has no _tag for the service', function () {
    const config = { services: { api: { image: 'navy/api:old' } } }
    const state = { services: { api: {} } }

    const result = tagOverride(config, state)

    expect(result.services.api.image).to.equal('navy/api:old')
  })

  it('should ignore state services that have no matching service in config', function () {
    const config = { services: { api: { image: 'api:1' } } }
    const state = { services: { web: { _tag: 'lts' } } }

    const result = tagOverride(config, state)

    expect(result.services.api.image).to.equal('api:1')
    expect(result.services).to.not.have.property('web')
  })

  it('should treat a missing state.services as an empty object', function () {
    const config = { services: { api: { image: 'api:1' } } }
    const state = {}

    const result = tagOverride(config, state)

    expect(result.services.api.image).to.equal('api:1')
  })

})
