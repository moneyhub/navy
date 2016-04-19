/* @flow */

import chalk from 'chalk'
import {setConfig, getConfig} from '../config'

export default async function (navy: string): Promise<void> {
  await setConfig({
    ...getConfig(),
    defaultNavy: navy,
  })

  console.log()
  console.log(chalk.green(' ✔ Default navy set to ' + chalk.bold(navy)))
  console.log()
}
