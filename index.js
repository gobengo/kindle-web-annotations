#!/usr/bin/env node
if (require.main === module) {
  main(...process.argv.slice(2))
  .catch(error => {
    console.error('main() error. exiting', error)
    process.exit(1)
  })
  .then(() => {
    process.exit()
  })
}

async function main(file) {
  console.log('file', file)
}