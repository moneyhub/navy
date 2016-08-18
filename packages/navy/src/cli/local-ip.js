/* @flow */

import chalk from 'chalk'
import {setConfig, getConfig} from '../config'
import {reconfigureAllNavies} from './util/reconfigure'

export default async function (navy: string): Promise<void> {
  await setConfig({
    ...getConfig(),
    externalIP: '127.0.0.1',
  })

  await reconfigureAllNavies()

  console.log()
  console.log(chalk.green(' ✔ Now using your local IP address (127.0.0.1)'))
  console.log()
}
