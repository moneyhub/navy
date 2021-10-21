import {expect} from 'chai'
import Automator from '../../../util/cli-automator'

import {Then, When} from '@cucumber/cucumber'

When(/I run the custom command on the CLI$/, async function () {
  this.output = await Automator.spawn(['run', 'test-command']).waitForDone()
})

Then(/I should see the output from the custom command$/, async function () {
  expect(this.output).to.contain('Hello, world!')
})
