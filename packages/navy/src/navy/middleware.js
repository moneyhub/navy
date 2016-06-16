/* @flow */

import Bluebird from 'bluebird'
import {Navy} from './'
import defaultMiddleware from './default-middleware'

import type {State} from './state'
import type {Driver} from '../driver'

export async function middlewareRunner(navy: Navy, state: State): Promise {
  const driver: ?Driver = await navy.getDriver()

  if (!driver) {
    return
  }

  await navy.ensurePluginsLoaded()

  const config = await Bluebird.reduce([
    ...defaultMiddleware,
    ...navy._registeredMiddleware,
  ], async (prevConfig, middlewareFn) => await middlewareFn(prevConfig, state), await driver.getConfig())

  await driver.writeConfig(config)
}
