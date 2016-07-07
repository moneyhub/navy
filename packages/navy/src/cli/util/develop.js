/* @flow */

import path from 'path'
import yaml from 'js-yaml'
import fs from '../../util/fs'
import {Navy} from '../../navy'
import {NavyError} from '../../errors'

export async function getNavyDevelopConfig(dir: string) {
  try {
    return yaml.safeLoad(await fs.readFileAsync(path.join(dir, '.navy-develop.yml')))
  } catch (ex) {
    return null
  }
}

export async function processDevelopConfig(services: Array<string>, navy: Navy) {
  const cwd = process.cwd()
  const config = await getNavyDevelopConfig(cwd)

  if (!config || !config.services || config.version !== '2') {
    throw new NavyError('No valid .navy-develop.yml file was found in the current working directory')
  }

  const serviceNames = Object.keys(config.services)

  if (serviceNames.length === 0) {
    throw new NavyError('No services found in .navy-develop.yml')
  }

  if (services.length === 0) services = serviceNames

  const state = await navy.getState()
  const serviceConfig = state && state.services ? {...state.services} : {}

  for (const service of services) {
    if (serviceNames.indexOf(service) !== -1) {
      const developConfig = {...config.services[service]}

      if (developConfig.build && typeof developConfig.build === 'string') {
        // ./my-dir -> /home/user/my-dir
        developConfig.build = path.resolve(developConfig.build)
      }

      if (developConfig.volumes) {
        // ./outside/container:/inside/container -> /home/user/outside/container:/inside/container
        developConfig.volumes = developConfig.volumes.map(vol =>
          vol.indexOf(':') !== -1
          ? `${path.resolve(vol.split(':')[0])}:${vol.substring(vol.indexOf(':') + 1)}`
          : vol,
        )
      }

      serviceConfig[service] = {
        ...serviceConfig[service],
        developConfig,
      }
    }
  }

  await navy.saveState({
    ...state,
    services: serviceConfig,
  })

  return services
}
