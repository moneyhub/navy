/* @flow */

import chalk from 'chalk'

import {getNavy} from '../'
import {NavyError} from '../errors'
import getNavyRc from '../util/navyrc'

export default async function (service: string, opts: Object): Promise<void> {
  const navy = getNavy(opts.navy)
  const cwd = process.cwd()
  const navyRc = await getNavyRc(cwd)

  if (navyRc && !navyRc.services) {
    throw new NavyError(`No valid .navyrc file was found in "${cwd}"`)
  }

  if (navyRc && navyRc.services.length > 1 && !service) {
    throw new NavyError('Multiple service mappings are defined in .navyrc, you need to explicitly specify what service to develop')
  }

  if (navyRc && !service) {
    service = navyRc.services[0]
  }

  const state = (await navy.getState()) || {}

  if (!state || !state.services || !state.services[service] || !state.services[service]._develop) {
    return console.log(chalk.dim(`Nothing to do, ${service} is not in development`))
  }

  await navy.saveState({
    ...state,
    services: {
      ...state.services,
      [service]: {
        ...(state.services || {})[service],
        _develop: undefined,
      },
    },
  })

  await navy.kill([service])
  await navy.relaunch({ noDeps: true })

  console.log(`${service} is no longer in development`)
}
