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

// Node type constants for V8 hidden class optimization
var NODE_TYPE = {
    BOS: 0,
    EOS: 1,
    KNOWN: 2,
    UNKNOWN: 3
};

/**
 * ViterbiNodePool - Object pool for ViterbiNode to reduce GC pressure
 * Pre-allocates nodes and reuses them across tokenization calls
 * @param {number} initialSize Initial pool size
 * @constructor
 */
function ViterbiNodePool(initialSize) {
    this.size = initialSize || 1024;
    this.index = 0;
    this.nodes = new Array(this.size);

    // Pre-allocate nodes with consistent hidden class
    for (var i = 0; i < this.size; i++) {
        this.nodes[i] = {
            name: 0,
            cost: 0,
            start_pos: 0,
            length: 0,
            left_id: 0,
            right_id: 0,
            prev: null,
            surface_form: "",
            shortest_cost: 0,
            type: 0
        };
    }
}

/**
 * Acquire a node from the pool
 * @param {number} name Word ID
 * @param {number} cost Word cost
 * @param {number} start_pos Start position
 * @param {number} length Word length
 * @param {number} type Node type (use NODE_TYPE constants)
 * @param {number} left_id Left context ID
 * @param {number} right_id Right context ID
 * @param {string} surface_form Surface form
 * @returns {Object} ViterbiNode-like object
 */
ViterbiNodePool.prototype.acquire = function(name, cost, start_pos, length, type, left_id, right_id, surface_form) {
    // Expand pool if needed
    if (this.index >= this.size) {
        this._expand();
    }

    var node = this.nodes[this.index++];
    node.name = name;
    node.cost = cost;
    node.start_pos = start_pos;
    node.length = length;
    node.left_id = left_id;
    node.right_id = right_id;
    node.prev = null;
    node.surface_form = surface_form;
    node.shortest_cost = type === NODE_TYPE.BOS ? 0 : 1000000000;
    node.type = type;

    return node;
};

/**
 * Reset pool for reuse
 */
ViterbiNodePool.prototype.reset = function() {
    this.index = 0;
};

/**
 * Expand pool capacity
 * @private
 */
ViterbiNodePool.prototype._expand = function() {
    var newSize = this.size * 2;
    for (var i = this.size; i < newSize; i++) {
        this.nodes[i] = {
            name: 0,
            cost: 0,
            start_pos: 0,
            length: 0,
            left_id: 0,
            right_id: 0,
            prev: null,
            surface_form: "",
            shortest_cost: 0,
            type: 0
        };
    }
    this.size = newSize;
};

/**
 * Get current pool usage
 * @returns {number} Number of nodes in use
 */
ViterbiNodePool.prototype.getUsage = function() {
    return this.index;
};

module.exports = ViterbiNodePool;
module.exports.NODE_TYPE = NODE_TYPE;
