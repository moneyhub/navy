import program from 'commander'

function lazyRequire(path) {
  return function (...args) {
    const res = require(path)(...args)

    if (res.catch) {
      res.catch(err => {
        console.error(err.stack)
      })
    }
  }
}

program
  .command('launch [services...]')
  .option('-e, --environment [env]', 'set the environment name to be used [dev]', 'dev')
  .description('Launches the given services in an environment')
  .action(lazyRequire('./launch'))
  .on('--help', () => console.log(`
  This will prompt you for the services that you want to bring up.
  You can optionally provide the names of services to bring up which will disable the interactive prompt.
  `))

program
  .command('help')
  .alias('*')
  .action(() => program.help())

export default program
