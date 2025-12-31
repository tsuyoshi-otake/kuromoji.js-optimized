/*
 * kuromoji.js Benchmark
 */

"use strict";

var kuromoji = require("../src/kuromoji");

var DIC_DIR = "dict/";
var WARMUP_RUNS = 5;
var BENCHMARK_RUNS = 100;

// Test sentences
var TEST_CASES = {
    short: "すもももももももものうち",
    medium: "吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。何でも薄暗いじめじめした所でニャーニャー泣いていた事だけは記憶している。",
    long: "吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。何でも薄暗いじめじめした所でニャーニャー泣いていた事だけは記憶している。吾輩はここで始めて人間というものを見た。しかもあとで聞くとそれは書生という人間中で一番獰悪な種族であったそうだ。この書生というのは時々我々を捕えて煮て食うという話である。しかしその当時は何という考もなかったから別段恐しいとも思わなかった。ただ彼の掌に載せられてスーと持ち上げられた時何だかフワフワした感じがあったばかりである。掌の上で少し落ちついて書生の顔を見たのがいわゆる人間というものの見始であろう。この時妙なものだと思った感じが今でも残っている。第一毛をもって装飾されべきはずの顔がつるつるしてまるで薬缶だ。その後猫にもだいぶ逢ったがこんな片輪には一度も出会わした事がない。のみならず顔の真中があまりに突起している。"
};

function formatNumber(num, decimals) {
    return num.toFixed(decimals);
}

function calculateStats(times) {
    var sum = times.reduce(function(a, b) { return a + b; }, 0);
    var avg = sum / times.length;
    var squaredDiffs = times.map(function(t) { return Math.pow(t - avg, 2); });
    var variance = squaredDiffs.reduce(function(a, b) { return a + b; }, 0) / times.length;
    var stdDev = Math.sqrt(variance);
    var min = Math.min.apply(null, times);
    var max = Math.max.apply(null, times);
    return { avg: avg, stdDev: stdDev, min: min, max: max };
}

function runBenchmark(tokenizer, text, runs, warmupRuns) {
    // Warmup
    for (var i = 0; i < warmupRuns; i++) {
        tokenizer.tokenize(text);
    }

    // Benchmark
    var times = [];
    for (var j = 0; j < runs; j++) {
        var start = process.hrtime.bigint();
        tokenizer.tokenize(text);
        var end = process.hrtime.bigint();
        times.push(Number(end - start) / 1000000); // Convert to milliseconds
    }
    return times;
}

function printResults(label, stats, runs, charCount) {
    var throughput = charCount / stats.avg * 1000; // chars per second
    console.log("  " + label + ":");
    console.log("    Avg: " + formatNumber(stats.avg, 3) + "ms");
    console.log("    Std: " + formatNumber(stats.stdDev, 3) + "ms");
    console.log("    Min: " + formatNumber(stats.min, 3) + "ms");
    console.log("    Max: " + formatNumber(stats.max, 3) + "ms");
    console.log("    Throughput: " + formatNumber(throughput, 0) + " chars/sec");
    console.log("    Runs: " + runs);
}

console.log("=== kuromoji.js Benchmark ===\n");
console.log("Configuration:");
console.log("  Warmup runs: " + WARMUP_RUNS);
console.log("  Benchmark runs: " + BENCHMARK_RUNS);
console.log("");

// Measure dictionary load time
console.log("Loading dictionary...");
var loadStart = process.hrtime.bigint();

kuromoji.builder({ dicPath: DIC_DIR }).build(function (error, tokenizer) {
    if (error) {
        console.error("Error loading dictionary:", error);
        process.exit(1);
    }

    var loadEnd = process.hrtime.bigint();
    var loadTime = Number(loadEnd - loadStart) / 1000000;

    console.log("\n[1] Dictionary Load Time: " + formatNumber(loadTime, 0) + "ms\n");

    console.log("[2] Tokenization Benchmark\n");

    // Short text
    var shortTimes = runBenchmark(tokenizer, TEST_CASES.short, BENCHMARK_RUNS, WARMUP_RUNS);
    var shortStats = calculateStats(shortTimes);
    printResults("Short (" + TEST_CASES.short.length + " chars)", shortStats, BENCHMARK_RUNS, TEST_CASES.short.length);
    console.log("");

    // Medium text
    var mediumTimes = runBenchmark(tokenizer, TEST_CASES.medium, BENCHMARK_RUNS, WARMUP_RUNS);
    var mediumStats = calculateStats(mediumTimes);
    printResults("Medium (" + TEST_CASES.medium.length + " chars)", mediumStats, BENCHMARK_RUNS, TEST_CASES.medium.length);
    console.log("");

    // Long text
    var longTimes = runBenchmark(tokenizer, TEST_CASES.long, BENCHMARK_RUNS, WARMUP_RUNS);
    var longStats = calculateStats(longTimes);
    printResults("Long (" + TEST_CASES.long.length + " chars)", longStats, BENCHMARK_RUNS, TEST_CASES.long.length);
    console.log("");

    // Summary
    console.log("[3] Summary");
    console.log("  Dict Load:  " + formatNumber(loadTime, 0) + "ms");
    console.log("  Short:      " + formatNumber(shortStats.avg, 3) + "ms avg");
    console.log("  Medium:     " + formatNumber(mediumStats.avg, 3) + "ms avg");
    console.log("  Long:       " + formatNumber(longStats.avg, 3) + "ms avg");
});
