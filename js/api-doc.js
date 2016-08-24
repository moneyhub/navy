const headings = [...document.querySelectorAll('#api-doc h1, #api-doc h2')]
const docNav = document.querySelector('.api-doc-nav')

docNav.insertAdjacentHTML('beforeend', `
  ${headings.map(headingElem =>
    `<li class="doc-${headingElem.localName}" data-key="${headingElem.innerText}">
       <a href="#${headingElem.innerText.toLowerCase()}">${headingElem.innerText}</a>
     </li>`
  ).join('\n')}
`)

const headingPositions = {}

window.onscroll = function () {
  const scrollPosition = document.documentElement.scrollTop || document.body.scrollTop

  for (const heading of headings) {
    headingPositions[heading.innerText] = heading.offsetTop
  }

  for (const heading in headingPositions) {
    if (headingPositions[heading] <= scrollPosition + 5) {
      const existingActive = document.querySelector('.api-doc-nav a.active')

      if (existingActive) existingActive.setAttribute('class', '')

      document.querySelector('.api-doc-nav li[data-key=' + heading + '] a').setAttribute('class', 'active')
    }
  }
}
