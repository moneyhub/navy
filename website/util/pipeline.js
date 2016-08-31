import path from 'path'
import nunjucks from 'nunjucks'
import showdown from 'showdown'
import frontMatter from 'front-matter'
import {fs, mkdirp} from './fs'

const showdownConverter = new showdown.Converter()

function rewriteMarkdownLinks(markdownIn) {
  return markdownIn.replace(/.md/g, '.html')
}

export async function getContent(docs, basePath) {
  return await Promise.all(docs.map(async docPath => {
    const rawContent = await fs.readFileAsync(docPath, 'utf8')
    const content = frontMatter(rawContent)
    const newPath = path.relative(basePath, docPath)

    return {
      path: newPath,
      pathWithoutExtension: path.join(path.dirname(newPath), path.basename(newPath, path.extname(newPath))),
      rawContent,
      content: content.body,
      attributes: content.attributes,
    }
  }))
}

export async function convertMarkdown(docs) {
  return await Promise.all(docs.map(doc => ({
    ...doc,
    html: showdownConverter.makeHtml(rewriteMarkdownLinks(doc.content)),
  })))
}

export function addLayout(layoutPath, opts = {}) {
  return async function addLayout(docs) {
    nunjucks.configure('', { noCache: true })

    return await Promise.all(docs.map(doc => ({
      ...doc,
      html: nunjucks.render(doc.attributes && doc.attributes.layout ? `layouts/${doc.attributes.layout}.html` : layoutPath, {
        content: doc.html,
        attributes: doc.attributes,
        siteUrl: process.env.SITE_URL || 'http://localhost:3000',
        ...opts,
      }),
    })))
  }
}

export function write(basePath) {
  return async function (docs) {
    await mkdirp(basePath)

    return await Promise.all(docs.map(async doc => {
      const outDir = path.join(basePath, path.dirname(doc.path))
      await mkdirp(outDir)
      const outPath = path.join(outDir, path.basename(doc.path, path.extname(doc.path))) + '.html'
      await fs.writeFileAsync(outPath, doc.html)

      return doc
    }))
  }
}
