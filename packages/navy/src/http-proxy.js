/* @flow */

import os from 'os'
import path from 'path'
import yaml from 'js-yaml'
import docker from './util/docker-client'
import fs from 'fs'
import { getCertsPath } from './util/https'
import { execAsync } from './util/exec-async'
import { log } from './driver-logging'
import { getLaunchedNavyNames } from './navy'

const DEFAULT_PROXY_IMAGE = 'navycloud/navy-proxy'
const DEFAULT_DOCKER_SOCKET = '/var/run/docker.sock'

export function resolveProxyImage(navyFile: ?Object): string {
  return process.env.NAVY_HTTP_PROXY_IMAGE ||
    (navyFile && navyFile.httpProxyImage) ||
    DEFAULT_PROXY_IMAGE
}

export function resolveProxyEnvFromNavyFile(navyFile: ?Object): {[key: string]: string} {
  if (!navyFile) return {}
  const raw: any = navyFile.httpProxyEnv
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}

  const result: {[key: string]: string} = {}
  for (const key of Object.keys(raw)) {
    const value: any = raw[key]
    if (value === null || value === undefined) continue
    const coerced = String(value)
    if (coerced === '') continue
    result[key] = coerced
  }
  return result
}

export function resolveProxyEnvAllowlist(): {[key: string]: string} {
  const allowlist = process.env.NAVY_HTTP_PROXY_ENV
  if (!allowlist) return {}

  const seen: Set<string> = new Set()
  const result: {[key: string]: string} = {}
  for (const rawName of allowlist.split(',')) {
    const name = rawName.trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    const value = process.env[name]
    if (typeof value !== 'string' || value === '') continue
    result[name] = value
  }
  return result
}

export function resolveProxyEnv(navyFile: ?Object): ?{[key: string]: string} {
  const merged = {
    ...resolveProxyEnvFromNavyFile(navyFile),
    ...resolveProxyEnvAllowlist(),
  }
  if (Object.keys(merged).length === 0) return null
  return merged
}

// Resolve the host path to the Docker socket. The proxy container needs to
// read events from the same daemon as the rest of navy, so we honour
// DOCKER_HOST when it points at a unix socket (e.g. on CI where
// `docker/setup-docker-action` puts the daemon on a custom path) and fall
// back to the conventional `/var/run/docker.sock` otherwise.
export function resolveDockerSocketPath(): string {
  const dockerHost = process.env.DOCKER_HOST
  if (dockerHost && dockerHost.indexOf('unix://') === 0) {
    const socketPath = dockerHost.slice('unix://'.length)
    if (socketPath) return socketPath
  }
  return DEFAULT_DOCKER_SOCKET
}

async function updateComposeConfig(navies: Array<string>, navyFile: ?Object) {
  const allNetworks = await docker.listNetworks()
  const networks = allNetworks
    .filter(net => net.Name.indexOf('_') !== -1) // is docker-compose network?
    .filter(net => {
      for (const navy of navies) {
        if (net.Name.indexOf(navy + '_') === 0) {
          return true
        }
      }

      return false
    })

  const networksConfig = {}

  networks.forEach(net => networksConfig[net.Name] = {
    external: true,
  })
  const ports = ['80:80']
  const volumes = [
    `${resolveDockerSocketPath()}:/tmp/docker.sock:ro`,
  ]

  // Enable HTTPS for services that
  // match crt file names in tlsRootCaDir
  const certsPath = await getCertsPath(true)
  if (certsPath) {
    ports.push('443:443')
    volumes.push(`${certsPath}:/etc/nginx/certs`)
    volumes.push(`${certsPath}:/etc/nginx/dhparam`) // to persist DH params
  }

  const proxyEnv = resolveProxyEnv(navyFile)

  const config = {
    version: '2',

    services: {
      'nginx-proxy': {
        image: resolveProxyImage(navyFile),
        ports,
        networks: networks.map(net => net.Name),
        volumes,
        ...(proxyEnv ? { environment: proxyEnv } : {}),
        restart: 'always',
      },
    },

    networks: networksConfig,
  }

  fs.writeFileSync(path.join(os.tmpdir(), 'navyinternaldockercompose.yml'), yaml.dump(config))
}

export async function reconfigureHTTPProxy(opts: Object = {}) {
  const navyInternalYamlFile = path.join(os.tmpdir(), 'navyinternaldockercompose.yml')

  if (opts.restart) { // proxy needs to be recreated to detect changes (deletes) in /etc/nginx/certs
    if (fs.existsSync(navyInternalYamlFile)) {
      log('Restarting HTTP proxy...')
      await execAsync('docker compose',
        [
          '-f', navyInternalYamlFile,
          '-p', 'navyinternal', 'rm', '-s', '-f', 'nginx-proxy',
        ])
    }
  }

  if (!opts.navies) opts.navies = await getLaunchedNavyNames()
  await updateComposeConfig(opts.navies, opts.navyFile)
  log('Configuring HTTP proxy...')
  await execAsync('docker compose',
    [
      '-f', navyInternalYamlFile,
      '-p', 'navyinternal',
      'up', '-d',
    ])

}
