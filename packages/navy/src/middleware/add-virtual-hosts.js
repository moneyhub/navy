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
  service.ports && find(service.ports, portDefinition => {
      // In older versions of Docker Compose `ports` could just be an array of string/number,
      // but it's changed to e.g. {target: "80"}
      const port = "target" in portDefinition ? portDefinition.target : portDefinition

      // Should handle "80" (short syntax), "80:80" (long syntax), and "80/tcp" (including protocol) formats.
      return port.toString() === '80' || port.toString().startsWith('80:') || port.toString().startsWith('80/')
    }
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
