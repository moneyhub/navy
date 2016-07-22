/* @flow */

import {mapValues} from 'lodash'

function getPortConfig(serviceName, state) {
  return state.services[serviceName]
    ? (state.services[serviceName]._ports || {})
    : {}
}

export default (config: Object, state: Object) => ({
  ...config,
  services: mapValues(config.services, (service, serviceName) => {
    const portConfig = getPortConfig(serviceName, state)
    const hasPortConfig = !!portConfig
    const internalPorts = Object.keys(portConfig).filter(internal => !!portConfig[internal])

    const inheritedPorts = service.ports
      ? service.ports.filter(port => internalPorts.indexOf(port) === -1)
      : []

    return {
      ...service,
      ports: hasPortConfig ? [
        ...inheritedPorts,
        ...internalPorts.map(internal => `${portConfig[internal]}:${internal}`),
      ] : service.ports,
    }
  }),
})
