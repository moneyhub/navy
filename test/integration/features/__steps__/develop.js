import fetch from 'node-fetch'
import {expect} from 'chai'

import {TEST_SERVICE_NAME} from '../../environment'
import Automator from '../../util/cli-automator'
import {retry} from '../../util'

export default function () {

  this.When(/I put the service into development$/, async function () {
    this.cmd = Automator.spawn(['develop'], {
      cwd: this.localCopyPath,
    })

    await this.cmd.waitForLaunch()
  })

  this.When(/I take the service out of development$/, async function () {
    this.cmd = Automator.spawn(['live'], {
      cwd: this.localCopyPath,
    })

    await this.cmd.waitForDone()
  })

  this.When(/I call develop from a folder with no source code or .navyrc$/, async function () {
    this.cmd = Automator.spawn(['develop'])

    await this.cmd.waitForDone()
  })

  this.When(/I put a different service into development$/, async function () {
    this.cmd = Automator.spawn(['develop', 'anotherservice'], {
      cwd: this.localCopyPath,
    })

    await this.cmd.waitForDone()
  })

  this.Then(/I should see that my local copy has been applied$/, async function () {
    await retry(async () => {
      const url = await this.navy.url(TEST_SERVICE_NAME)

      expect((await fetch(url)
        .then(res => res.textConverted())
      ).trim()).to.equal('Hello from the local source code!')

      const psOutput = await Automator.spawn(['ps']).waitForDone()

      expect(psOutput).to.contain('(development)')
    })
  })

  this.Then(/I should see that my local copy is no longer applied/, async function () {
    const url = await this.navy.url(TEST_SERVICE_NAME)

    expect((await fetch(url)
      .then(res => res.textConverted())
    ).trim()).to.not.equal('Hello from the local source code!')

    const psOutput = await Automator.spawn(['ps']).waitForDone()

    expect(psOutput).to.not.contain('(development)')
  })

  this.Then(/I should see that there are no services to put in development/, async function () {
    expect(await this.cmd.waitForDone()).to.contain('No valid .navyrc file was found in')
  })

  this.Then(/I should see that I specified an invalid development target/, async function () {
    expect(await this.cmd.waitForDone()).to.contain('Service "anotherservice" is not a valid development target')
  })

}
