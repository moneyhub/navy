import bluebird from 'bluebird'

const documentation = bluebird.promisifyAll(require('documentation'))
const docFormats = bluebird.promisifyAll(require('documentation').formats)

export default async function () {
  const docs = await documentation.buildAsync([
    '../packages/navy/src/navy/index.js',
    '../packages/navy/src/navy/state.js',
  ], { access: ['public'] })

  const docsMarkdown = await docFormats.mdAsync(docs, {})

  return [{
    path: 'index.md',
    content: docsMarkdown,
  }]
}
