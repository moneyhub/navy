/* @flow */

import bluebird from 'bluebird'
import invariant from 'invariant'
import {Navy} from './'

import type {ConfigProvider} from '../config-provider'

const resolve = bluebird.promisify(require('resolve'))

export async function loadPlugins(navy: Navy, navyFile: Object): Promise<Array<Object>> {
  const configProvider: ?ConfigProvider = await navy.getConfigProvider()
  invariant(configProvider, 'NO_CONFIG_PROVIDER')

  const basedir = await configProvider.getNavyPath()

  if (!navyFile.plugins) {
    return []
  }

  let pluginPaths

  try {
    pluginPaths = await Promise.all(navyFile.plugins.map(async pluginName =>
      resolve(pluginName, { basedir })
    ))
  } catch (ex) {
    invariant(false, 'PLUGIN_RESOLVE_ERR', navyFile.plugins.join(', '))
  }

  // $FlowIgnore: entry point to plugin has to be dynamic
  const plugins = pluginPaths.map(pluginPath => require(pluginPath))

  return plugins.map((Plugin, index) => {
    invariant(typeof Plugin === 'function', 'PLUGIN_DOESNT_EXPORT_FUNCTION', navyFile.plugins[index])

    return Plugin(navy)
  })
}
