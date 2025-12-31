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
var MAX_COST = ViterbiNode.MAX_COST;

/**
 * ViterbiSearcher is for searching best Viterbi path
 * @param {ConnectionCosts} connection_costs Connection costs matrix
 * @constructor
 */
function ViterbiSearcher(connection_costs) {
    this.connection_costs = connection_costs;
    // Cache for inline connection cost lookup
    this._cc_buffer = connection_costs.buffer;
    this._cc_backward_dim = connection_costs.backward_dimension;
}

/**
 * Search best path by forward-backward algorithm
 * @param {ViterbiLattice} lattice Viterbi lattice to search
 * @returns {Array} Shortest path
 */
ViterbiSearcher.prototype.search = function (lattice) {
    lattice = this.forward(lattice);
    return this.backward(lattice);
};

ViterbiSearcher.prototype.forward = function (lattice) {
    var nodes_end_at = lattice.nodes_end_at;
    var eos_pos = lattice.eos_pos;
    // Inline connection costs lookup for speed
    var cc_buffer = this._cc_buffer;
    var cc_backward_dim = this._cc_backward_dim;

    for (var i = 1; i <= eos_pos; i++) {
        var nodes = nodes_end_at[i];
        if (nodes == null) {
            continue;
        }
        var nodesLen = nodes.length;
        for (var j = 0; j < nodesLen; j++) {
            var node = nodes[j];
            var cost = MAX_COST;
            var shortest_prev_node;
            var node_cost = node.cost;
            var node_left_id = node.left_id;

            var prev_nodes = nodes_end_at[node.start_pos - 1];
            if (prev_nodes == null) {
                continue;
            }
            var prevLen = prev_nodes.length;
            for (var k = 0; k < prevLen; k++) {
                var prev_node = prev_nodes[k];
                // Inline: connection_costs.get(forward_id, backward_id) = buffer[forward_id * backward_dimension + backward_id + 2]
                var cc = cc_buffer[prev_node.right_id * cc_backward_dim + node_left_id + 2];
                var _cost = prev_node.shortest_cost + cc + node_cost;
                if (_cost < cost) {
                    shortest_prev_node = prev_node;
                    cost = _cost;
                }
            }

            node.prev = shortest_prev_node;
            node.shortest_cost = cost;
        }
    }
    return lattice;
};

ViterbiSearcher.prototype.backward = function (lattice) {
    var nodes_end_at = lattice.nodes_end_at;
    var eos = nodes_end_at[nodes_end_at.length - 1][0];

    var node_back = eos.prev;
    if (node_back == null) {
        return [];
    }

    // Count path length first to avoid reverse()
    var count = 0;
    var node = node_back;
    while (node.type !== NODE_TYPE.BOS) {
        count++;
        if (node.prev == null) {
            return [];
        }
        node = node.prev;
    }

    // Build path in correct order
    var shortest_path = new Array(count);
    var idx = count - 1;
    node = node_back;
    while (node.type !== NODE_TYPE.BOS) {
        shortest_path[idx--] = node;
        node = node.prev;
    }

    return shortest_path;
};

module.exports = ViterbiSearcher;
