/* @flow */

import {merge} from 'lodash'

export default (config: Object, state: Object) => {
  const newConfig = config

  Object.keys(state.services || {}).forEach(function (serviceName) {
    const serviceConfig = newConfig.services[serviceName]
    const serviceState = state.services[serviceName]

    // DEPRECATED .navyrc development
    if (serviceState._develop) {
      serviceConfig.stdin_open = true

      serviceConfig.volumes = [
        ...serviceConfig.volumes || [],
        ...Object.keys(serviceState._develop.mounts).map(local => `${local}:${serviceState._develop.mounts[local]}`),
      ]

      if (serviceState._develop.command) {
        serviceConfig.command = serviceState._develop.command
      }
    }

    // new .navy-develop.yml
    if (serviceState.developConfig) {
      serviceConfig.stdin_open = true

      merge(serviceConfig, serviceState.developConfig)
    }
  })

  return newConfig
}
