/* @flow */

import chalk from 'chalk'
import {startDriverLogging, stopDriverLogging} from '../../driver-logging'
import {NavyError} from '../../errors'

import type {Navy} from '../../'

const OPTION_LABEL_MAP = {
  configProvider: 'Provider',
  path: 'Directory',
  npmPackage: 'NPM Package',
}

export async function importNavy(navy: Navy, initialiseOpts: Object) {
  if (await navy.isInitialised()) {
    throw new NavyError(`Navy "${navy.name}" has already been imported and initialised.`)
  }

  await navy.initialise(initialiseOpts)

  await navy.ensurePluginsLoaded()
  await navy.emitAsync('cli.import')

  startDriverLogging('Ensuring services are up to date...')
  await navy.relaunch()
  stopDriverLogging()

  console.log()
  console.log(chalk.green(` Navy "${chalk.white.bold(navy.name)}" has now been imported and initialised. 🎉`))
  console.log()

  for (const key in initialiseOpts) {
    if (OPTION_LABEL_MAP[key]) {
      console.log(` ${chalk.bold(OPTION_LABEL_MAP[key])}: ${chalk.dim(initialiseOpts[key])}`)
    }
  }

  console.log()
}
