/* @flow */

export default (config: Object, state: Object) => {
  const newConfig = config

  Object.keys(state.services || {}).forEach(function (serviceName) {
    const serviceConfig = newConfig.services[serviceName]
    const serviceState = state.services[serviceName]

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

    if (serviceState.developConfig) {
      Object.assign(serviceConfig, serviceState.developConfig)
    }
  })

  return newConfig
}
