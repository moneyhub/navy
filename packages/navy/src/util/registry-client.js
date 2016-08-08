/* @flow */

import path from 'path'
import invariant from 'invariant'
import {registryRequest} from 'simple-docker-registry-client'
import fs from './fs'

const DEFAULT_REGISTRY = 'registry-1.docker.io'
const DEFAULT_REGISTRY_AUTH = 'https://index.docker.io/v1/'

async function getAuthForRegistry(registry: string) {
  invariant(process.env.HOME, 'NO_HOME_DIRECTORY')

  if (registry === DEFAULT_REGISTRY) {
    registry = DEFAULT_REGISTRY_AUTH
  }

  const rawConfig = await fs.readFileAsync(path.join(process.env.HOME, '.docker', 'config.json'))
  const config = JSON.parse(rawConfig)

  if (config.auths && config.auths[registry]) {
    return config.auths[registry]
  }
}

export async function getRegistryClient(image: string, navyFile: ?Object) {
  const parsedRegistry = image.match(/([a-zA-Z0-9-.:]+)\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+/)
  const registry: string = parsedRegistry != null && parsedRegistry.length > 1 ? parsedRegistry[1] : DEFAULT_REGISTRY

  const opts: Object = {
    registry: `https://${registry}`,
    allowUnauthorized: (navyFile &&
      navyFile.ignoreUnauthorizedRequestsForRegistries &&
      navyFile.ignoreUnauthorizedRequestsForRegistries.indexOf(registry) !== -1
    ),
  }

  // try and work out auth
  const auth = await getAuthForRegistry(registry)

  if (auth) {
    const decoded = new Buffer(auth.auth, 'base64').toString()
    const parts = decoded.split(':')

    opts.credentials = {
      username: parts[0],
      password: parts[1],
    }
  }

  return {
    request: url => registryRequest(url, opts),
  }
}
