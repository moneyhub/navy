const headings = [...document.querySelectorAll('#api-doc h1, #api-doc h2')]
const docNav = document.querySelector('.api-doc-nav')

docNav.insertAdjacentHTML('beforeend', `
  ${headings.map(headingElem =>
    `<li class="doc-${headingElem.localName}" data-key="${headingElem.textContent}">
       <a href="#${headingElem.textContent.toLowerCase()}">${headingElem.textContent}</a>
     </li>`
  ).join('\n')}
`)

const headingPositions = {}

window.onscroll = function () {
  const scrollPosition = document.documentElement.scrollTop || document.body.scrollTop

  for (const heading of headings) {
    headingPositions[heading.textContent] = heading.offsetTop
  }

  for (const heading in headingPositions) {
    if (headingPositions[heading] <= scrollPosition + 5) {
      const existingActive = document.querySelector('.api-doc-nav a.active')

      if (existingActive) existingActive.setAttribute('class', '')

      document.querySelector('.api-doc-nav li[data-key=' + heading + '] a').setAttribute('class', 'active')
    }
  }
}
