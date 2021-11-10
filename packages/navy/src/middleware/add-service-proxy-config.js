/* @flow */

import {find} from 'lodash'
import {createHostForService} from '../util/service-host'
import { createCert } from '../util/https'
import type {Navy} from '../navy'

const getServiceHTTPProxyConfig = (serviceName, navyFile) => {
  if (navyFile && navyFile.httpProxy && navyFile.httpProxy[serviceName]) {
    return navyFile.httpProxy[serviceName]
  }

  return null
}

const serviceGetAutoProxyPortOr80 = (service, navyFile) => {
  const autoPorts: any[] = (navyFile && Array.isArray(navyFile.httpProxyAutoPorts) && navyFile.httpProxyAutoPorts) || ['80']
  return service.ports && find(autoPorts, autoPort => {
    const autoPortString = autoPort.toString()

    return find(service.ports, portDefinition => {
      // In older versions of Docker Compose `ports` could just be an array of string/number,
      // but it's changed to e.g. {target: "80"}
      const port = typeof portDefinition === 'object' && 'target' in portDefinition
        ? portDefinition.target
        : portDefinition

      const portString = port.toString()

      return portString === autoPortString || portString.startsWith(`${autoPortString}:`) || portString.startsWith(`${autoPortString}/`)
    })
  })
}

export default (navy: Navy) =>
  async (config: Object, state: Object) => {
    const navyFile = await navy.getNavyFile()
    const services = {}
    const externalIP = await navy.externalIP()

    await Promise.all(Object.keys(config.services).map(async serviceName => {
      const service = config.services[serviceName]
      let proxyConfig: ?Object = getServiceHTTPProxyConfig(serviceName, navyFile)

      // proxy port 80 even without service config, or a different port with config httpProxyAutoPorts
      if (!proxyConfig) {
        const autoPort = serviceGetAutoProxyPortOr80(service, navyFile)
        if (autoPort) {
          proxyConfig = { port: parseInt(autoPort) }
        }
      }


      if (proxyConfig) {
        const hostName = await createHostForService(serviceName, navy.normalisedName, externalIP)

        if (proxyConfig.enableHttps) await createCert({hostName})

        return services[serviceName] = {
          ...service,
          environment: {
            'VIRTUAL_HOST': hostName,
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
