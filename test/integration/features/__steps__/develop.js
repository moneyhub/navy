import fetch from 'node-fetch'
import {ENV_NAME, TEST_SERVICE_NAME} from '../../environment'
import Automator from '../../util/cli-automator'
import {tryAndWait} from '../../util'

export default function () {

  this.When(/I put the service into development$/, async function () {
    const cmd = Automator.spawn(['-e', ENV_NAME, 'develop'], {
      cwd: this.localCopyPath,
    })

    await cmd.waitForLaunch()
  })

  this.Then(/I should see that my local copy has been applied$/, async function () {
    await tryAndWait(async () => {
      const url = `http://${await this.navy.host(TEST_SERVICE_NAME)}:${await this.navy.port(TEST_SERVICE_NAME, 80)}/`

      console.log('Got url', url)

      return (await fetch(url)
        .then(res => res.text())
      ).trim() === 'Hello from the local source code!'
    })
  })

}
