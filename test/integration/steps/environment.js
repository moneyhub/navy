import {getEnvironment} from '../../../'
import {ENV_NAME} from '../environment'

export default function () {

  this.Given(/I am working with the test environment$/, function () {
    this.env = getEnvironment(ENV_NAME)
  })

}
