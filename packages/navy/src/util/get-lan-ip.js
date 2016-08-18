/* @flow */

import dns from 'dns'
import os from 'os'

export async function getLANIP() {
  return await new Promise((resolve, reject) => {
    dns.lookup(os.hostname(), null, (err, addr) => {
      if (err) {
        return reject(err)
      }

      return resolve(addr)
    })
  })
}
