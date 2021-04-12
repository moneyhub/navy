import {expect} from 'chai'
import fetch from 'node-fetch'

import {retry} from '../../util'
import {TEST_SERVICE_NAME} from '../../environment'

export default function () {

  this.When(/I launch a service which exposes port 80$/, async function () {
    await this.navy.launch([TEST_SERVICE_NAME])
    this.serviceForProxy = TEST_SERVICE_NAME
  })

  this.When(/I launch a service which exposes a different port which has been explicitly configured to use the HTTP proxy$/, async function () {
    await this.navy.launch(['helloworld-otherport'])
    this.serviceForProxy = 'helloworld-otherport'
  })

  this.When(/I launch a service which exposes a different port which has been explicitly configured to use the HTTP proxy, not port 80$/, async function () {
    await this.navy.launch(['helloworld-otherportnot80'])
    this.serviceForProxy = 'helloworld-otherportnot80'
  })

  this.When(/I launch a service which exposes a different port which has been explicitly configured as a HTTP proxy auto-port$/, async function () {
    await this.navy.launch(['helloworld-otherautoport'])
    this.serviceForProxy = 'helloworld-otherautoport'
  })

  this.Then(/I should be able to make a HTTP request to the service through the proxy$/, async function () {
    await retry(async () => {
      const res = await fetch(await this.navy.url(this.serviceForProxy))
      const body = await res.text()

      expect(res.status).to.equal(200)
      expect(body).to.contain('Hello world!')
      expect(body).to.contain('My hostname is ')
    })
  })

}
