kuromoji.js (Optimized Fork)
============================

[![Build Status](https://travis-ci.org/takuyaa/kuromoji.js.svg?branch=master)](https://travis-ci.org/takuyaa/kuromoji.js)
[![npm version](https://badge.fury.io/js/kuromoji.svg)](https://badge.fury.io/js/kuromoji)

High-performance JavaScript implementation of Japanese morphological analyzer.
This is an **optimized fork** of [kuromoji.js](https://github.com/takuyaa/kuromoji.js) with significant performance improvements.

## Performance Improvements

This optimized version achieves **3-8x faster tokenization** compared to the original:

| Input Length | Original | Optimized | Improvement |
|-------------|----------|-----------|-------------|
| Short (12 chars) | 0.19ms | 0.06ms | **68% faster** |
| Medium (69 chars) | 0.92ms | 0.12ms | **87% faster** |
| Long (380 chars) | 3.76ms | 0.83ms | **78% faster** |

### Key Optimizations

1. **UTF-8 Pre-conversion**: Single UTF-8 conversion per sentence with offset-based trie search
2. **Inline DoubleArray Traversal**: Direct array access eliminating function call overhead
3. **Connection Costs Inlining**: Cached buffer references for O(1) cost lookups
4. **Feature Array Caching**: Cached split results for repeated token lookups
5. **Numeric Type Constants**: V8 Hidden Class optimization with numeric NODE_TYPE
6. **Optimized Backward Pass**: Pre-allocated arrays eliminating reverse() calls
7. **SurrogateAwareString Fast Path**: Direct string access for text without surrogate pairs

## Installation

```bash
npm install kuromoji
```

## Usage

### Node.js

```javascript
var kuromoji = require("kuromoji");

kuromoji.builder({ dicPath: "node_modules/kuromoji/dict/" }).build(function (err, tokenizer) {
    var tokens = tokenizer.tokenize("すもももももももものうち");
    console.log(tokens);
});
```

### Browser

```html
<script src="build/kuromoji.js"></script>
<script>
kuromoji.builder({ dicPath: "/dict/" }).build(function (err, tokenizer) {
    var tokens = tokenizer.tokenize("すもももももももものうち");
    console.log(tokens);
});
</script>
```

## API

The `tokenize()` function returns an array of token objects:

```javascript
[{
    word_id: 509800,          // Dictionary word ID
    word_type: 'KNOWN',       // KNOWN or UNKNOWN
    word_position: 1,         // Position in text
    surface_form: '黒文字',    // Surface form
    pos: '名詞',               // Part of speech
    pos_detail_1: '一般',      // POS detail 1
    pos_detail_2: '*',        // POS detail 2
    pos_detail_3: '*',        // POS detail 3
    conjugated_type: '*',     // Conjugation type
    conjugated_form: '*',     // Conjugation form
    basic_form: '黒文字',      // Base form
    reading: 'クロモジ',       // Reading
    pronunciation: 'クロモジ'  // Pronunciation
}]
```

## Directory Structure

```
build/        -- Browserified JavaScript
demo/         -- Demo application
dict/         -- Dictionary files (gzipped)
example/      -- Node.js examples
src/          -- Source code
test/         -- Unit tests
```

## Benchmark

Run the benchmark:

```bash
npm run benchmark
```

## Original Project

This is a fork of [kuromoji.js](https://github.com/takuyaa/kuromoji.js) by Takuya Asano.
The original project is a pure JavaScript porting of [Kuromoji](https://www.atilika.com/ja/kuromoji/).

## License

Apache License 2.0
