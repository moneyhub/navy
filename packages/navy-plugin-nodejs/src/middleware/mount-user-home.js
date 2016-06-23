import mapValues from 'lodash.mapvalues'

export default (config, state) => {
  return {
    ...config,
    services: mapValues(config.services, (service, serviceName) => {
      if (state.services[serviceName] && state.services[serviceName]._develop) {
        return {
          ...service,
          volumes: [
            ...service.volumes || [],
            `${process.env.HOME}:${process.env.HOME}`,
          ],
        }
      }

      return service
    }),
  }
}
