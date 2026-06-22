/* @flow */

import { mapValues } from 'lodash'

function getPortConfig(serviceName: string, state: Object): {[string]: string} {
  return state.services[serviceName]
    ? (state.services[serviceName]._ports || {})
    : {}
}

export default (config: Object, state: Object): Object => ({
  ...config,
  services: mapValues(config.services, (service, serviceName) => {
    const portConfig = getPortConfig(serviceName, state)
    const internalPorts = Object.keys(portConfig).filter(internal => !!portConfig[internal])

    const inheritedPorts = service.ports
      ? service.ports.filter(port => internalPorts.indexOf(port) === -1)
      : []

    return {
      ...service,
      ports: [
        ...inheritedPorts,
        ...internalPorts.map(internal => `${portConfig[internal]}:${internal}`),
      ],
    }
  }),
})
