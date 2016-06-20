import {expect} from 'chai'
import {TEST_SERVICE_NAME} from '../../environment'
import Automator from '../../util/cli-automator'

export default function () {

  this.When(/I change the tag of the service to a custom one$/, async function () {
    await this.navy.useTag(TEST_SERVICE_NAME, 'latest')
  })

  this.When(/I reset the tag of the service$/, async function () {
    await this.navy.resetTag(TEST_SERVICE_NAME)
  })

  this.Then(/I should see that the service is using the custom tag$/, async function () {
    const ps = await this.navy.ps()

    expect(ps[0].image).to.contain(':latest')

    expect(
      await Automator.spawn(['ps']).waitForDone()
    ).to.contain('@ latest')
  })

  this.Then(/I should that the service is no longer using the custom tag$/, async function () {
    const ps = await this.navy.ps()

    expect(ps[0].image).to.not.contain(':latest')

    expect(
      await Automator.spawn(['ps']).waitForDone()
    ).to.not.contain('@ latest')
  })

}
