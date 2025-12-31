/*
 * Copyright 2014 Takuya Asano
 * Copyright 2010-2014 Atilika Inc. and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

var ViterbiNode = require("./ViterbiNode");
var NODE_TYPE = ViterbiNode.NODE_TYPE;
var ViterbiLattice = require("./ViterbiLattice");
var SurrogateAwareString = require("../util/SurrogateAwareString");

// TextEncoder for fast UTF-8 conversion
var encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

/**
 * ViterbiBuilder builds word lattice (ViterbiLattice)
 * @param {DynamicDictionaries} dic dictionary
 * @constructor
 */
function ViterbiBuilder(dic) {
    this.trie = dic.trie;
    this.token_info_dictionary = dic.token_info_dictionary;
    this.unknown_dictionary = dic.unknown_dictionary;

    // Cache trie internal arrays for direct access
    this.baseArray = dic.trie.bc.getBaseBuffer();
    this.checkArray = dic.trie.bc.getCheckBuffer();

    // Pre-allocate result array for commonPrefixSearch
    this._searchResults = new Array(64);
    for (var i = 0; i < 64; i++) {
        this._searchResults[i] = { v: 0, len: 0 };
    }
}

/**
 * Inline commonPrefixSearch with pre-computed UTF-8 bytes
 * @param {Uint8Array} bytes Pre-computed UTF-8 bytes
 * @param {number} startOffset Byte offset to start
 * @param {number} endOffset End of bytes
 * @returns {number} Number of matches
 */
ViterbiBuilder.prototype._commonPrefixSearch = function(bytes, startOffset, endOffset) {
    var baseArray = this.baseArray;
    var checkArray = this.checkArray;
    var results = this._searchResults;
    var resultCount = 0;
    var parent = 0; // ROOT_ID

    for (var i = startOffset; i < endOffset; i++) {
        var code = bytes[i];

        // Inline traverse
        var child = baseArray[parent] + code;
        if (checkArray[child] !== parent) {
            break;
        }
        parent = child;

        // Check for terminal node
        var termChild = baseArray[child];  // + TERM_CODE (0)
        if (checkArray[termChild] === child) {
            var base = baseArray[termChild];
            if (base <= 0) {
                results[resultCount].v = -base - 1;
                results[resultCount].len = i - startOffset + 1;
                resultCount++;
            }
        }
    }

    return resultCount;
};

/**
 * Build word lattice
 * @param {string} sentence_str Input text
 * @returns {ViterbiLattice} Word lattice
 */
ViterbiBuilder.prototype.build = function (sentence_str) {
    var lattice = new ViterbiLattice();
    var sentence = new SurrogateAwareString(sentence_str);

    var trie_id, left_id, right_id, word_cost;
    var token_info_dictionary = this.token_info_dictionary;
    var unknown_dictionary = this.unknown_dictionary;
    var dictionary = token_info_dictionary.dictionary;
    var target_map = token_info_dictionary.target_map;
    var unk_dictionary = unknown_dictionary.dictionary;
    var unk_target_map = unknown_dictionary.target_map;

    // Pre-compute UTF-8 bytes and character-to-byte offset mapping
    var utf8Bytes = encoder ? encoder.encode(sentence_str) : this._stringToUtf8(sentence_str);
    var charToByteOffset = this._buildCharOffsets(sentence_str, utf8Bytes.length);
    var bytesLen = utf8Bytes.length;
    var results = this._searchResults;

    for (var pos = 0; pos < sentence.length; pos++) {
        var byteOffset = charToByteOffset[pos];

        // Use inline commonPrefixSearch with byte offsets
        var vocabLen = this._commonPrefixSearch(utf8Bytes, byteOffset, bytesLen);

        for (var n = 0; n < vocabLen; n++) {
            var result = results[n];
            trie_id = result.v;
            var byteLen = result.len;

            // Convert byte length to character length
            var keyEndByte = byteOffset + byteLen;
            var keyLen = this._byteOffsetToCharLen(charToByteOffset, pos, keyEndByte);
            var key = sentence_str.substring(pos, pos + keyLen);

            var token_info_ids = target_map[trie_id];
            var idsLen = token_info_ids.length;
            for (var i = 0; i < idsLen; i++) {
                var token_info_id = token_info_ids[i];

                left_id = dictionary.getShort(token_info_id);
                right_id = dictionary.getShort(token_info_id + 2);
                word_cost = dictionary.getShort(token_info_id + 4);

                lattice.append(new ViterbiNode(token_info_id, word_cost, pos + 1, keyLen, NODE_TYPE.KNOWN, left_id, right_id, key));
            }
        }

        // Unknown word processing
        var head_char = sentence.charAt(pos);
        var head_char_class = unknown_dictionary.lookup(head_char);
        if (vocabLen === 0 || head_char_class.is_always_invoke === 1) {
            var unk_key = head_char;
            var unkKeyLen = 1;
            if (head_char_class.is_grouping === 1) {
                var tailLen = sentence.length;
                for (var k = pos + 1; k < tailLen; k++) {
                    var next_char = sentence.charAt(k);
                    var next_char_class = unknown_dictionary.lookup(next_char);
                    if (head_char_class.class_name !== next_char_class.class_name) {
                        break;
                    }
                    unk_key += next_char;
                    unkKeyLen++;
                }
            }

            var unk_ids = unk_target_map[head_char_class.class_id];
            var unkIdsLen = unk_ids.length;
            for (var j = 0; j < unkIdsLen; j++) {
                var unk_id = unk_ids[j];

                left_id = unk_dictionary.getShort(unk_id);
                right_id = unk_dictionary.getShort(unk_id + 2);
                word_cost = unk_dictionary.getShort(unk_id + 4);

                lattice.append(new ViterbiNode(unk_id, word_cost, pos + 1, unkKeyLen, NODE_TYPE.UNKNOWN, left_id, right_id, unk_key));
            }
        }
    }
    lattice.appendEos();

    return lattice;
};

/**
 * Build character to byte offset mapping
 */
ViterbiBuilder.prototype._buildCharOffsets = function(str, bytesLen) {
    var offsets = new Int32Array(str.length + 1);
    var byteIdx = 0;
    var charIdx = 0;
    var len = str.length;

    while (charIdx < len) {
        offsets[charIdx] = byteIdx;
        var code = str.charCodeAt(charIdx);

        if (code < 0x80) {
            byteIdx += 1;
        } else if (code < 0x800) {
            byteIdx += 2;
        } else if (code >= 0xD800 && code <= 0xDBFF) {
            byteIdx += 4;
            charIdx++;
        } else {
            byteIdx += 3;
        }
        charIdx++;
    }
    offsets[charIdx] = byteIdx;
    return offsets;
};

/**
 * Convert byte offset to character length
 */
ViterbiBuilder.prototype._byteOffsetToCharLen = function(charToByteOffset, startCharPos, targetByteOffset) {
    var charLen = 1;
    var maxLen = charToByteOffset.length - startCharPos;
    while (charLen < maxLen && charToByteOffset[startCharPos + charLen] < targetByteOffset) {
        charLen++;
    }
    return charLen;
};

/**
 * Fallback UTF-8 conversion
 */
ViterbiBuilder.prototype._stringToUtf8 = function(str) {
    var bytes = new Uint8Array(str.length * 4);
    var i = 0, j = 0;

    while (i < str.length) {
        var code = str.charCodeAt(i++);
        if (code >= 0xD800 && code <= 0xDBFF) {
            var low = str.charCodeAt(i++);
            code = (code - 0xD800) * 0x400 + (low - 0xDC00) + 0x10000;
        }

        if (code < 0x80) {
            bytes[j++] = code;
        } else if (code < 0x800) {
            bytes[j++] = (code >>> 6) | 0xC0;
            bytes[j++] = (code & 0x3F) | 0x80;
        } else if (code < 0x10000) {
            bytes[j++] = (code >>> 12) | 0xE0;
            bytes[j++] = ((code >> 6) & 0x3f) | 0x80;
            bytes[j++] = (code & 0x3F) | 0x80;
        } else {
            bytes[j++] = (code >>> 18) | 0xF0;
            bytes[j++] = ((code >> 12) & 0x3F) | 0x80;
            bytes[j++] = ((code >> 6) & 0x3F) | 0x80;
            bytes[j++] = (code & 0x3F) | 0x80;
        }
    }
    return bytes.subarray(0, j);
};

module.exports = ViterbiBuilder;
