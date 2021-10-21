import {expect} from 'chai'
import {TEST_SERVICE_NAME} from '../../environment'
import Automator from '../../util/cli-automator'
import {Service} from '../../../../packages/navy/lib'

import {Then, When} from '@cucumber/cucumber'

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
  await expect(this.navy).to.have.services([
    { name: TEST_SERVICE_NAME, status: Service.Status.RUNNING },
  ])
})

Then(/I should see that the navy hasn't been initialised$/, async function () {
  expect(this.result).to.contain('Navy "dev" not imported')
})
