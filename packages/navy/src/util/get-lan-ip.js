/* @flow */

import dns from 'dns'
import os from 'os'

export async function getLANIP() {
  const ifAddress = findInterfaceAddress()
  try {
    const hostnameAddr = await resolveHostname()

    if (ifAddress && hostnameAddr !== ifAddress) {
      return ifAddress
    }

    return hostnameAddr
  } catch (error) {
    if (ifAddress) {
      return ifAddress
    }

    throw error
  }
}

async function resolveHostname() {
  return await new Promise((resolve, reject) => {
    dns.lookup(os.hostname(), null, (err, addr) => {
      if (err) {
        return reject(err)
      }

      return resolve(addr)
    })
  })
}

function findInterfaceAddress() {
  const networkInterfaces = os.networkInterfaces()

  const findValidAddress = (addresses) =>
    addresses.reduce((ip, address) =>
      ip || (!address.internal && address.family === 'IPv4' && address.address)
    , null)

  return Object.keys(networkInterfaces).reduce(
    (externalIP, ifname) =>
      externalIP || findValidAddress(networkInterfaces[ifname])
    , null)
}
