/* @flow */

import zygon from 'zygon'
import chalk from 'chalk'
import {getLaunchedNavies, Environment} from '../../'
import {getConfig} from '../config'

export async function printPS(env: Environment, json: boolean): any {
  const ps = await env.ps()

  if (json) {
    return console.log(JSON.stringify(ps, null, 2))
  }

  if (ps.length === 0) {
    return console.log(chalk.dim('There are no running services'))
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
}

export default async function (opts: Object): Promise<void> {
  const navies = await getLaunchedNavies()
  navies.forEach(navy => printPS(navy, opts.json))
}
