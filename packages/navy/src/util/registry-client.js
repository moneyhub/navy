/* @flow */

import path from 'path'
import {invariant} from '../error-codes'
import {registryRequest} from 'simple-docker-registry-client'
import fs from './fs'

const DEFAULT_REGISTRY = 'registry-1.docker.io' // docker v2 registry URL
const DEFAULT_REGISTRY_AUTH = 'https://index.docker.io/v1/' // the url which docker stores in .docker/config.json for auth

async function getDockerUserConfig() {
  invariant(process.env.HOME, 'NO_HOME_DIRECTORY')

  try {
    const rawConfig = await fs.readFileAsync(path.join(process.env.HOME, '.docker', 'config.json'))
    const config = JSON.parse(rawConfig)

    return config
  } catch (ex) {
    return null
  }
}

export function getAuthForRegistry(registry: string, dockerUserConfig: ?Object) {
  if (registry === DEFAULT_REGISTRY) {
    registry = DEFAULT_REGISTRY_AUTH
  }

  if (dockerUserConfig && dockerUserConfig.auths && dockerUserConfig.auths[registry]) {
    return dockerUserConfig.auths[registry]
  }

  return null
}

export function registryFromImage(image: string) {
  const parsedRegistry = image.match(/([a-zA-Z0-9-.:]+)\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+/)
  const registry: string = parsedRegistry != null && parsedRegistry.length > 1 ? parsedRegistry[1] : DEFAULT_REGISTRY

  return registry
}

export function credentialsFromAuth(auth: ?Object) {
  if (auth && auth.auth) {
    invariant(
      auth.auth.match(/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/) != null,
      'DOCKER_CONFIG_INVALID_AUTH_BASE64',
    )

    const decoded = new Buffer(auth.auth, 'base64').toString()
    const parts = decoded.split(':')

    return {
      username: parts[0],
      password: parts[1],
    }
  }

  return null
}

export async function getRegistryClient(image: string, navyFile: ?Object) {
  const registry = registryFromImage(image)

  const opts: Object = {
    registry: `https://${registry}`,
    allowUnauthorized: (navyFile &&
      navyFile.ignoreUnauthorizedRequestsForRegistries &&
      navyFile.ignoreUnauthorizedRequestsForRegistries.indexOf(registry) !== -1
    ),
  }

  // try and work out auth
  const auth = getAuthForRegistry(registry, await getDockerUserConfig())
  opts.credentials = credentialsFromAuth(auth)

  return {
    request: (url: string) => registryRequest(url, opts),
  }
}
