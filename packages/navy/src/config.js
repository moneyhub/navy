/* @flow */

import path from 'path'
import bluebird from 'bluebird'
import invariant from 'invariant'

const DEFAULT_ENVIRONMENT_NAME = 'dev'

const fs = bluebird.promisifyAll(require('fs'))
const mkdirp = bluebird.promisify(require('mkdirp'))

export type Config = {
  defaultNavy: ?string,
  externalIP: ?string,
}

let _config: ?Config = null

export function getConfigPath(): string {
  const home = process.env.HOME

  invariant(home, 'NO_HOME_DIRECTORY')

  return path.join(home, '.navy', 'config.json')
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
    return {
      defaultNavy: DEFAULT_ENVIRONMENT_NAME,
      externalIP: null,
    }
  }
}

export async function setConfig(config: Config): Promise<void> {
  await mkdirp(path.dirname(getConfigPath()))
  await fs.writeFileAsync(getConfigPath(), JSON.stringify(config, null, 2))

  // trash cached config
  _config = null
}
