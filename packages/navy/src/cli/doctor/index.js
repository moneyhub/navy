/* @flow */

import chalk from 'chalk'
import cleanTemporaryComposeFiles from './clean-compose-files'
import checkForInvalidState from './invalid-state'
import checkForInvalidComposeConfig from './invalid-compose-config'

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
    cleanTemporaryComposeFiles,
    checkForInvalidState,
    checkForInvalidComposeConfig,
  ])

  if (errors.length > 0) {
    console.log(chalk.yellow('There were some issues'))
    console.log()

    errors.forEach(error => console.log(error.stack))

    return
  }

  console.log()
  console.log(chalk.green(' ✔ Finished tests'))
  console.log()
  console.log(' Please try running Navy again if it wasn\'t working before.')
  console.log(' If you still have problems, please open an issue at https://github.com/momentumft/navy/issues/new')
  console.log()
}
