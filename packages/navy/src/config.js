/* @flow */

import path from 'path'
import invariant from 'invariant'
import fs from 'fs'
// $FlowIgnore
import { promises as fsPromises } from 'fs'

const DEFAULT_ENVIRONMENT_NAME = 'dev'
export const DEFAULT_TLS_ROOT_CA_DIR = `${getConfigDir()}/tls-root-ca`

const DEFAULT_CONFIG = {
  defaultNavy: DEFAULT_ENVIRONMENT_NAME,
  externalIP: null,
  tlsRootCaDir: DEFAULT_TLS_ROOT_CA_DIR,
}

export type Config = {
  defaultNavy: ?string,
  externalIP: ?string,
  tlsRootCaDir: ?string,
}

let _config: ?Config = null

export function getConfigDir(): string {
  const home = process.env.HOME

  invariant(home, 'NO_HOME_DIRECTORY')

  return path.join(home, '.navy')
}

export function getConfigPath(): string {
  const configDir = getConfigDir()

  return path.join(configDir, 'config.json')
}

export function getConfig(): Config {
  if (_config) {
    return _config
  }

  try {
    const file = fs.readFileSync(getConfigPath(), 'utf8')
    _config = JSON.parse(file)

    return _config
  } catch (ex) {
    return DEFAULT_CONFIG
  }
}

export async function setConfig(config: ?Config): Promise<void> {
  if (config == null) config = DEFAULT_CONFIG

  await fsPromises.mkdir(path.dirname(getConfigPath()), {recursive: true})
  await fsPromises.writeFile(getConfigPath(), JSON.stringify(config, null, 2))

  // trash cached config
  _config = null
}
