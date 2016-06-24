/* @flow */

import Bluebird from 'bluebird'
import {Navy} from './'
import defaultMiddleware from './default-middleware'

import type {State} from './state'
import type {Driver} from '../driver'

const debug = require('debug')('navy:middleware')

export async function middlewareRunner(navy: Navy, state: State): Promise {
  const driver: ?Driver = await navy.getDriver()

  if (!driver) {
    return
  }

  await navy.ensurePluginsLoaded()

  const middleware = [
    ...defaultMiddleware,
    ...navy._registeredMiddleware,
  ]

  debug('Got middleware, running', middleware.map(fn => fn.name))

  const config = await Bluebird.reduce(middleware, async (prevConfig, middlewareFn) => await middlewareFn(prevConfig, state), await driver.getConfig())

  debug('Finished running middleware')

  await driver.writeConfig(config)
}
