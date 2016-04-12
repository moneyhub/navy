#!/usr/bin/env node

delete process.env.DEBUG
process.env.DEBUG = process.env.NAVY_DEBUG

require('../lib/cli')
