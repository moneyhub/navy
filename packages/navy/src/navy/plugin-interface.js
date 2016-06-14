/* @flow */

import bluebird from 'bluebird'
import {Navy} from './'

import type {ConfigProvider} from '../config-provider'

const resolve = bluebird.promisify(require('resolve'))

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

  // $FlowIgnore: entry point to plugin has to be dynamic
  const plugins = pluginPaths.map(pluginPath => require(pluginPath))

  return plugins.map(Plugin => Plugin(navy))
}
