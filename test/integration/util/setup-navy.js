import path from 'path'
import { getNavy, getLaunchedNavies } from '../../../packages/navy'

export async function setUpNavy(name = 'dev', testProjectName = 'basic') {
  const navy = getNavy(name)

  await navy.initialise({
    configProvider: 'filesystem',
    path: path.join(__dirname, '../', 'test-projects', testProjectName),
  })

  return navy
}

// Best-effort cleanup. We swallow errors here because cleanup must never mask
// the real assertion failure of a scenario, and because some scenarios leave
// the navy in a partially-initialised state where `destroy()` cannot fully
// reconfigure the shared HTTP proxy. Falling back to `delete()` ensures the
// on-disk navy state is still removed between scenarios so they remain
// independent.
export async function cleanUpNavies() {
  let navies = []
  try {
    navies = await getLaunchedNavies()
  } catch (e) {
    return
  }

  await Promise.all(navies.map(async navy => {
    try {
      await navy.destroy()
    } catch (e) {
      try { await navy.delete() } catch (deleteErr) {}
    }
  }))
}
