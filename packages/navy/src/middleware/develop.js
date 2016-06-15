export default (config, state) => {
  const newConfig = config

  Object.keys(state.services || {}).forEach(function (serviceName) {
    const serviceConfig = newConfig.services[serviceName]
    const serviceState = state.services[serviceName]

    if (serviceState._develop) {
      serviceConfig.volumes = [
        ...serviceConfig.volumes || [],
        ...Object.keys(serviceState._develop.mounts).map(local => `${local}:${serviceState._develop.mounts[local]}`),
      ]
    }
  })

  return newConfig
}
