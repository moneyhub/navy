/* eslint-disable no-unused-expressions */
/* eslint-enable chai-friendly/no-unused-expressions */

import {expect} from 'chai'
import {find} from 'lodash/fp'
import {Service} from '../../../../../packages/navy/lib'

import {TEST_SERVICE_NAME} from '../../../environment'

import {Then} from '@cucumber/cucumber'

Then(/I should see that all of the services are running with the labels added by the middleware$/, async function () {
  expect(this.error).to.not.exist

  await expect(this.navy).to.have.services([
    { name: TEST_SERVICE_NAME, status: Service.Status.RUNNING },
    { name: 'anotherservice', status: Service.Status.RUNNING },
  ])

  const ps = await this.navy.ps()

  const serviceInspect = find({ name: TEST_SERVICE_NAME }, ps).raw

  expect(serviceInspect.Config.Labels).to.have.properties({
    'com.navy.testlabel': 'Yay!',
  })
})
