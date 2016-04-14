import {expect} from 'chai'
import {TEST_SERVICE_NAME} from '../../environment'

export default function () {

  this.When(/I get the internal port for port ([0-9]*) for the service$/, async function (port) {
    this.port = await this.navy.port(TEST_SERVICE_NAME, port)
  })

  this.Then(/I should see the port$/, function () {
    expect(this.port).to.be.a.number
  })

  this.Then(/I shouldn't see the port$/, function () {
    expect(this.port).to.be.null
  })

}
