/* @flow */

import inquirer from 'inquirer'
import {getOrInitialiseNavy} from './util'
import {startDriverLogging, stopDriverLogging} from '../driver-logging'

const SELECTED_WEIGHT = 100 // make sure selected services appear at the top

export default async function (services: Array<string>, opts: Object): Promise<void> {
  const navy = await getOrInitialiseNavy(opts.navy)

  const navyFile = (await navy.getNavyFile()) || {}

  await navy.ensurePluginsLoaded()

  const serviceNames = await navy.getAvailableServiceNames()
  const launchedServiceNames = await navy.getLaunchedServiceNames()

  const selectedServiceNames = launchedServiceNames.length > 0
    ? launchedServiceNames
    : navyFile.launchDefaults || []

  if (!services || services.length === 0) {
    const choices = serviceNames
      .sort(name => selectedServiceNames.indexOf(name) === -1 ? SELECTED_WEIGHT : -1)
      .map(name => ({
        name,
        checked: selectedServiceNames.indexOf(name) !== -1,
      }))

    const { services: selectedServices } = await inquirer.prompt([{
      type: 'checkbox',
      message: 'Select services that you\'d like to bring up',
      name: 'services',
      choices,
    }])

    services = selectedServices
  }

  if (services.length === 0) {
    return
  }

  await navy.emitAsync('cli.before.launch')

  startDriverLogging('Launching services...')
  await navy.launch(services)
  stopDriverLogging()
}
