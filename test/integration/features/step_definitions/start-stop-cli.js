import {expect, use} from 'chai'
import {TEST_SERVICE_NAME} from '../../environment'
import Automator from '../../util/cli-automator'
import {Service} from '../../../../packages/navy/lib'

import {Then, When} from '@cucumber/cucumber'

use(require('chai-like'))
use(require('chai-things'))

When(/I stop the service via the CLI$/, async function () {
  this.result = await Automator.spawn(['stop', TEST_SERVICE_NAME]).waitForDone()
})

When(/I start the service via the CLI$/, async function () {
  this.result = await Automator.spawn(['start', TEST_SERVICE_NAME]).waitForDone()
})

When(/I start the navy via the CLI$/, async function () {
  this.result = await Automator.spawn(['start']).waitForDone()
})

Then(/I should see that just that service is running$/, async function () {
  const services = await this.navy.ps()

  expect(services).to.have.length(1)
  expect(services).to.to.be.an('array').that.contains.something.like(
    { name: TEST_SERVICE_NAME, status: Service.Status.RUNNING },
  )
})

Then(/I should see that the navy hasn't been initialised$/, async function () {
  expect(this.result).to.contain('Navy "dev" not imported')
})
