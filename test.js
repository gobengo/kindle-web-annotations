const { ClippingTextToWebAnnotation } = require('.')
const fs = require('fs')
const path = require('path')

const main = module.exports = (fileName = path.join(__dirname, 'fixtures/correlate.txt')) => {
  fs.createReadStream(fileName)
    .pipe(new ClippingTextToWebAnnotation())
    .on('data', annotation => console.log(JSON.stringify(annotation)))
}

if (require.main === module) {
  main(process.argv[2])
}
