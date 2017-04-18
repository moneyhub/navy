/* @flow */

import {find} from 'lodash'
import {createHostForService} from '../util/service-host'

import type {Navy} from '../navy'

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
    const services = {}
    const externalIP = await navy.externalIP()

    await Promise.all(Object.keys(config.services).map(async serviceName => {
      const service = config.services[serviceName]
      let proxyConfig = getServiceHTTPProxyConfig(serviceName, navyFile)

      // proxy port 80 even without config
      if (!proxyConfig && serviceHasPort80(service)) {
        proxyConfig = { port: 80 }
      }

      if (proxyConfig) {
        return services[serviceName] = {
          ...service,
          environment: {
            'VIRTUAL_HOST': await createHostForService(serviceName, navy.normalisedName, externalIP),
            'VIRTUAL_PORT': proxyConfig.port,
            ...service.environment,
          },
        }
      }

      return services[serviceName] = service
    }))

    return {
      ...config,
      services,
    }
  }
