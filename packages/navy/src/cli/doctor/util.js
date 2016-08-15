/* @flow */

import util from 'util'
import invariant from 'invariant'
import chalk from 'chalk'

export const fix = async (message: string, ...params: Array<any>) => {
  invariant(params.length > 0, 'DOCTOR_FIX_NO_PARAMS')

  const fixCallback = params[params.length - 1]

  console.log(chalk.yellow('----->', util.format(message, ...params.slice(0, -1))))
  await fixCallback()
}

export const start = (message: string) => {
  console.log(chalk.dim('----->', message))
}

export const catchInvariant = async (code: string, fn: Function, catchCallback: Function) => {
  try {
    await fn()
  } catch (ex) {
    if (ex.name === 'Invariant Violation' && ex.message.indexOf(code) === 0) {
      await catchCallback()
    }
  }
}
