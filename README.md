# kindle-web-annotations

Library to parse an Amazon Kindle `My Clippings.txt` file and emit objects that use the [W3C Web Annotation Vocabulary](https://www.w3.org/TR/annotation-vocab/).

## Usage

This library exports a constructor for a Transport stream to which you can write chunks of the 'My Clippings' format and it will emit out JSON objects that use the Web Annotation Vocabulary.

```javascript
const { ClippingTextToOpenAnnotation } = require('kindle-web-annotations')
const fileName = process.argv[2]
require('fs').createReadStream(fileName)
  .pipe(new ClippingTextToOpenAnnotation)
  .on('data', annotation => console.log(JSON.stringify(annotation)))
```

You can also use it as a small CLI:

```
⚡ node . fixtures/one.txt | jq .
{
  "@context": "http://www.w3.org/ns/anno.jsonld",
  "id": "urn:uuid:20bfe61f-d8f9-46fe-b1d1-549c4f0c486d",
  "type": "Annotation",
  "target": {
    "source": {
      "title": "\"Surely You're Joking, Mr. Feynman!\": Adventures of a Curious Character",
      "author": [
        "Feynman, Richard P. (esquire)",
        "Ralph Leighton",
        "Edward Hutchings",
        "Albert R. Hibbs"
      ]
    },
    "selector": {
      "type": "TextQuoteSelector",
      "exact": "The other fellas in the company decided we should run advertisements in Modern Plastics magazine. A few things we metal-plated were very pretty. They looked good in the advertisements. We also had a few things out in a showcase in front, for prospective customers to look at, but nobody could pick up the things in the advertisements or in the showcase to see how well the plating stayed on. Perhaps some of them were, in fact, pretty good jobs. But they were made specially; they were not regular products."
    }
  }
}
{
  "@context": "http://www.w3.org/ns/anno.jsonld",
  "id": "urn:uuid:86cab417-fdf7-4a55-b60b-acb5c1a25283",
  "type": "Annotation",
  "target": {
    "source": {
      "title": "Relativity",
      "author": "Albert Einstein"
    },
    "selector": {
      "type": "TextQuoteSelector",
      "exact": "21-In What Respects are the Foundations of Classical Mechanics and of the Special Theory of Relativity Unsatisfactory?"
    }
  }
}
```

## Thanks to

* [eugeneware](https://github.com/eugeneware) for [kindle-clippings](https://github.com/eugeneware/kindle-clippings).
* [azaroth42](https://github.com/azaroth42) for their work on web annotation and [helping me](https://github.com/w3c/web-annotation/issues/436#issuecomment-330067233) model this
