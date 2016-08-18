/* @flow */

import {getLaunchedNavies} from '../../'
import {startDriverLogging, stopDriverLogging} from '../../driver-logging'

export async function reconfigureAllNavies() {
  const navies = await getLaunchedNavies()

  for (const navy of navies) {
    startDriverLogging('Reconfiguring ' + navy.name)
    await navy.reconfigure()
    stopDriverLogging()
  }
}
