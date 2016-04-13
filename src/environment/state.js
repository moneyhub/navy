/* @flow */

import fs from 'fs'
import path from 'path'
import bluebird from 'bluebird'

const debug = require('debug')('navy:state')

type PromisifiedFS = {
  statAsync(path: any): Promise;
  readFileAsync(path: any): Promise;
}

const fsAsync: PromisifiedFS = bluebird.promisifyAll(fs)

export function pathToState(normalisedEnvName: string): string {
  const home = process.env.HOME

  if (!home) {
    throw new Error('Home directory not available')
  }

  return path.join(home, '.navy', 'environments', normalisedEnvName, 'state.json')
}

export async function getState(normalisedEnvName: string): Promise<?State> {
  try {
    const pathForEnv = pathToState(normalisedEnvName)
    const file = (await fsAsync.readFileAsync(pathForEnv)).toString()

    debug('Got raw state for env ' + normalisedEnvName, pathForEnv, file)

    return JSON.parse(file)
  } catch (ex) {
    return null
  }
}

export type State = {
  driver: ?string,
  configProvider: ?{
    name: ?string,
    opts: ?Object,
  },
}
