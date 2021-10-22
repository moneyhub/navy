/* eslint-disable no-unused-expressions */
/* eslint-enable chai-friendly/no-unused-expressions */

import {expect} from 'chai'
import {TEST_SERVICE_NAME} from '../../environment'

import {Then, When} from '@cucumber/cucumber'

When(/I get the internal port for port ([0-9]*) for the service$/, async function (port) {
  this.port = await this.navy.port(TEST_SERVICE_NAME, port)
})

Then(/I should see the port$/, function () {
  expect(this.port).to.equal(38472) // port is from dummy-navies/with-fixed-port/services.yml
})

Then(/I shouldn't see the port$/, function () {
  expect(this.port).to.be.null
})
