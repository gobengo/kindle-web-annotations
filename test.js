const { ClippingTextToOpenAnnotation } = require('.')
const fs = require('fs')
const path = require('path')

const main = module.exports = (fileName=path.join(__dirname, 'fixtures/one.txt')) => {
  fs.createReadStream(fileName)
    .pipe(new ClippingTextToOpenAnnotation)
    .on('data', annotation => console.log(JSON.stringify(annotation)))  
}

if (require.main === module) {
  main(process.argv[2])
}
