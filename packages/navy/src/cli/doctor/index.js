/* @flow */

import chalk from 'chalk'
import checkForInvalidState from './invalid-state'

async function run(fns) {
  const errors = []

  for (const fn of fns) {
    try {
      await fn()
    } catch (ex) {
      errors.push(ex)
    }
  }

  return errors
}

export default async function () {
  const errors = await run([
    checkForInvalidState,
  ])

  if (errors.length > 0) {
    console.log(chalk.yellow('There were some issues'))
    console.log()

    errors.forEach(error => console.log(error.stack))

    return
  }

  console.log(chalk.green('✔ Finished tests'))
}
