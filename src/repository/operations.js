const { getDataFromMongo, save: saveOnMongo } = require('./mongodb')

function save(content) {
  saveOnMongo(content)
}

async function getData() {
  return getDataFromMongo()
}

const Repository = function () { }

Repository.prototype.save = save
Repository.prototype.getData = getData

module.exports = new Repository()
