import {ENV_NAME, TEST_SERVICE_NAME} from '../../environment'
import Automator from '../../util/cli-automator'

export default function () {

  this.When(/I launch a service from the CLI prompt$/, async function () {
    const cmd = Automator.spawn(['-e', ENV_NAME, 'launch'])
    await cmd.waitForLaunch()

    // key commands to select the service from the list
    await cmd.send('down')
    await cmd.send('space')
    await cmd.send('enter')

    await cmd.waitForDone()
  })

  this.When(/I launch a service from the CLI directly$/, async function () {
    const cmd = Automator.spawn(['-e', ENV_NAME, 'launch', TEST_SERVICE_NAME])
    await cmd.waitForDone()
  })

}
