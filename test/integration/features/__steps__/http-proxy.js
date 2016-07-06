import {expect} from 'chai'
import fetch from 'node-fetch'

import {retry} from '../../util'
import {TEST_SERVICE_NAME} from '../../environment'

export default function () {

  this.Then(/I should be able to make a HTTP request to the service through the proxy$/, async function () {
    await retry(async () => {
      const res = await fetch(await this.navy.url(TEST_SERVICE_NAME))
      const body = await res.text()

      expect(res.status).to.equal(200)
      expect(body).to.contain('Hello world!')
      expect(body).to.contain('My hostname is ')
    })
  })

}
