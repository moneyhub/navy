const TEST_SERVICE_NAME = 'whalesay'

export default function () {

  this.When(/I launch a service$/, async function () {
    await this.env.launch([TEST_SERVICE_NAME])
  })

  this.Then(/I should see the service running$/, function () {

  })

}
