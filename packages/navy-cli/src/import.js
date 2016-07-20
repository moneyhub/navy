/* @flow */

import fs from 'fs'
import path from 'path'
import inquirer from 'inquirer'
import chalk from 'chalk'
import {getNavy} from 'navy'
import {NavyError} from 'navy/lib/errors'
import {startDriverLogging, stopDriverLogging} from 'navy/lib/driver-logging'
import {resolveConfigProviderFromName, getAvailableConfigProviders} from 'navy/lib/config-provider'

import {runCLI} from './util/helper'
import {showLaunchPrompt} from './util/launch'

const definition = `
usage: navy import [-h] [-n NAVY] [--no-launch-prompt] [-p PROVIDER] [<args>...]

Options:
      --no-launch-prompt    Don't show the prompt asking for which services to launch
  -p, --provider            Specifies the formation provider to use
  -n, --navy NAVY           Specifies the navy to use [env: NAVY_NAME] [default: dev]
  -h, --help                Shows usage

Run 'navy import -p PROVIDER --help' for command line usage for a specific provider.
If a provider is not specified, an interactive import prompt will be displayed.
`

const OPTION_LABEL_MAP = {
  configProvider: 'Provider',
  path: 'Directory',
  npmPackage: 'NPM Package',
}

export default async function (): Promise<void> {
  const args = runCLI(definition, { ignoreHelpFlag: true })
  const navy = getNavy(args['--navy'])
  const boatAsciiArt = fs.readFileSync(path.join(__dirname, '../resources/sailing-boat.txt')).toString()

  if (!args['--provider'] && args['--help']) {
    return console.log(definition.trim())
  }

  if (await navy.isInitialised()) {
    throw new NavyError(`Navy "${navy.name}" has already been imported and initialised.`)
  }

  // $FlowIgnore isTTY?
  const showInteractivePrompt = !args['--provider'] && process.stdout.isTTY

  let providerName

  if (showInteractivePrompt) {
    const availableConfigProviders = getAvailableConfigProviders()

    providerName = (await inquirer.prompt([{
      name: 'provider',
      type: 'list',
      message: 'Where does your formation config live? (Docker Compose files)',
      choices: Object.keys(availableConfigProviders).map(name => ({
        name: availableConfigProviders[name].importPromptSelectorName, value: name,
      })),
    }])).provider
  } else {
    providerName = args['--provider']
  }

  const configProvider = resolveConfigProviderFromName(providerName)

  if (!configProvider) {
    throw new NavyError('Invalid config provider')
  }

  let initialiseOpts = null

  if (showInteractivePrompt) {
    const configProviderOptions = configProvider.getImportPromptOptions
      ? configProvider.getImportPromptOptions()
      : []

    if (configProviderOptions.length > 0) {
      const results = await inquirer.prompt(configProviderOptions)
      initialiseOpts = await configProvider.getImportOptionsFromPrompt(results)
    } else {
      initialiseOpts = await configProvider.getImportOptionsFromPrompt(null)
    }
  } else {
    const providerCLIDefinition = `
usage: navy import -p ${providerName} [-h] [-n NAVY] [--no-launch-prompt] ${await configProvider.getImportCLIDefinition().trim()}

Options:
      --no-launch-prompt    Don't show the prompt asking for which services to launch
  -p, --provider            Specifies the formation provider to use
  -n, --navy NAVY           Specifies the navy to use [navy: NAVY_NAME] [default: dev]
  -h, --help                Shows usage
    `

    const providerSpecificArgs = runCLI(providerCLIDefinition)

    initialiseOpts = await configProvider.getImportOptionsFromCLI(providerSpecificArgs)
  }

  if (!initialiseOpts) {
    throw new NavyError('No initialisation options provided')
  }

  await navy.initialise(initialiseOpts)

  await navy.ensurePluginsLoaded()
  await navy.emitAsync('cli.import')

  startDriverLogging('Ensuring services are up to date...')
  await navy.relaunch()
  stopDriverLogging()

  if (!args['--no-launch-prompt'] && process.stdout.isTTY) {
    await showLaunchPrompt(navy)
  }

  console.log()
  console.log(chalk.green(` Navy "${chalk.white.bold(navy.name)}" has now been imported and initialised. 🎉`))
  console.log()

  for (const key in initialiseOpts) {
    if (OPTION_LABEL_MAP[key]) {
      console.log(` ${chalk.bold(OPTION_LABEL_MAP[key])}: ${chalk.dim(initialiseOpts[key])}`)
    }
  }

  console.log()
  console.log(` You can now use ${chalk.bold('navy')} commands from any directory to control this Navy.`)
  console.log()
  console.log(boatAsciiArt)
  console.log()
}
