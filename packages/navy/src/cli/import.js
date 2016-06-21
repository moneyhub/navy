/* @flow */

import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import {getNavy} from '../'
import {NavyError} from '../errors'
import {getImportOptionsForCLI} from '../config-provider'

const OPTION_LABEL_MAP = {
  configProvider: 'Provider',
  path: 'Directory',
  npmPackage: 'NPM Package',
}

export default async function (opts: Object): Promise<void> {
  const env = getNavy(opts.navy)
  const boatAsciiArt = fs.readFileSync(path.join(__dirname, '../../resources/sailing-boat.txt')).toString()

  if (await env.isInitialised()) {
    throw new NavyError(`Navy "${opts.navy}" has already been imported and initialised.`)
  }

  const initialiseOpts = await getImportOptionsForCLI(opts)

  await env.initialise(initialiseOpts)

  await env.ensurePluginsLoaded()
  await env.emitAsync('cli.import')

  console.log()
  console.log(chalk.green(` Navy "${chalk.white.bold(opts.navy)}" has now been imported and initialised. 🎉`))
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
