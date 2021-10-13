const fs = require('fs')

function save(content) {
  fs.writeFileSync('data.json', JSON.stringify(content))
}

function getData() {
  return JSON.parse(fs.readFileSync('data.json'))
}

const Repository = function () { }

Repository.prototype.save = save
Repository.prototype.getData = getData

module.exports = new Repository()
