import documentation from 'documentation'

const docFormats = documentation.formats

export default async function () {
  const docs = await documentation.build([
    '../packages/navy/src/navy/index.js',
    '../packages/navy/src/navy/state.js',
  ], { access: ['public'] })

  const docsMarkdown = await docFormats.md(docs, {})

  return [{
    path: 'index.md',
    content: docsMarkdown,
  }]
}
