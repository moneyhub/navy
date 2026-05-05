/* eslint-env mocha */

import { expect } from 'chai'
import defaultMiddleware from '../default-middleware'
import developMiddleware from '../../middleware/develop'
import tagOverrideMiddleware from '../../middleware/tag-override'
import portOverrideMiddleware from '../../middleware/port-override'
import setEnvironmentVariables from '../../middleware/set-env-vars'
import setLoggingDriver from '../../middleware/set-logging-driver'
import setImage from '../../middleware/set-image'
import addServiceProxyMiddleware from '../../middleware/add-service-proxy-config'

describe('default-middleware', function () {

  it('should return the standard middleware pipeline in the documented order', function () {
    const fakeNavy = { name: 'env', normalisedName: 'env' }
    const list = defaultMiddleware(fakeNavy)

    expect(list).to.have.lengthOf(7)
    expect(list[0]).to.equal(developMiddleware)
    expect(list[1]).to.equal(tagOverrideMiddleware)
    expect(list[2]).to.equal(portOverrideMiddleware)
    expect(list[3]).to.equal(setEnvironmentVariables)
    expect(list[4]).to.equal(setLoggingDriver)
    expect(list[5]).to.equal(setImage)
    expect(list[6]).to.be.a('function')
  })

  it('should bind the navy through to the addServiceProxy middleware factory', function () {
    const fakeNavy = { name: 'env', normalisedName: 'env' }
    const list = defaultMiddleware(fakeNavy)

    const expected = addServiceProxyMiddleware(fakeNavy)
    expect(typeof list[6]).to.equal(typeof expected)
  })

})
