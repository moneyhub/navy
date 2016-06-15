/* @flow */

import path from 'path'
import chalk from 'chalk'
import {execSync} from 'child_process'

import {getNavy} from '../'
import {NavyError} from '../errors'
import getNavyRc from '../util/navyrc'

export default async function (service: string, opts: Object): Promise<void> {
  const navy = getNavy(opts.navy)
  const cwd = process.cwd()
  const navyRc = await getNavyRc(cwd)

  if (!navyRc || !navyRc.services) {
    throw new NavyError(`No valid .navyrc file was found in "${cwd}"`)
  }

  if (!navyRc.develop) {
    throw new NavyError('No develop mounts found in .navyrc')
  }

  if (navyRc.services.length > 1 && !service) {
    throw new NavyError('Multiple service mappings are defined in .navyrc, you need to explicitly specify what service to develop')
  }

  if (!service) service = navyRc.services[0]

  if (navyRc.services.indexOf(service) === -1) {
    throw new NavyError(`Service "${service}" is not a valid development target`)
  }

  const mounts = {}
  Object.keys(navyRc.develop.mounts).forEach(localPath =>
    mounts[path.resolve(localPath)] = navyRc.develop.mounts[localPath]
  )

  const state = (await navy.getState()) || {}

  await navy.saveState({
    ...state,
    services: {
      ...state.services,
      [service]: {
        ...(state.services || {})[service],
        _develop: {
          mounts,
        },
      },
    },
  })

  await navy.kill([service])
  await navy.relaunch({ noDeps: true })

  console.log(`🚧  ${service} has now restarted in development 🚧`)
  console.log(chalk.dim('-----------'))
  console.log()

  const container = (await navy.ps()).filter(_service => _service.name === service)[0]

  if (!container) {
    throw new NavyError('Could not determine container ID for log attachment')
  }

  const containerId = container.id

  // this loop ends when the user Ctrl+C's out of the CLI process

  while (true) {
    // $FlowIgnore some weird bug with execSync
    execSync(`docker attach --sig-proxy=false ${containerId}`, { stdio: 'inherit' })

    console.log()
    console.log(chalk.dim(`-------> ${service} exited`))
    console.log()
  }
}
