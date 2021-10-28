/* @flow */

import type {Service} from '../service'
import {getCertsPath} from './https'
import fs from 'fs'
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

export async function createHostForService(service: string, navyNormalisedName: string, externalIP: string) {
  return `${service}.${navyNormalisedName}.${process.env.NAVY_EXTERNAL_SUBDOMAIN || await getNIPSubdomain(externalIP)}`
}

export async function createUrlForService(service: string, navyNormalisedName: string, externalIP: string) {
  const certsPath = getCertsPath()
  let proto = 'http'
  const baseUrl = await createHostForService(service, navyNormalisedName, externalIP)
  if (fs.existsSync(`${certsPath}/${baseUrl}.crt`)) {
    proto = 'https'
  }
  return `${proto}://${await createHostForService(service, navyNormalisedName, externalIP)}`
}

export function getUrlFromService(service: Service) {
  if (!service || !service.raw || !service.raw.Config || !service.raw.Config.Env) {
    return null
  }

  const env = service.raw.Config.Env
  const certsPath = getCertsPath()

  for (const envVar of env) {
    if (envVar.indexOf('VIRTUAL_HOST=') === 0) {
      let proto = 'http'
      if (fs.existsSync(`${certsPath}/${envVar.substring('VIRTUAL_HOST='.length)}.crt`)) {
        proto = 'https'
      }
      return proto + '://' + envVar.substring('VIRTUAL_HOST='.length)
    }
  }

  return null
}
