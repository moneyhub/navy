/* @flow */

import {execSync} from 'child_process'
import path from 'path'

export default async function (navy: string): Promise<void> {
  // $FlowIgnore flow bug with execSync
  execSync(path.join(__dirname, '../../../bin/navy-config.js') + ' ' + process.argv.slice(3).join(' '), { stdio: 'inherit' })
}
