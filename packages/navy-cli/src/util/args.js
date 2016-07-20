/* @flow */

import minimist from 'minimist'

function toMinimistOpts(validateOpts: Object) {
  const opts = {
    default: {},
    alias: {},
  }

  const keys = Object.keys(validateOpts)

  for (const key of keys) {
    const config = validateOpts[key]
    const normalisedKey = key.indexOf('|') === -1 ? key : key.substring(0, key.indexOf('|'))

    if (key.indexOf('|') !== -1) {
      const parts = key.split('|')
      opts.alias[parts[0]] = parts[1]
    }

    if (config && config.default) {
      opts.default[normalisedKey] = config.default
    }
  }

  return opts
}

function validateArgs(validateOpts: Object, args: Object) {
  const allowedOptions = {}

  for (const key of Object.keys(validateOpts)) {
    if (key.indexOf('|') !== -1) {
      const parts = key.split('|')
      allowedOptions[parts[0]] = validateOpts[key]
      allowedOptions[parts[1]] = validateOpts[key]
    } else {
      allowedOptions[key] = validateOpts[key]
    }
  }

  for (const key of Object.keys(args)) {
    if (allowedOptions[key] === undefined) {
      console.log('unknown! option: %s', key)
      process.exit()
    }

    const config = allowedOptions[key]
    const value = args[key]

    if (config === false && value.length > 0) {
      console.log('unknown additional commands provided: %s', args[key].join(' '))
      process.exit()
    }
  }
}

export function getArgs(subCommands: Array<string>, opts: ?Object) {
  let startIndex = 2 // if no sub command

  if (subCommands && subCommands.length > 0) {
    startIndex = subCommands.reduce((ind, subCmd) =>
      process.argv.indexOf(subCmd, ind)
    , startIndex) + 1
  }

  const unknown = key => {
    if (key.indexOf('-') === -1) return true

    console.log('unknown option: %s', key)
    process.exit()
  }

  const minimistOpts = {
    ...opts,
    unknown,
    stopEarly: true,
  }

  console.log(process.argv.slice(startIndex))

  return {
    ...minimist(process.argv.slice(startIndex), minimistOpts),
    _: minimist(process.argv.slice(startIndex), minimistOpts)._,
  }
}

export function run(subCommands: Array<string>, help: string, validateOpts: Object, parentArgs: ?Object) {
  const thisArgs = getArgs(subCommands, validateOpts)

  const args = {
    ...thisArgs,
    ...(parentArgs || {}),
  }

  console.log('Gots', args)

  // validateArgs(validateOpts, args)

  if (args.help) {
    console.log(help.trim())
    process.exit()
  }

  return args
}

export async function command(args: Object, help: string, commandMap: Object) {
  const command = args._[0]

  if (!commandMap[command]) {
    console.log(help.trim())
    process.exit()
  }

  const cmdFactory = commandMap[command]
  const cmdFn = cmdFactory()

  return await cmdFn(args)
}

export async function runCommand(subCommands: Array<string>, help: string, commandMap: Object, validateOpts: Object) {
  const args = run(subCommands, help, validateOpts)

  return await command(args, help, commandMap)
}
