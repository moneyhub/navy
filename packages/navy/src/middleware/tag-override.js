export default function tagOverrideMiddleware(config, state) {
  const newConfig = config

  Object.keys(state.services || {}).forEach(function (serviceName) {
    const serviceConfig = newConfig.services[serviceName]
    const serviceState = state.services[serviceName]

    if (serviceState._tag) {
      let image = serviceConfig.image

      // strip existing tag off if it exists
      if (image.indexOf(':') !== -1) {
        image = image.substring(0, image.indexOf(':'))
      }

      // add new tag
      image += ':' + serviceState._tag

      serviceConfig.image = image
    }
  })

  return newConfig
}
