import {expect} from 'chai'
import {ENV_NAME, TEST_SERVICE_NAME} from '../../environment'
import Automator from '../../util/cli-automator'

export default function () {

  this.When(/I get the internal port for port ([0-9]*) for the service using the CLI$/, async function (port) {
    this.port = await Automator.spawn(['-e', ENV_NAME, 'port', TEST_SERVICE_NAME, port]).waitForDone()
  })

  this.Then(/I should see the port using the CLI$/, function () {
    expect(this.port).to.be.a.number
  })

  this.Then(/I shouldn't see the port using the CLI$/, function () {
    expect(this.port).to.equal('')
  })

}
