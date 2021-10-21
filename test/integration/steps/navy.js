import {getNavy} from '../../../packages/navy'
import {setUpNavy} from '../util/setup-navy'

import {Given} from '@cucumber/cucumber'

Given(/I am working with a test navy$/, async function () {
  this.navy = await setUpNavy('dev')
})

Given(/I am working with a test navy which uses the test middleware plugin to add labels$/, async function () {
  this.navy = await setUpNavy('dev', 'with-labels-middleware')
})

Given(/I am working with a test navy which uses the test middleware plugin to add some custom commands$/, async function () {
  this.navy = await setUpNavy('dev', 'with-custom-commands')
})

Given(/I am working with a test navy which has a service with a different port$/, async function () {
  this.navy = await setUpNavy('dev', 'http-proxy-custom-port')
})

Given(/I am working with a test navy which has a service with a different port, not port 80$/, async function () {
  this.navy = await setUpNavy('dev', 'http-proxy-custom-port-not-80')
})

Given(/I am working with a test navy which has a service with a different port, with a custom proxy auto-port$/, async function () {
  this.navy = await setUpNavy('dev', 'http-proxy-custom-auto-port')
})

Given(/I am working with a test navy which has a fixed external port$/, async function () {
  this.navy = await setUpNavy('dev', 'with-fixed-port')
})

Given(/I am working with a nonexistant navy$/, async function () {
  this.navy = getNavy('nonexistanttest')
})

Given(/there is a launched service$/, async function () {
  await this.navy.launch(['helloworld'])
})

Given(/there is a launched service which isn't running$/, async function () {
  await this.navy.launch(['helloworld'])
  await this.navy.stop(['helloworld'])
})
