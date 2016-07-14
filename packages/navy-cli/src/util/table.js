/* @flow */

import pad from 'pad'
import stripAnsi from 'strip-ansi'

export default function table(rows: Array<Array<string>>) {
  if (rows.length === 0) {
    return ''
  }

  const cols = rows[0]
  const colSizes = cols.map((col, colIndex) =>
    rows.reduce((currentSize, row) => currentSize = Math.max(currentSize, stripAnsi(row[colIndex] || '').length), 0) + 2
  )

  return rows.map(row =>
    row.map((col, colIndex) =>
      pad(col || '', colSizes[colIndex], { colors: true })
    ).join('')
  ).join('\n')
}
