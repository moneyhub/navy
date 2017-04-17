/* @flow */

import path from 'path'
import chalk from 'chalk'
import fs from '../util/fs'
import {getNavy} from '../'
import {getImportOptionsForCLI} from '../config-provider'
import {importNavy} from './util'

export default async function (opts: Object): Promise<void> {
  const navy = getNavy(opts.navy)
  const boatAsciiArt = fs.readFileSync(path.join(__dirname, '../../resources/sailing-boat.txt')).toString()

  const initialiseOpts = await getImportOptionsForCLI(opts)

  await importNavy(navy, initialiseOpts)

  console.log(` You can now use ${chalk.bold('navy')} commands from any directory to control this Navy.`)
  console.log()

  if (process.stdout.isTTY) {
    console.log(boatAsciiArt)
    console.log()
  }
}
