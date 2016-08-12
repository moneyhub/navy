/* @flow */

import {mapValues} from 'lodash'

type ServiceMapper = (service: Object, serviceName: string) => Object
type ServiceMapperWithState = (service: Object, serviceName: string, serviceState: ?Object) => Object

export const middlewareHelpers = {
  rewriteServices(config: Object, serviceMapperFn: ServiceMapper) {
    return {
      ...config,
      services: mapValues(config.services || {}, serviceMapperFn),
    }
  },

  rewriteServicesWithState(config: Object, state: Object, serviceMapperFn: ServiceMapperWithState) {
    const normalisedState = state || { services: {} }

    function mapperFn(service, serviceName) {
      return serviceMapperFn(service, serviceName, normalisedState.services[serviceName])
    }

    return {
      ...config,
      services: mapValues(config.services || {}, mapperFn),
    }
  },

  addVolumes(service: Object, volumes: Array<string>) {
    const normalisedVolumes = service.volumes || []

    return [
      ...normalisedVolumes,
      ...volumes,
    ]
  },
}
