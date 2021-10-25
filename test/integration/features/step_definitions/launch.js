/* eslint-disable no-unused-expressions */
/* eslint-enable chai-friendly/no-unused-expressions */

import {expect, use} from 'chai'
import {Service} from '../../../../packages/navy/lib'

import {TEST_SERVICE_NAME, TEST_SERVICE_IMAGE} from '../../environment'

import {Then, When} from '@cucumber/cucumber'

use(require('chai-like'))
use(require('chai-things'))

When(/I launch a service$/, async function () {
  await this.navy.launch([TEST_SERVICE_NAME])
})

When(/I launch the navy with no services specified$/, async function () {
  try {
    await this.navy.launch()
  } catch (ex) {
    this.error = ex
  }
})

When(/I stop the service$/, async function () {
  await this.navy.stop([TEST_SERVICE_NAME])
})

When(/I start the service$/, async function () {
  await this.navy.start([TEST_SERVICE_NAME])
})

Then(/I should see that the service is running$/, async function () {
  expect(this.error).to.not.exist
  const services = await this.navy.ps()

  expect(services).to.have.length(1)
  expect(services).to.to.be.an('array').that.contains.something.like(
    { name: TEST_SERVICE_NAME, status: Service.Status.RUNNING },
  )
})

Then(/I should see that one service is running$/, async function () {
  expect(this.error).to.not.exist
  const services = await this.navy.ps()

  expect(services).to.have.length(1)
  expect(services).to.to.be.an('array').that.contains.something.like(
    { image: TEST_SERVICE_IMAGE, status: Service.Status.RUNNING },
  )
})

Then(/I should see that the service is stopped$/, async function () {
  expect(this.error).to.not.exist
  const services = await this.navy.ps()

  expect(services).to.have.length(1)
  expect(services).to.to.be.an('array').that.contains.something.like(
    { name: TEST_SERVICE_NAME, status: Service.Status.EXITED },
  )
})

Then(/I should see that all of the services are running$/, async function () {
  expect(this.error).to.not.exist
  const services = await this.navy.ps()

  expect(services).to.have.length(2)
  expect(services).to.to.be.an('array').that.contains.something.like(
    { name: TEST_SERVICE_NAME, status: Service.Status.RUNNING },
  )
  expect(services).to.to.be.an('array').that.contains.something.like(
    { name: 'anotherservice', status: Service.Status.RUNNING },
  )
})

Then(/I should get an exception as the navy hasn't been initialised$/, async function () {
  expect(this.error.message).to.equal('Navy "nonexistanttest" not imported')
})
