import {getNavy} from '../../../packages/navy'
import {setUpNavy} from '../util/setup-navy'

export default function () {

  this.Given(/I am working with a test navy$/, async function () {
    this.navy = await setUpNavy('dev')
  })

  this.Given(/I am working with a test navy which uses the test middleware plugin to add labels$/, async function () {
    this.navy = await setUpNavy('dev', 'with-labels-middleware')
  })

  this.Given(/I am working with a test navy which uses the test middleware plugin to add some custom commands$/, async function () {
    this.navy = await setUpNavy('dev', 'with-custom-commands')
  })

  this.Given(/I am working with a test navy which has a service with a different port$/, async function () {
    this.navy = await setUpNavy('dev', 'http-proxy-custom-port')
  })

  this.Given(/I am working with a test navy which has a fixed external port$/, async function () {
    this.navy = await setUpNavy('dev', 'with-fixed-port')
  })

  this.Given(/I am working with a nonexistant navy$/, async function () {
    this.navy = getNavy('nonexistanttest')
  })

  this.Given(/there is a launched service$/, async function () {
    await this.navy.launch(['helloworld'])
  })

  this.Given(/there is a launched service which isn't running$/, async function () {
    await this.navy.launch(['helloworld'])
    await this.navy.stop(['helloworld'])
  })

}
