import {expect} from 'chai'
import Automator from '../../../util/cli-automator'

export default function () {

  this.When(/I run the custom command on the CLI$/, async function () {
    this.output = await Automator.spawn(['run', 'test-command']).waitForDone()
  })

  this.Then(/I should see the output from the custom command$/, async function () {
    expect(this.output).to.contain('Hello, world!')
  })

}
