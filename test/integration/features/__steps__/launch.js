/* eslint-disable no-unused-expressions */
/* eslint-enable chai-friendly/no-unused-expressions */

import {expect} from 'chai'
import {Service} from '../../../../packages/navy'

import {TEST_SERVICE_NAME} from '../../environment'

export default function () {

  this.When(/I launch a service$/, async function () {
    await this.navy.launch([TEST_SERVICE_NAME])
  })

  this.When(/I launch the navy with no services specified$/, async function () {
    try {
      await this.navy.launch()
    } catch (ex) {
      this.error = ex
    }
  })

  this.When(/I stop the service$/, async function () {
    await this.navy.stop([TEST_SERVICE_NAME])
  })

  this.When(/I start the service$/, async function () {
    await this.navy.start([TEST_SERVICE_NAME])
  })

  this.Then(/I should see that the service is running$/, async function () {
    expect(this.error).to.not.exist

    await expect(this.navy).to.have.services([
      { name: TEST_SERVICE_NAME, status: Service.Status.RUNNING },
    ])
  })

  this.Then(/I should see that the service is stopped$/, async function () {
    expect(this.error).to.not.exist

    await expect(this.navy).to.have.services([
      { name: TEST_SERVICE_NAME, status: Service.Status.EXITED },
    ])
  })

  this.Then(/I should see that all of the services are running$/, async function () {
    expect(this.error).to.not.exist

    await expect(this.navy).to.have.services([
      { name: TEST_SERVICE_NAME, status: Service.Status.RUNNING },
      { name: 'anotherservice', status: Service.Status.RUNNING },
    ])
  })

  this.Then(/I should get an exception as the navy hasn't been initialised$/, async function () {
    expect(this.error.message).to.equal('Navy "nonexistanttest" not imported')
  })

}
