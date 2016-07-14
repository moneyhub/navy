/* @flow */

import {Navy} from './'
import resolve from '../util/resolve'

import type {ConfigProvider} from '../config-provider'

export async function loadPlugins(navy: Navy, navyFile: Object): Promise<Array<Object>> {
  const configProvider: ?ConfigProvider = await navy.getConfigProvider()

  if (!configProvider) {
    throw new Error('Could not determine config provider')
  }

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
    throw new Error('Couldn\'t resolve some of the plugins: ' + navyFile.plugins)
  }

  // $FlowIgnore: entry point to plugin has to be dynamic
  const plugins = pluginPaths.map(pluginPath => require(pluginPath))

  return plugins.map((Plugin, index) => {
    if (typeof Plugin !== 'function') {
      throw new Error(navyFile.plugins[index] + ' doesn\'t export a function as the entrypoint')
    }

    return Plugin(navy)
  })
}
