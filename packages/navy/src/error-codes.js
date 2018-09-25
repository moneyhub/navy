import * as util from 'util'

const ERROR_CODES = {
  STATE_NONEXISTANT: "State doesn't exist for navy %s",
  NO_CONFIG_PROVIDER: "Couldn't determine config provider for navy %s",
  NO_DRIVER: "Couldn't determine driver for navy %s",
  NO_NAVY_PROVIDED: 'No Navy provided',
  FILESYSTEM_PROVIDER_REQUIRES_PATH: 'File system config provider requires a path for %s',
  FILESYSTEM_PROVIDER_INVALID_PATH: 'Invalid path given to navy: %s',
  NPM_PROVIDER_REQUIRES_PACKAGE: 'NPM config provider requires an NPM package for %s',
  DEVELOP_NO_CONTAINER_ID: 'Could not determine container ID for log attachment',
  DOCTOR_FIX_NO_PARAMS: 'Expected params to be passed to doctor fix',
  CLI_IMPORT_RESOLVE_OPTIONS_ERR: 'Could not resolve import options from CLI arguments',
  NO_HOME_DIRECTORY: 'No home directory available',
  PLUGIN_RESOLVE_ERR: 'Could not resolve some of the plugins in Navyfile.js: %s',
  PLUGIN_DOESNT_EXPORT_FUNCTION: "Plugin %s doesn't export a function as the entrypoint",
  NO_DOCKER_COMPOSE_FILE: 'No docker-compose.yml (or valid Docker Compose config) found',
  DOCKER_CONFIG_INVALID_AUTH_BASE64: 'Invalid base64 string in docker/config.json for registry authentication',
}

function formatErrorMessage(msg: string, ...args: Array<string>) {
  return util.format(msg, ...args)
}

export function invariant<T>(value: ?T, code: string, ...args: Array<string>): void {
  if (!value) {
    const error = new Error(code + ': ' + formatErrorMessage(ERROR_CODES[code], ...args))
    error.name = 'Invariant Violation'
    throw error
  }
}
