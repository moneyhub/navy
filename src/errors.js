import chalk from 'chalk'

export class NavyError {
  constructor(message) {
    this.message = message
  }

  prettyPrint() {
    console.log()
    console.log(chalk.bgRed(chalk.bold(' ERROR ')))
    console.log()
    console.log(' ' + this.message)
    console.log()
  }
}

export class EnvironmentNotInitialisedError extends NavyError {
  constructor() {
    super('Environment not initialised')
  }

  prettyPrint() {
    super.prettyPrint()

    console.log(' Make sure you\'ve launched the environment with ' + chalk.bold('navy launch'))
    console.log()
  }
}
