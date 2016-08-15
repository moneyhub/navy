/* @flow */

import bluebird from 'bluebird'
import path from 'path'

import {getLaunchedNavyNames} from '../../'
import {start} from './util'
import {pathToNavy} from '../../navy/state'
import {normaliseNavyName} from '../../navy/util'

export default async function () {
  const rimraf = bluebird.promisify(require('rimraf'))

  start('Cleaning temporary Docker Compose files')

  const navyNames = await getLaunchedNavyNames()

  await Promise.all(navyNames.map(async navyName => {
    const navyPath = pathToNavy(normaliseNavyName(navyName))
    await rimraf(path.join(navyPath, 'docker-compose.tmp.yml'))
  }))
}
