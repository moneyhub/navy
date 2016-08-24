const http = require('http')
const fs = require('fs')
const path = require('path')
const port = 80

const requestHandler = (request, response) => {
  response.end(fs.readFileSync(path.join(__dirname, '..', 'index.html')))
}

const server = http.createServer(requestHandler)

server.listen(port, (err) => {
  if (err) {
    return console.log('Oh no', err)
  }

  console.log(`Server is listening on ${port}`)
})
