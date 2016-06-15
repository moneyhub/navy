/* @flow */

import path from 'path'
import bluebird from 'bluebird'

const debug = require('debug')('navy:state')

const fs = bluebird.promisifyAll(require('fs'))
const mkdirp = bluebird.promisify(require('mkdirp'))
const rimraf = bluebird.promisify(require('rimraf'))

export function pathToNavyRoot(): string {
  const home = process.env.HOME

  if (!home) {
    throw new Error('Home directory not available')
  }

  return path.join(home, '.navy')
}

export function pathToNavys(): string {
  return path.join(pathToNavyRoot(), 'navies')
}

export function pathToNavy(normalisedEnvName: string): string {
  return path.join(pathToNavys(), normalisedEnvName)
}

export function pathToState(normalisedEnvName: string): string {
  return path.join(pathToNavy(normalisedEnvName), 'state.json')
}

export async function getState(normalisedEnvName: string): Promise<?State> {
  try {
    const statePath = pathToState(normalisedEnvName)
    const file = (await fs.readFileAsync(statePath)).toString()

    debug('Got raw state for env ' + normalisedEnvName, statePath, file)

    return JSON.parse(file)
  } catch (ex) {
    return null
  }
}

export async function saveState(normalisedEnvName: string, state: State): Promise<void> {
  const statePath = pathToState(normalisedEnvName)
  await mkdirp(path.dirname(statePath))

  debug('Writing state for env ' + normalisedEnvName, statePath, state)

  await fs.writeFileAsync(statePath, JSON.stringify(state, null, 2))
}

export async function deleteState(normalisedEnvName: string): Promise<void> {
  debug('Deleting state for env ' + normalisedEnvName)

  await rimraf(path.dirname(pathToState(normalisedEnvName)))
}

export type State = {
  driver?: string,
  configProvider?: string,
  path?: string,
  services?: Object,
}
