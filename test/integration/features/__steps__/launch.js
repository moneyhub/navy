import {expect} from 'chai'
import {Service} from '../../../../'

const TEST_SERVICE_NAME = 'helloworld'

export default function () {

  this.When(/I launch a service$/, async function () {
    await this.env.launch([TEST_SERVICE_NAME])
  })

  this.Then(/I should see the service running$/, async function () {
    await expect(this.env).to.have.services([
      { name: TEST_SERVICE_NAME, status: Service.Status.RUNNING },
    ])
  })

}
