import path from 'path'
import {getEnvironment} from '../../../'
import {ENV_NAME, TEST_SERVICE_NAME} from '../environment'

export default function () {

  this.Given(/I am working with the test environment$/, async function () {
    this.env = getEnvironment(ENV_NAME)

    await this.env.initialise('cwd', {
      path: path.join(__dirname, '../dummy-environment'),
    })
  })

  this.Given(/there is a launched service$/, async function () {
    await this.env.launch([TEST_SERVICE_NAME])
  })

}
