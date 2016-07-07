/* @flow */

import {getExternalIP} from './external-ip'

const BASE = 'xip.io'

function isValidIpv4Addr(ip) {
  return /^([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\\.([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\\.([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\\.([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])$/g.test(ip)
}

export function getXIPSubdomain() {
  const externalIP = getExternalIP()

  if (externalIP === '127.0.0.1') {
    // shorten
    return `0.${BASE}`
  }

  if (isValidIpv4Addr(externalIP)) {
    // invalid IP address, fallback to local
    return `0.${BASE}`
  }

  return `${externalIP}.${BASE}`
}

export function getHostForService(service: string, navyNormalisedName: string) {
  return `${service}.${navyNormalisedName}.${process.env.NAVY_EXTERNAL_SUBDOMAIN || getXIPSubdomain()}`
}

export function getUrlForService(service: string, navyNormalisedName: string) {
  return `http://${getHostForService(service, navyNormalisedName)}`
}
