export async function retry(callback, onFail, { tries = 10, interval = 1000 } = {}) {
  let currentTry = 0
  let lastException = null

  while (currentTry++ < tries) {
    try {
      await callback()
      return true
    } catch (ex) {
      lastException = ex
      console.log('Retrying assertion...')

      if (onFail) await onFail()
    }

    await new Promise(resolve => setTimeout(resolve, interval))
  }

  throw lastException
}
