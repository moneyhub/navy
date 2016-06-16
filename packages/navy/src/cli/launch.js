/* @flow */

import inquirer from 'inquirer'
import {getNavy} from '../'
import {startDriverLogging, stopDriverLogging} from '../driver-logging'

export default async function (services: Array<string>, opts: Object): Promise<void> {
  const env = getNavy(opts.navy)

  const serviceNames = await env.getAvailableServiceNames()
  const launchedServiceNames = await env.getLaunchedServiceNames()

  if (!services || services.length === 0) {
    const choices = serviceNames
      .map(name => ({
        name,
        checked: launchedServiceNames.indexOf(name) !== -1,
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

  startDriverLogging('Launching services...')
  await env.launch(services)
  stopDriverLogging()
}
