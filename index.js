#!/usr/bin/env node

const fs = require('fs')
const kindleClippingsParser = require('kindle-clippings')
const { Duplex, Transform } = require('stream')
const uuid = require('uuid').v4

// write in chunks of your "My Clippings File"
const ClippingTextToOpenAnnotation = exports.ClippingTextToOpenAnnotation = class ClippingTextToOpenAnnotation extends Duplex {
  constructor () {
    // @TODO - I think this might not work so well with only one clipping
    const clippingObjects = kindleClippingsParser()
    const clippingObjectsToOA = new ClippingObjectToOpenAnnotation()
    clippingObjects.pipe(clippingObjectsToOA)
    super({
      objectMode: true,
      write (chunk, encoding, callback) {
        clippingObjects.write(chunk, callback)
      },
      read () {
        clippingObjectsToOA.once('readable', clipping => this.push(clippingObjectsToOA.read()))
      }
    })
  }
}

// write in objects like those that come from 'kindle-clippings' parser
const ClippingObjectToOpenAnnotation = exports.ClippingObjectToOpenAnnotation = class ClippingObjectToOpenAnnotation extends Transform {
  constructor () {
    super({
      objectMode: true,
      transform (clipping, encoding, callback) {
        /* clipping like
        { title: 'Relativity (Albert Einstein)',
          details: 
           { type: 'highlight',
             page: { from: 77, to: 77 },
             location: { from: 1173, to: 1174 },
             time: 2017-09-17T18:28:04.000Z },
          snippet: '21-In What Respects are the Foundations of Classical Mechanics and of the Special Theory of Relativity Unsatisfactory?' }
        */
        // const locationSelector; //@TODO hmm wtf is a location?
        // const pageSelector; // @TODO - How to represent this? Range Selector?
        const { title, author } = parseClippingTitle(clipping.title)
        const oa = {
          '@context': 'http://www.w3.org/ns/anno.jsonld',
          id: `urn:uuid:${uuid()}`,
          type: 'Annotation',
          created: clipping.created,
          // @TODO correlate notes/highlights on same location/time and add as body
          // body: {
          //   type: "TextualBody",
          //   value: "I like this page!"
          // },
          target: {
            // source is the book
            source: {
              // @TODO - these titles appear to have the authors in parens at the end. 
              title: title,
              author: author
              // @TODO - Use title and rest of kindle filesystem to look up actual document and try to get more info, e.g. ISBN
            },
            selector: {
              // https://www.w3.org/TR/annotation-model/#text-quote-selector
              type: 'TextQuoteSelector',
              exact: clipping.snippet
              // @TODO - If possible, correlate kindle 'locations' with actual document texts to add { prefix, suffix }
              // Would likely require involved code specific to each document format (e.g. mobi, epub, etc)
            }
          }
        }
        this.push(oa)
        callback()
      }
    })
  }
}

// e.g. "Zero to One: Notes on Startups, or How to Build the Future (Peter Thiel;Blake Masters)"
function parseClippingTitle (titlePlusAuthors) {
  // @TODO - use a parser or something to handle nested parens in authors (unlikely)
  const pattern = /(.*) \(([^\)]*)\)$/
  const match = titlePlusAuthors.match(pattern)
  const title = match ? match[1] : titlePlusAuthors
  const authors = match && (match[2].split(';'))
  const author = authors && (authors.length === 1 ? authors[0] : authors)
  return {
    title,
    author
  }
}

if (require.main === module) {
  main(...process.argv.slice(2))
    .catch(error => {
      console.error('main() error. exiting')
      console.error(error)
      process.exit(1)
    })
    .then(() => {
      process.exit()
    })
}

async function main (clippingsFile) {
  const clippings = kindleClippingsParser()
  const clippingsFileStream = clippingsFile
    ? fs.createReadStream(clippingsFile)
    : process.stdin.isTTY
      ? false
      : process.stdin
  if (!clippingsFileStream) { throw new Error(`Provide a kindle 'My Clippings' file as first argument or pipe to stdin`) }
  clippingsFileStream
    .pipe(new ClippingTextToOpenAnnotation())
    .on('data', clipping => {
      console.log(JSON.stringify(clipping))
    })
  return new Promise((resolve, reject) => {
    clippings
      .on('error', reject)
      .on('end', resolve)
  })
}
