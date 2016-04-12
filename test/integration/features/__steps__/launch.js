const TEST_SERVICE_NAME = 'testservice'

export default function () {

  this.When(/I launch a service$/, function () {
    this.env.launch([TEST_SERVICE_NAME])
  })

  this.Then(/I should see the service running$/, function () {

  })

}
