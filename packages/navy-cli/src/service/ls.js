/* @flow */

import chalk from 'chalk'

import {getNavy, Navy} from 'navy'
import table from '../util/table'
import {runCLI} from '../util/helper'

const definition = `
usage: navy service [-n NAVY] ls [-h] [--json]

Options:
  --json               Output as JSON instead of table
  -n, --navy NAVY      Specifies the navy to use [env: NAVY_NAME] [default: dev]
  -h, --help           Shows usage
`

const SMALL_WINDOW_COLUMNS = 185

function getStatus(service, state) {
  let statusString = service.status === 'exited'
    ? chalk.red(service.status)
    : service.status

  if (state && state.services && state.services[service.name]) {
    const serviceState = state.services[service.name]

    if (serviceState._develop) {
      statusString += ' ' + chalk.yellow('(development)')
    }

    if (serviceState._tag) {
      statusString += ' ' + chalk.cyan(`@ ${serviceState._tag}`)
    }
  }

  return statusString
}

function getPorts(service) {
  if (!service || !service.raw || !service.raw.NetworkSettings || !service.raw.NetworkSettings.Ports) {
    return '-'
  }

  const ports = service.raw.NetworkSettings.Ports
  const portKeys = Object.keys(ports)

  return portKeys.map(portKey => {
    return ports[portKey]
      ? `${ports[portKey].map(conf => conf.HostPort).join(', ')}->${portKey}`
      : portKey
  }).join(', ')
}

function getUrl(service, navy: Navy) {
  if (!service || !service.raw || !service.raw.Config || !service.raw.Config.Env) {
    return '-'
  }

  const env = service.raw.Config.Env

  for (const envVar of env) {
    if (envVar.indexOf('VIRTUAL_HOST=') === 0) {
      return envVar.substring('VIRTUAL_HOST='.length)
    }
  }

  return '-'
}

export default async function (): Promise<void> {
  const args = runCLI(definition)

  const navy = getNavy(args['--navy'])
  const ps = await navy.ps()
  const state = await navy.getState()

  // $FlowIgnore getWindowSize not on type
  const isSmallConsole = process.stdout.isTTY && process.stdout.getWindowSize()[0] < SMALL_WINDOW_COLUMNS

  if (args['--json']) {
    return console.log(JSON.stringify(ps, null, 2))
  }

  if (isSmallConsole) {
    return console.log(table([
      ['ID', 'NAME', 'STATUS', 'PORTS', 'URL'],
      ...ps.map(service => [
        service.id.substring(0, 12),
        service.name,
        getStatus(service, state),
        getPorts(service),
        getUrl(service, navy),
      ]),
    ]))
  }

  console.log(table([
    ['ID', 'NAME', 'IMAGE', 'STATUS', 'PORTS', 'URL'],
    ...ps.map(service => [
      service.id.substring(0, 12),
      service.name,
      service.image,
      getStatus(service, state),
      getPorts(service),
      getUrl(service, navy),
    ]),
  ]))
}
