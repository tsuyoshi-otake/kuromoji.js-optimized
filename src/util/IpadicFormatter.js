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

var ViterbiNode = require("../viterbi/ViterbiNode");
var NODE_TYPE = ViterbiNode.NODE_TYPE;

// Reverse mapping for backward compatibility
var TYPE_NAMES = ["BOS", "EOS", "KNOWN", "UNKNOWN"];

/**
 * Mappings between IPADIC dictionary features and tokenized results
 * @constructor
 */
function IpadicFormatter() {
}

IpadicFormatter.prototype.formatEntry = function (word_id, position, type, features) {
    return {
        word_id: word_id,
        word_type: TYPE_NAMES[type],
        word_position: position,
        surface_form: features[0],
        pos: features[1],
        pos_detail_1: features[2],
        pos_detail_2: features[3],
        pos_detail_3: features[4],
        conjugated_type: features[5],
        conjugated_form: features[6],
        basic_form: features[7],
        reading: features[8],
        pronunciation: features[9]
    };
};

IpadicFormatter.prototype.formatUnknownEntry = function (word_id, position, type, features, surface_form) {
    return {
        word_id: word_id,
        word_type: TYPE_NAMES[type],
        word_position: position,
        surface_form: surface_form,
        pos: features[1],
        pos_detail_1: features[2],
        pos_detail_2: features[3],
        pos_detail_3: features[4],
        conjugated_type: features[5],
        conjugated_form: features[6],
        basic_form: features[7],
        reading: undefined,
        pronunciation: undefined
    };
};

module.exports = IpadicFormatter;
