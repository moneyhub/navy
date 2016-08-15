/* @flow */

import {getNavy} from '../../'
import {importNavy} from './import'
import fileSystemConfigProvider from '../../config-providers/filesystem'

export async function getOrInitialiseNavy(navyName: string) {
  const navy = getNavy(navyName)

  if (!await navy.isInitialised()) {
    await importNavy(navy, await fileSystemConfigProvider.getImportOptionsForCLI({}))
  }

  return navy
}
