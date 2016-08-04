/* @flow */

import chalk from 'chalk'

import {getNavy} from '../'
import table from '../util/table'

function getStatus(service, state) {
  const health = service.raw && service.raw.State.Health

  if (!health) {
    return '-'
  }

  const statusString = health.Status === 'healthy'
    ? chalk.green('✔ Healthy')
    : chalk.red('• Unhealthy')

  return statusString
}

function getHistory(service, state) {
  const health = service.raw && service.raw.State.Health

  if (!health) {
    return '-'
  }

  const history = health.Log

  return history.map(record => record.ExitCode === 0
    ? chalk.green('█')
    : chalk.red('x')
  ).join(' ')
}

export default async function (opts: Object): Promise<void> {
  const navy = getNavy(opts.navy)
  const ps = await navy.ps()
  const state = await navy.getState()

  console.log(table([
    ['NAME', 'STATUS', 'HISTORY'],
    ...ps.map(service => [
      service.name,
      getStatus(service, state),
      getHistory(service, state),
    ]),
  ]))
}
