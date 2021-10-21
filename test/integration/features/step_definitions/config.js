import {expect} from 'chai'
import {execSync} from 'child_process'
import Automator from '../../util/cli-automator'
import {setUpNavy} from '../../util/setup-navy'

import {Then, When} from '@cucumber/cucumber'

When(/I get the current config$/, async function () {
  this.config = await Automator.spawn(['config', 'json']).waitForDone()
})

When(/I should see the current config$/, async function () {
  expect(JSON.parse(this.config)).to.eql({
    defaultNavy: 'dev',
    externalIP: null,
  })
})

When(/I get the status of all my navies$/, async function () {
  this.navy = await setUpNavy('dev') // navy "dev" needs to be initialised to see it on "navy status"

  this.status = await Automator.spawn(['status']).waitForDone()
})

Then(/I should see that the default navy is correct$/, async function () {
  expect(this.status).to.contain('dev (default)')
})

When(/I change the default navy to something else$/, async function () {
  this.otherNavy = await setUpNavy('someothernavy') // navy "someothernavy" needs to be initialised to see it on "navy status"

  await Automator.spawn(['config', 'set', 'default-navy', 'someothernavy']).waitForDone()
  this.config = await Automator.spawn(['config', 'json']).waitForDone()
  this.status = await Automator.spawn(['status']).waitForDone()
})

Then(/I should see that the default navy is something else$/, async function () {
  expect(JSON.parse(this.config)).to.eql({
    defaultNavy: 'someothernavy',
    externalIP: null,
  })

  expect(this.status).to.not.contain('dev (default)')
  expect(this.status).to.contain('someothernavy (default)')
})

Then(/I should see that the default external IP is connect$/, async function () {
  const output = await Automator.spawn(['external-ip']).waitForDone()

  // find IP of "docker" hostname and assert against that.
  // when running the integration tests, the docker daemon is available at hostname "docker",
  // so resolving that to an IP will give us the correct external IP. this is an ever changing
  // value so cannot be hard coded in the tests
  expect(output.trim()).to.equal(execSync("getent hosts docker | awk '{ print $1 }'").toString().trim())
})

When(/I override the external IP using an environment variable$/, async function () {
  this.navy = await setUpNavy('dev')
  await this.navy.launch(['helloworld', 'anotherservice'])

  const spawnOpts = {
    env: {
      ...process.env,
      NAVY_EXTERNAL_IP: '192.168.2.102',
    },
  }

  await Automator.spawn(['launch', 'helloworld', 'anotherservice'], spawnOpts).waitForDone()

  this.ip = await Automator.spawn(['external-ip'], spawnOpts).waitForDone()
})

Then(/I should see that the external IP is what I set the environment variable to$/, async function () {
  expect(this.ip.trim()).to.equal('192.168.2.102')
})

When(/I change the external IP to something else$/, async function () {
  this.navy = await setUpNavy('dev') // navy "dev" needs to be initialised so we can see if services get reconfigured
  await this.navy.launch(['helloworld', 'anotherservice'])

  await Automator.spawn(['config', 'set', 'external-ip', '192.168.3.105']).waitForDone()
  this.config = await Automator.spawn(['config', 'json']).waitForDone()
  this.ip = await Automator.spawn(['external-ip']).waitForDone()
})

Then(/I should see that all services were reconfigured with the new external IP/, async function () {
  expect(JSON.parse(this.config)).to.eql({
    defaultNavy: 'dev',
    externalIP: '192.168.3.105',
  })

  expect(this.ip.trim()).to.equal('192.168.3.105')
})

