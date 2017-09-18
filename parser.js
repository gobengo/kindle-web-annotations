const parser = module.exports = function parser (start = '(', end = ')') {
  return { parse, serialize }
  /**
   * Parse a string with nested parentheses into a tree of parened-terms
   * in: "hello (feyn) (ben (esquire);you)"
   * out: [ 'hello ', [ 'feyn' ], ' ', [ 'ben ', [ 'esquire' ], ';you' ] ]
   */
  function parse (str) {
    const tree = []
    const stack = []
    let term = ''
    let cur = tree
    const log = (where) => {
      // console.log(where, { cur, term, stack, tree, stack })
    }
    const startNode = () => {
      log('prestart')
      if (!cur) cur = []
      if (term) cur.push(term)
      stack.push(cur)
      cur = []
      term = ''
      log('endstart')
    }
    const endNode = () => {
      log('preend')
      cur.push(term)
      const last = cur
      cur = stack.pop()
      if (cur) cur.push(last)
      term = ''
      log('endend')
    }
    for (let char of str) {
      switch (char) {
        case start:
          startNode()
          break
        case end:
          endNode()
          break
        default:
          term += char
          continue
      }
    }
    if (term && !tree.length) tree.push(term)
    return tree
  }

  /**
   * Serialize tree back to string
   * in: [ 'hello ', [ 'feyn' ], ' ', [ 'ben ', [ 'esquire' ], ';you' ] ]
   * out: "hello (feyn) (ben (esquire);you)"
   */
  function serialize (tree, depth = 0) {
    if (typeof tree === 'undefined') throw new Error('tree should not be undefined')
    if (typeof tree === 'string') return tree
    const inner = tree.map(l => serialize(l, true)).join('')
    if (depth > 0) return ['(', inner, ')'].join('')
    return inner
  }
}

if (require.main === module) {
  const { parse, serialize } = parser('(', ')')
  const parsed = parse(process.argv[2])
  console.log(parsed)
  console.log(serialize(parsed))
}
