/**
 * Merge Commander's per-command opts with inherited globals (e.g. `navy -e dev ps`).
 * `optsWithGlobals()` is the combined view; spread it after local opts so globals
 * override stale option defaults on the subcommand.
 */
export function mergeActionOptions(parsedOpts, command) {
  if (!command || typeof command.optsWithGlobals !== 'function') {
    return parsedOpts
  }
  return { ...parsedOpts, ...command.optsWithGlobals() }
}
