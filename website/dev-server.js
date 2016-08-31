const bs = require('browser-sync').create()

bs.init({
  server: './build',
  port: 3000,
  notify: false,
})

bs.reload('*.css')

global.__devReload = bs.reload
