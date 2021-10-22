import rimraf from 'rimraf'
import {cleanUpNavies} from './util/setup-navy'
import {setConfig} from '../../packages/navy/src/config'

import {After, setDefaultTimeout} from '@cucumber/cucumber'

setDefaultTimeout(2 * 60 * 1000)

After(async function () {
  await cleanUpNavies()

  if (this.localCopyPath) {
    rimraf.sync(this.localCopyPath)
  }

  // reset config
  await setConfig(null)
})
