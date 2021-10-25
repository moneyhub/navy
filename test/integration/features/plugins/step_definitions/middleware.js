/* eslint-disable no-unused-expressions */
/* eslint-enable chai-friendly/no-unused-expressions */

import {expect, use} from 'chai'
import {find} from 'lodash/fp'
import {Service} from '../../../../../packages/navy/lib'

import {TEST_SERVICE_NAME} from '../../../environment'

import {Then} from '@cucumber/cucumber'

use(require('chai-like'))
use(require('chai-things'))

Then(/I should see that all of the services are running with the labels added by the middleware$/, async function () {
  expect(this.error).to.not.exist
  const services = await this.navy.ps()

  expect(services).to.have.length(2)
  expect(services).to.to.be.an('array').that.contains.something.like(
    { name: TEST_SERVICE_NAME, status: Service.Status.RUNNING },
  )
  expect(services).to.to.be.an('array').that.contains.something.like(
    { name: 'anotherservice', status: Service.Status.RUNNING },
  )

  const serviceInspect = find({ name: TEST_SERVICE_NAME }, services).raw

  expect(serviceInspect.Config.Labels).to.have.properties({
    'com.navy.testlabel': 'Yay!',
  })
})
