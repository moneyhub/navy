/* @flow */

import bluebird from 'bluebird'
import {Navy} from './'

import type {ConfigProvider} from '../config-provider'

const resolve = bluebird.promisify(require('resolve'))
const debug = require('debug')('navy:plugin-interface')

export async function loadPlugins(navy: Navy, navyFile: Object): Promise<Array<Object>> {
  const configProvider: ?ConfigProvider = await navy.getConfigProvider()

  if (!configProvider) {
    throw new Error('Could not determine config provider')
  }

  const basedir = await configProvider.getNavyPath()

  if (!navyFile.plugins) {
    return []
  }

  const pluginPaths = await Promise.all(navyFile.plugins.map(async pluginName =>
    resolve(pluginName, { basedir })
  ))

  debug('Got plugins', pluginPaths)

  const plugins = pluginPaths.map(pluginPath => {
    debug('Loading', pluginPath)

    return global.require(pluginPath)
  })

  debug('Got loaded plugins', plugins)

  return plugins.map(Plugin => Plugin(navy))
}
