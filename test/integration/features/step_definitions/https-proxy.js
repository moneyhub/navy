import {expect} from 'chai'
import fetch from 'node-fetch'
import {mkdtempSync, readFileSync} from 'fs'
import {tmpdir} from 'os'
import https from 'https'
import {When, Then, Given} from '@cucumber/cucumber'

import Automator from '../../util/cli-automator'
import {retry} from '../../util'
import {TEST_SERVICE_NAME} from '../../environment'

Given(/I set the tlsCa-dir config/, async function () {
  this.tlsRootCaDirPath = mkdtempSync(`${tmpdir()}/navy-tls-root-ca`)
  await Automator.spawn(['config', 'set', 'tlsCa-dir', this.tlsRootCaDirPath]).waitForDone()
})

Then(/I should see that tlsRootCaDir is set/, async function () {
  this.tlsRootCaDirConfig = await Automator.spawn(['config', 'get', 'tlsCa-dir']).waitForDone()
  expect(this.tlsRootCaDirConfig.trim()).to.eql(this.tlsRootCaDirPath)
})

Given(/I generate TLS certificate for a service/, async function () {
  await Automator.spawn(['https', TEST_SERVICE_NAME]).waitForDone()
})

Then(/I see the test service in https enabled services/, async function () {
  const httpServices = await Automator.spawn(['https']).waitForDone()
  expect(httpServices).contain('https://helloworld.dev')
})

Then(/I get its url with https protocol/, async function () {
  const url = await Automator.spawn(['https']).waitForDone()
  expect(url).contain('https://')
})

When(/I launch a service which is exposed on port 443 via proxy$/, async function () {
  await this.navy.launch([TEST_SERVICE_NAME])
  this.serviceForProxy = TEST_SERVICE_NAME
})

Then(/I should be able to make a HTTPS request$/, async function () {
  this.tlsRootCaDirConfig = await Automator.spawn(['config', 'get', 'tlsCa-dir']).waitForDone()
  this.CaDir = this.tlsRootCaDirConfig.trim()
  const agent = new https.Agent({
    ca: readFileSync(`${this.CaDir}/ca.crt`)
  })
  await retry(async () => {
    const url = await this.navy.url(this.serviceForProxy)
    const res = await fetch(url, {agent})

    const body = await res.text()

    expect(url).to.contain('https://')
    expect(res.status).to.equal(200)
    expect(body).to.contain('Hello world!')
    expect(body).to.contain('My hostname is ')
  })
})

When(/I disable HTTPS for a test service/, async function () {
  await Automator.spawn(['https', '-d', TEST_SERVICE_NAME]).waitForDone()
})

Then(/I should be able to make a HTTP request$/, async function () {
  await retry(async () => {
    const url = await this.navy.url(this.serviceForProxy)
    const res = await fetch(url)

    const body = await res.text()

    expect(res.status).to.equal(200)
    expect(body).to.contain('Hello world!')
    expect(body).to.contain('My hostname is ')
  })
})
