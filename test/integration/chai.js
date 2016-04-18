import chai, {expect, Assertion} from 'chai'
import {find} from 'lodash/fp'

chai.use(require('chai-properties'))

Assertion.addMethod('services', async function (expectation) {
  const ps = await this._obj.ps()

  expectation.forEach(service => {
    const foundService = find({ name: service.name }, ps)

    expect(foundService).to.exist
    expect(foundService).to.have.properties(service)
  })
})
