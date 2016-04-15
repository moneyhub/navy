import path from 'path'
import {getNavy} from '../../../'
import {ENV_NAME, TEST_SERVICE_NAME} from '../environment'

export default function () {

  this.Given(/I am working with the test navy$/, async function () {
    this.navy = getNavy(ENV_NAME)
  })

  this.Given(/there is a launched service$/, async function () {
    await this.navy.initialise({
      configProvider: 'filesystem',
      path: path.join(__dirname, '../dummy-navy'),
    })

    await this.navy.launch([TEST_SERVICE_NAME])
  })

}
