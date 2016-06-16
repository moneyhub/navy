/* @flow */

import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import {getNavy} from '../'
import {NavyError} from '../errors'

export default async function (opts: Object): Promise<void> {
  const env = getNavy(opts.navy)
  const boatAsciiArt = fs.readFileSync(path.join(__dirname, '../../resources/sailing-boat.txt')).toString()

  if (await env.isInitialised()) {
    throw new NavyError(`Navy "${opts.navy}" has already been imported and initialised.`)
  }

  await env.initialise({
    configProvider: 'filesystem',
    path: process.cwd(),
  })

  console.log()
  console.log(chalk.green(` Navy "${chalk.white.bold(opts.navy)}" has now been imported and initialised. 🎉`))
  console.log()
  console.log(` ${chalk.bold('Directory')}: ${chalk.dim(process.cwd())}`)
  console.log()
  console.log(` You can now use ${chalk.bold('navy')} commands from any directory to control this Navy.`)
  console.log()
  console.log(boatAsciiArt)
  console.log()
}
