# kindle-web-annotations

node.js library to parse an Amazon Kindle `My Clippings.txt` file and emit objects that use the [W3C Web Annotation Vocabulary](https://www.w3.org/TR/annotation-vocab/).

## Usage

This library exports a constructor for a Transport stream to which you can write chunks of the 'My Clippings' format and it will emit out JSON objects that use the Web Annotation Vocabulary.

```javascript
const { ClippingTextToWebAnnotation } = require('kindle-web-annotations')
const fileName = process.argv[2]
require('fs').createReadStream(fileName)
  .pipe(new ClippingTextToWebAnnotation)
  .on('data', annotation => console.log(JSON.stringify(annotation)))
```

You can also use it as a small CLI:

```
⚡ npx kindle-web-annotations | jq .
{
  "@context": [
    "http://www.w3.org/ns/anno.jsonld",
    {
      "title": "as:title",
      "author": "as:author"
    }
  ],
  "id": "urn:uuid:74d85b38-7493-4e27-9257-38c303557bc2",
  "type": "Annotation",
  "motivation": "commenting",
  "created": "2017-09-17T18:28:04.000Z",
  "target": {
    "source": {
      "type": "http://schema.org/CreativeWork",
      "title": "Relativity",
      "author": "Albert Einstein"
    },
    "selector": {
      "type": "TextQuoteSelector",
      "exact": "21-In What Respects are the Foundations of Classical Mechanics and of the Special Theory of Relativity Unsatisfactory?"
    }
  },
  "body": {
    "type": "TextualBody",
    "value": "How would I know!?"
  }
}
```

## Thanks to

* [eugeneware](https://github.com/eugeneware) for [kindle-clippings](https://github.com/eugeneware/kindle-clippings).
* [azaroth42](https://github.com/azaroth42) for their work on web annotation and [helping me](https://github.com/w3c/web-annotation/issues/436#issuecomment-330067233) model this
