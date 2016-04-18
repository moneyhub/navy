/* @flow */

import chalk from 'chalk'

import {printPS} from './status'
import {getNavy} from '../'

export default async function (opts: Object): Promise<void> {
  if (!await printPS(getNavy(opts.navy), opts.json)) {
    console.log(chalk.dim('There are no running services'))
  }
}
