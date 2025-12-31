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

/**
 * String wrapper for UTF-16 surrogate pair (4 bytes)
 * Optimized: Fast-path for strings without surrogate pairs
 * @param {string} str String to wrap
 * @constructor
 */
function SurrogateAwareString(str) {
    this.str = str;
    this.index_mapping = null;

    // Quick scan for surrogates (most Japanese text doesn't have them)
    var has_surrogates = false;
    var len = str.length;
    for (var i = 0; i < len; i++) {
        var code = str.charCodeAt(i);
        if (code >= 0xD800 && code <= 0xDBFF) {
            has_surrogates = true;
            break;
        }
    }

    if (has_surrogates) {
        // Build index mapping only when needed
        this.index_mapping = [];
        for (var pos = 0; pos < len; pos++) {
            this.index_mapping.push(pos);
            var ch_code = str.charCodeAt(pos);
            if (ch_code >= 0xD800 && ch_code <= 0xDBFF) {
                pos++;
            }
        }
        this.length = this.index_mapping.length;
    } else {
        // Fast path: no surrogates, length equals string length
        this.length = len;
    }
}

SurrogateAwareString.prototype.slice = function (index) {
    if (this.length <= index) {
        return "";
    }
    if (this.index_mapping === null) {
        // Fast path: direct string access
        return this.str.slice(index);
    }
    var surrogate_aware_index = this.index_mapping[index];
    return this.str.slice(surrogate_aware_index);
};

SurrogateAwareString.prototype.charAt = function (index) {
    if (this.length <= index) {
        return "";
    }
    if (this.index_mapping === null) {
        // Fast path: direct character access
        return this.str.charAt(index);
    }
    var surrogate_aware_start_index = this.index_mapping[index];
    var surrogate_aware_end_index = this.index_mapping[index + 1];

    if (surrogate_aware_end_index == null) {
        return this.str.slice(surrogate_aware_start_index);
    }
    return this.str.slice(surrogate_aware_start_index, surrogate_aware_end_index);
};

SurrogateAwareString.prototype.charCodeAt = function (index) {
    if (this.length <= index) {
        return NaN;
    }
    if (this.index_mapping === null) {
        // Fast path: direct charCode access
        return this.str.charCodeAt(index);
    }
    var surrogate_aware_index = this.index_mapping[index];
    var upper = this.str.charCodeAt(surrogate_aware_index);
    var lower;
    if (upper >= 0xD800 && upper <= 0xDBFF && surrogate_aware_index < this.str.length) {
        lower = this.str.charCodeAt(surrogate_aware_index + 1);
        if (lower >= 0xDC00 && lower <= 0xDFFF) {
            return (upper - 0xD800) * 0x400 + lower - 0xDC00 + 0x10000;
        }
    }
    return upper;
};

SurrogateAwareString.prototype.toString = function () {
    return this.str;
};

SurrogateAwareString.isSurrogatePair = function (ch) {
    var utf16_code = ch.charCodeAt(0);
    return utf16_code >= 0xD800 && utf16_code <= 0xDBFF;
};

module.exports = SurrogateAwareString;
