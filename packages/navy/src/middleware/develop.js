/* @flow */

import {middlewareHelpers} from './helpers'

function rewriteService(service, serviceName, serviceState) {
  if (!serviceState || !serviceState._develop) return service

  return {
    ...service,
    stdin_open: true,
    volumes: middlewareHelpers.addVolumes(service,
      Object.keys(serviceState._develop.mounts).map(local => `${local}:${serviceState._develop.mounts[local]}`),
    ),
    command: serviceState._develop.command
      ? serviceState._develop.command
      : service.command,
  }
}

export default (config: Object, state: Object) =>
  middlewareHelpers.rewriteServicesWithState(config, state, rewriteService)
