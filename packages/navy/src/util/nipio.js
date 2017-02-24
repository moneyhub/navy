/* @flow */

const BASE = 'nip.io'

function isValidIpv4Addr(ip) {
  return /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/g.test(ip)
}

export async function getNIPSubdomain(externalIP: string) {
  if (!isValidIpv4Addr(externalIP)) {
    // invalid IP address, fallback to local
    return `127.0.0.1.${BASE}`
  }

  return `${externalIP}.${BASE}`
}

export async function getHostForService(service: string, navyNormalisedName: string, externalIP: string) {
  return `${service}.${navyNormalisedName}.${process.env.NAVY_EXTERNAL_SUBDOMAIN || await getNIPSubdomain(externalIP)}`
}

export async function getUrlForService(service: string, navyNormalisedName: string, externalIP: string) {
  return `http://${await getHostForService(service, navyNormalisedName, externalIP)}`
}
