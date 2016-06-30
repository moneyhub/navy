import path from 'path'
import {getNavy} from '../../../packages/navy'
import {ENV_NAME, TEST_SERVICE_NAME} from '../environment'

export default function () {

  this.Given(/I am working with the test navy$/, async function () {
    this.navy = getNavy(ENV_NAME)

    await this.navy.initialise({
      configProvider: 'filesystem',
      path: path.join(__dirname, '../dummy-navies/basic'),
    })
  })

  this.Given(/I am working with the test navy which uses the test middleware plugin to add labels$/, async function () {
    this.navy = getNavy(ENV_NAME)

    await this.navy.initialise({
      configProvider: 'filesystem',
      path: path.join(__dirname, '../dummy-navies/with-labels-middleware'),
    })
  })

  this.Given(/I am working with a nonexistant navy$/, async function () {
    this.navy = getNavy('nonexistanttest')
  })

  this.Given(/there is a launched service$/, async function () {
    await this.navy.launch([TEST_SERVICE_NAME])
  })

  this.Given(/there is a launched service which isn't running$/, async function () {
    await this.navy.launch([TEST_SERVICE_NAME])
    await this.navy.stop([TEST_SERVICE_NAME])
  })

}
