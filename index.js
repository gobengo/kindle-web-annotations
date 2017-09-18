#!/usr/bin/env node

const assert = require('assert')
const fs = require('fs')
const kindleClippingsParser = require('kindle-clippings')
const { Duplex, PassThrough, Transform } = require('stream')
const uuid = require('uuid').v4
const parser = require('./parser')

// write in chunks of your "My Clippings File"
const ClippingTextToWebAnnotation = exports.ClippingTextToWebAnnotation = class ClippingTextToWebAnnotation extends Duplex {
  constructor () {
    // @TODO - I think this might not work so well with only one clipping
    const clippingObjects = kindleClippingsParser()
    const clippingObjectsToOA = new ClippingObjectToWebAnnotation()
    clippingObjects
      .pipe(clippingObjectsToOA)
    super({
      objectMode: true,
      write (chunk, encoding, callback) {
        clippingObjects.write(chunk, callback)
      },
      read () {
        clippingObjectsToOA.once('readable', () => {
          const clipping = clippingObjectsToOA.read()
          this.push(clipping)
        })
      }
    })
    this.on('finish', () => clippingObjects.end())
  }
}

const clippingsDoCorrelate = exports.clippingsDoCorrelate = (...clippings) => {
  if (clippings.length === 1) return true
  // if all the titles + times are the same?
  const {title, details: { time }} = clippings[0]
  const ret = clippings.slice(1).every(c => c.title === title && c.details.time.getTime() === time.getTime())
  return ret
}

// custom types other than those strings created by kindle-clippings
const clippingTypes = {
  highlightWithNote: Symbol('clippingTypes.highlightWithNote')
}
const mergeClippings = exports.mergeClippings = (...clippings) => {
  if (clippings.length === 1) return clippings[0]
  assert.equal(clippings.length, 2) // dont know how to merge 3
  const note = clippings.find((c) => c.details.type === 'note')
  const highlight = clippings.find((c) => c.details.type === 'highlight')
  assert(note)
  assert(highlight)
  const merged = Object.assign({}, highlight, {
    note: note.snippet,
    details: Object.assign({}, highlight.details, {
      type: clippingTypes.highlightWithNote
    })
  })
  return merged
}

/**
 * When you highlight some text and that add a note,
 * The Kindle Clippings file records this as two separate entries, and kindle-clippings parser emits two separate objects one-after-another.
 * This stream takes in a stream of kindle-clippings objects, merges any that correlate into a clipping of type `clippingTypes.highlightWithNote`,
 * and pushes along the rest untouched.
 */
const ClippingObjectCorrelatingStream = class extends Duplex {
  constructor () {
    // we'll process clippings one at a time, and if the new one correlates with all of these,
    // we'll push the new one here.
    // once a new one doesn't correlate, we'll merge all those correlates and reset this `correlatesSoFar`
    let correlatesSoFar = []
    const mergeAndPush = (...clippings) => {
      this.push(mergeClippings(...clippings))
    }
    super({
      objectMode: true,
      write (clipping, encoding, callback) {
        const potentialCorrelates = correlatesSoFar.concat([clipping])
        if (clippingsDoCorrelate(...potentialCorrelates)) {
          correlatesSoFar = potentialCorrelates
        } else {
          // ok we've gotten to a wholly new thing. Push the old correlatesSoFar along
          const fullSet = correlatesSoFar
          correlatesSoFar = [clipping]
          mergeAndPush(...fullSet)
        }
        callback()
      },
      read () {
        // .push happens up in write()
      },
      final () {
        mergeAndPush(...correlatesSoFar)
      }
    })
  }
}

/**
 * Convert a kindle-clippings object to a Web Annotation
 */
exports.clippingObjectToWebAnnotation = function (clipping) {
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
  const clippingTypeToMotivation = new Map([].concat(
    Object.entries({
      highlight: 'highlighting',
      bookmark: 'bookmarking',
      note: 'commenting'
    }),
    [[clippingTypes.highlightWithNote, 'commenting']]
  ))
  const oa = {
    '@context': [
      'http://www.w3.org/ns/anno.jsonld',
      {
        title: 'as:title',
        author: 'as:author'
      }
    ],
    id: `urn:uuid:${uuid()}`,
    type: 'Annotation',
    motivation: clippingTypeToMotivation.get(clipping.details.type),
    created: clipping.details.time,
    body: (clipping.details.type === clippingTypes.highlightWithNote) && {
      type: 'TextualBody',
      value: clipping.note
    },
    target: {
      // source is the book
      source: {
        type: 'http://schema.org/CreativeWork',
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
  return oa
}

// write in objects like those that come from 'kindle-clippings' parser
const ClippingObjectToWebAnnotation = class ClippingObjectToWebAnnotation extends Duplex {
  constructor () {
    // @TODO - I think this might not work so well with only one clipping
    const clipsIn = new PassThrough({ objectMode: true })
    const webAnnotations = clipsIn
      .pipe(new ClippingObjectCorrelatingStream())
      .pipe(new Transform({
        objectMode: true,
        transform (clipping, encoding, callback) {
          this.push(exports.clippingObjectToWebAnnotation(clipping))
          callback()
        }
      }))
    super({
      objectMode: true,
      write (chunk, encoding, callback) {
        clipsIn.write(chunk, callback)
      },
      read () {
        webAnnotations.once('readable', () => {
          const annotation = webAnnotations.read()
          this.push(annotation)
        })
      }
    })
    this.on('finish', () => clipsIn.end())
  }
}

// e.g. "Zero to One: Notes on Startups, or How to Build the Future (5th edition) (Peter Thiel (srs dude);Blake Masters)"
function parseClippingTitle (titlePlusAuthors) {
  // the authors are in the last set of parentheses, ';'-delimited
  // use a parser to handle nested parentheses. regex cant very easily
  const { parse, serialize } = parser('(', ')')
  const parsed = parse(titlePlusAuthors)
  const [titleTree, authorTree] = [parsed.slice(0, -1), parsed.slice(-1)[0]]
  const title = serialize(titleTree).trim()
  const authors = serialize(authorTree).split(';')
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
    .pipe(new ClippingTextToWebAnnotation())
    .pipe(new Transform({
      writableObjectMode: true,
      transform (chunk, encoding, callback) {
        try {
          this.push(JSON.stringify(chunk))
        } catch (error) { return callback(error) }
        callback()
      }
    }))
    .pipe(process.stdout)
  return new Promise((resolve, reject) => {
    clippings
      .on('error', reject)
      .on('end', resolve)
  })
}
