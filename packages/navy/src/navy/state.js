/* @flow */

import path from 'path'
import invariant from 'invariant'
import bluebird from 'bluebird'

const debug = require('debug')('navy:state')

const fs = bluebird.promisifyAll(require('fs'))
const mkdirp = bluebird.promisify(require('mkdirp'))
const rimraf = bluebird.promisify(require('rimraf'))

export function pathToNavyRoot(): string {
  const home = process.env.HOME
  invariant(home, 'NO_HOME_DIRECTORY')

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

/**
 * A "state" object of the current services, and other internal Navy state.
 * This can be used to hang "state" off services which can then be used by middleware at runtime to modify the
 * runtime configuration.
 *
 * Accessing internal properties on state (properties other than "services") is not supported and backwards
 * compatibility is not guaranteed.
 *
 * @public
 * @property {object} services An object hash of the state of each service
 */
export type State = {
  driver?: string,
  configProvider?: string,
  path?: string,
  npmPackage?: string,
  services?: Object,
}
