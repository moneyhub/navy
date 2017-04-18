/* @flow */

import Bluebird from 'bluebird'
import defaultMiddleware from './default-middleware'

import type {State} from './state'
import type {Driver} from '../driver'
import type {Navy} from './'

export async function middlewareRunner(navy: Navy, state: State): Promise<void> {
  const driver: ?Driver = await navy.getDriver()

  if (!driver) {
    return
  }

  await navy.ensurePluginsLoaded()

  const config = await Bluebird.reduce([
    ...defaultMiddleware(navy),
    ...navy._registeredMiddleware,
  ], async (prevConfig, middlewareFn) => await middlewareFn(prevConfig, state), await driver.getConfig())

  await driver.writeConfig(config)
}
