/* @flow */

import {mapValues} from 'lodash'


export default (config: Object, state: Object) => ({
  ...config,
  services: mapValues(config.services, (serviceConfig, serviceName) => {
    const serviceState = state.services[serviceName] || {}
    return {
      ...serviceConfig,
      image: {
        ...serviceConfig.image,
        ...serviceState.image,
      },
    }
  }),
})
