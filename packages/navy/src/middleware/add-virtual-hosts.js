/* @flow */

import {mapValues} from 'lodash'
import {Navy} from '../navy'
import {getHostForService} from '../util/xipio'

export default (navy: Navy) =>
  (config: Object, state: Object) => ({
    ...config,
    services: mapValues(config.services, (service, serviceName) => {
      if (service.labels && service.labels['com.navy.httpProxyPort']) {
        return {
          ...service,
          environment: {
            'VIRTUAL_HOST': getHostForService(serviceName, navy.normalisedName),
            'VIRTUAL_PORT': service.labels['com.navy.httpProxyPort'],
            ...service.environment,
          },
        }
      }

      return service
    }),
  })
