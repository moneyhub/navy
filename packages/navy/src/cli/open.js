/* @flow */

import open from 'open'
import {getNavy} from '../'

export default async function (service: string, opts: Object): Promise<void> {
  const navy = getNavy(opts.navy)

  open(await navy.url(service))
  console.log(`🌐  Opening ${service}...`)
}
