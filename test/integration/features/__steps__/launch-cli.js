import path from 'path'
import {TEST_SERVICE_NAME} from '../../environment'
import Automator from '../../util/cli-automator'
import {expect} from 'chai'

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

  this.When(/I launch a service from the CLI prompt from the directory with my config in$/, async function () {
    const cmd = Automator.spawn(['launch'], {
      cwd: path.join(__dirname, '../../test-projects/basic'),
      env: {
        ...process.env,
        NAVY_NAME: this.navy.name,
      },
    })
    await cmd.waitForLaunch()

    // key commands to select the service from the list
    await cmd.send('space')
    await cmd.send('enter')

    this.output = await cmd.waitForDone()
  })

  this.When(/I launch a service from the CLI prompt from a directory with no config in$/, async function () {
    const cmd = Automator.spawn(['launch'], {
      cwd: path.join(__dirname, '../../dummy-navies/no-config'),
      env: {
        ...process.env,
        NAVY_NAME: this.navy.name,
      },
    })

    this.output = await cmd.waitForDone()
  })

  this.Then(/I should see that the navy was imported$/, async function () {
    expect(this.output).to.contain(`Navy "${this.navy.name}" has now been imported and initialised.`)
  })

  this.Then(/I should see that there is no compose config in the current directory$/, async function () {
    expect(this.output).to.contain('No docker-compose.yml (or valid Docker Compose config) found')
  })

}
