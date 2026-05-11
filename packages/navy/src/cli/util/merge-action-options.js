/**
 * Merge Commander's per-command opts with inherited globals (e.g. `navy -e dev ps`).
 * `optsWithGlobals()` has "globals overwrite locals" semantics, which makes parent
 * defaults win over child defaults. With positional options enabled, however, a
 * value supplied after the subcommand name (e.g. `navy ps -e dev`) is parsed onto
 * the subcommand, not the parent, so we re-apply any option whose source on the
 * subcommand is non-default to keep the explicit value.
 */
export function mergeActionOptions(parsedOpts, command) {
  if (!command || typeof command.optsWithGlobals !== 'function') {
    return parsedOpts
  }

  const merged = { ...command.optsWithGlobals() }

  if (typeof command.getOptionValueSource === 'function') {
    for (const key of Object.keys(parsedOpts)) {
      const source = command.getOptionValueSource(key)
      if (source && source !== 'default') {
        merged[key] = parsedOpts[key]
      }
    }
  }

  return merged
}
