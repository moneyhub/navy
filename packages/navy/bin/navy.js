#!/usr/bin/env node

delete process.env.DEBUG
process.env.DEBUG = process.env.NAVY_DEBUG

var debug = require('debug')('navy') // eslint-disable-line
debug('Start CLI')

require('../lib/cli')
