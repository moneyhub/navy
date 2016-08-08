/* @flow */

import util from 'util'
import invariant from 'invariant'
import chalk from 'chalk'

export const fix = async (assertion: boolean, message: string, ...params: Array<any>) => {
  invariant(params.length > 0, 'DOCTOR_FIX_NO_PARAMS')

  const fixCallback = params[params.length - 1]

  if (assertion) {
    console.log(chalk.yellow('----->', util.format(message, ...params.slice(0, -1))))
    await fixCallback()
  }
}

export const start = (message: string) => {
  console.log(chalk.dim('----->', message))
}
