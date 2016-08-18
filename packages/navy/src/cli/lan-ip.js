/* @flow */

import chalk from 'chalk'
import {getLANIP} from '../util/get-lan-ip'
import {setConfig, getConfig} from '../config'
import {reconfigureAllNavies} from './util/reconfigure'

export default async function (navy: string): Promise<void> {
  const lanIP = await getLANIP()

  await setConfig({
    ...getConfig(),
    externalIP: lanIP,
  })

  await reconfigureAllNavies()

  console.log()
  console.log(chalk.green(` ✔ Now using your LAN IP address (${lanIP})`))
  console.log()
}
