import {expect} from 'chai'

export async function tryAndWait(callback) {
  let success = false
  let tries = 0

  while (tries++ < 40) {
    if (await callback()) {
      success = true
      break
    }

    await new Promise(resolve => setTimeout(resolve, 1500))
  }

  expect(success).to.be.true
}
