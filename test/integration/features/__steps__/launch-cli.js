import {TEST_SERVICE_NAME} from '../../environment'
import Automator from '../../util/cli-automator'

export default function () {

  this.When(/I launch a service from the CLI prompt$/, async function () {
    await Automator.spawn(['import']).waitForDone()

    const cmd = Automator.spawn(['launch'])
    await cmd.waitForLaunch()

    // key commands to select the service from the list
    await cmd.send('space')
    await cmd.send('enter')

    await cmd.waitForDone()
  })

  this.When(/I launch a service from the CLI directly$/, async function () {
    await Automator.spawn(['import']).waitForDone()

    const cmd = Automator.spawn(['launch', TEST_SERVICE_NAME])
    await cmd.waitForDone()
  })

}
