/* @flow */

import fs from 'fs'
import path from 'path'
import bluebird from 'bluebird'

const debug = require('debug')('navy:state')

type PromisifiedFS = {
  statAsync(path: any): Promise;
  readFileAsync(path: any): Promise;
  writeFileAsync(path: any, contents: string): Promise;
}

const fsAsync: PromisifiedFS = bluebird.promisifyAll(fs)
const mkdirp = bluebird.promisify(require('mkdirp'))

export function pathToState(normalisedEnvName: string): string {
  const home = process.env.HOME

  if (!home) {
    throw new Error('Home directory not available')
  }

  return path.join(home, '.navy', 'environments', normalisedEnvName, 'state.json')
}

export async function getState(normalisedEnvName: string): Promise<?State> {
  try {
    const statePath = pathToState(normalisedEnvName)
    const file = (await fsAsync.readFileAsync(statePath)).toString()

    debug('Got raw state for env ' + normalisedEnvName, statePath, file)

    return JSON.parse(file)
  } catch (ex) {
    return null
  }
}

export async function saveState(normalisedEnvName: string, state: State): Promise<void> {
  const statePath = pathToState(normalisedEnvName)
  await mkdirp(path.dirname(statePath))

  await fsAsync.writeFileAsync(statePath, JSON.stringify(state, null, 2))
}

export type State = {
  driver: ?string,
  configProvider: ?{
    name: ?string,
    opts: ?Object,
  },
}
