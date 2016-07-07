/* @flow */

import {mapValues, find} from 'lodash'
import {Navy} from '../navy'
import {getHostForService} from '../util/xipio'

const getServiceHTTPProxyConfig = (serviceName, navyFile) => {
  if (navyFile && navyFile.httpProxy && navyFile.httpProxy[serviceName]) {
    return navyFile.httpProxy[serviceName]
  }

  return null
}

const serviceHasPort80 = service =>
  service.ports && find(service.ports, port =>
    port.toString() === '80'
  )

export default (navy: Navy) =>
  async (config: Object, state: Object) => {
    const navyFile = await navy.getNavyFile()

    return {
      ...config,
      services: mapValues(config.services, (service, serviceName) => {
        let proxyConfig = getServiceHTTPProxyConfig(serviceName, navyFile)

        // proxy port 80 even without config
        if (!proxyConfig && serviceHasPort80(service)) {
          proxyConfig = { port: 80 }
        }

        if (proxyConfig) {
          return {
            ...service,
            environment: {
              'VIRTUAL_HOST': getHostForService(serviceName, navy.normalisedName),
              'VIRTUAL_PORT': proxyConfig.port,
              ...service.environment,
            },
          }
        }

        return service
      }),
    }
  }
