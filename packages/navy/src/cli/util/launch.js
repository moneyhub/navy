import inquirer from 'inquirer'
import {Navy} from '../../'
import {startDriverLogging, stopDriverLogging} from '../../driver-logging'

export async function showLaunchPrompt(navy: Navy): Promise<void> {
  const navyFile = (await navy.getNavyFile()) || {}

  await navy.ensurePluginsLoaded()

  const serviceNames = await navy.getAvailableServiceNames()
  const launchedServiceNames = await navy.getLaunchedServiceNames()

  const selectedServiceNames = launchedServiceNames.length > 0
    ? launchedServiceNames
    : navyFile.launchDefaults || []

  const choices = serviceNames
    .sort(name => selectedServiceNames.indexOf(name) === -1 ? 100 : -1)
    .map(name => ({
      name,
      checked: selectedServiceNames.indexOf(name) !== -1,
      disabled: launchedServiceNames.indexOf(name) !== -1 ? 'already launched' : false,
    }))

  const { services } = await inquirer.prompt([{
    type: 'checkbox',
    message: 'Select services that you\'d like to bring up',
    name: 'services',
    pageSize: process.stdout.rows - 2,
    choices,
  }])

  if (services.length === 0) {
    return
  }

  await navy.emitAsync('cli.before.launch')

  startDriverLogging('Launching services...')
  await navy.launch(services)
  stopDriverLogging()
}
