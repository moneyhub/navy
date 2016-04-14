/* @flow */

import zygon from 'zygon'
import chalk from 'chalk'
import {getLaunchedNavies, Navy} from '../../'
import {getConfig} from '../config'

export async function printPS(env: Navy, json: boolean): Promise<boolean> {
  const ps = await env.ps()

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
    { name: 'ID' },
    { name: 'Name' },
    { name: 'Image' },
    { name: 'Status' },
  ], ps.map(service => [
    service.id,
    service.name,
    service.image,
    service.status,
  ]))

  return true
}

export default async function (opts: Object): Promise<void> {
  const navies = await getLaunchedNavies()
  navies.forEach(navy => printPS(navy, opts.json))
}
