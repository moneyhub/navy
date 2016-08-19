import {expect} from 'chai'
import {TEST_SERVICE_NAME} from '../../environment'
import Automator from '../../util/cli-automator'
import {Service} from '../../../../packages/navy'

export default function () {

  this.When(/I stop the service via the CLI$/, async function () {
    this.result = await Automator.spawn(['stop', TEST_SERVICE_NAME]).waitForDone()
  })

  this.When(/I start the service via the CLI$/, async function () {
    this.result = await Automator.spawn(['start', TEST_SERVICE_NAME]).waitForDone()
  })

  this.When(/I start the navy via the CLI$/, async function () {
    this.result = await Automator.spawn(['start']).waitForDone()
  })

  this.Then(/I should see that just that service is running$/, async function () {
    await expect(this.navy).to.have.services([
      { name: TEST_SERVICE_NAME, status: Service.Status.RUNNING },
    ])
  })

  this.Then(/I should see that the navy hasn't been initialised$/, async function () {
    expect(this.result).to.contain('Navy "dev" not imported')
  })

}
