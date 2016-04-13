import chai, {expect, Assertion} from 'chai'
import {find} from 'lodash/fp'

chai.use(require('chai-properties'))

Assertion.addMethod('services', async function (expectation) {
  const ps = await this._obj.ps()

  ps.forEach(service =>
    expect(service).to.have.properties(find({ name: service.name }, expectation))
  )
})
