/* @flow */

import zygon from 'zygon'
import chalk from 'chalk'
import {getLaunchedNavies, Navy} from '../'
import {getConfig} from '../config'

function getStatus(service, state) {
  let statusString = service.status

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

export async function printPS(env: Navy, json: boolean): Promise<boolean> {
  const ps = await env.ps()
  const state = await env.getState()

  if (json) {
    console.log(JSON.stringify(ps, null, 2))
    return true
  }

  if (ps.length === 0) {
    return false
  }

  const defaultStatus = getConfig().defaultNavy === env.name
    ? chalk.blue(' (default navy)')
    : ''

  console.log()
  console.log('  ' + chalk.underline(env.name) + defaultStatus)

  zygon([
    { name: 'ID', size: 8 },
    { name: 'Name', size: 15 },
    { name: 'Image', size: 35 },
    { name: 'Status', size: 25 },
  ], ps.map(service => [
    service.id,
    service.name,
    service.image,
    getStatus(service, state),
  ]))

  return true
}

export default async function (opts: Object): Promise<void> {
  const navies = await getLaunchedNavies()

  if (navies.length === 0) {
    console.log(chalk.dim('There are no launched navies'))
    return
  }

  navies.forEach(navy => printPS(navy, opts.json))
}
