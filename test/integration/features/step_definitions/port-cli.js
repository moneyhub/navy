import {expect} from 'chai'
import {TEST_SERVICE_NAME} from '../../environment'
import Automator from '../../util/cli-automator'

import {Then, When} from '@cucumber/cucumber'

When(/I get the internal port for port ([0-9]*) for the service using the CLI$/, async function (port) {
  this.port = await Automator.spawn(['port', TEST_SERVICE_NAME, port], {
    env: {
      ...process.env,
      NAVY_DEBUG: 'null',
    },
  }).waitForDone()
})

Then(/I should see the port using the CLI$/, function () {
  expect(this.port.trim()).to.equal('38472') // port is from dummy-navies/with-fixed-port/services.yml
})

Then(/I shouldn't see the port using the CLI$/, function () {
  expect(this.port.trim()).to.equal('')
})
