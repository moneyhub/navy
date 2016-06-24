/* @flow */

import inquirer from 'inquirer'
import {getNavy} from '../'
import {startDriverLogging, stopDriverLogging} from '../driver-logging'

export default async function (services: Array<string>, opts: Object): Promise<void> {
  const env = getNavy(opts.navy)
  const navyFile = (await env.getNavyFile()) || {}

  await env.ensurePluginsLoaded()

  const serviceNames = await env.getAvailableServiceNames()
  const launchedServiceNames = await env.getLaunchedServiceNames()

  const selectedServiceNames = launchedServiceNames.length > 0
    ? launchedServiceNames
    : navyFile.launchDefaults || []

  if (!services || services.length === 0) {
    const choices = serviceNames
      .sort(name => selectedServiceNames.indexOf(name) === -1 ? 100 : -1)
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

  await env.emitAsync('cli.before.launch')

  startDriverLogging('Launching services...')
  await env.launch(services)
  stopDriverLogging()
}
