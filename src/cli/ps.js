/* @flow */

import chalk from 'chalk'

import {printPS} from './status'
import {getEnvironment} from '../../'

export default async function (opts: Object): Promise<void> {
  if (!await printPS(getEnvironment(opts.environment), opts.json)) {
    console.log(chalk.dim('There are no running services'))
  }
}
