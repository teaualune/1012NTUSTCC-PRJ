/*global module */

module.exports = {
    name: 'Word Counter',
    inputDir: 'wordCount/input',
    outputDir: 'wordCount/output',
    mapper: {
        body: function (data, emit, output) {
            var word = null,
                splitter = function (d) {
                    var s = d.replace(/(^\s*)|(\s*$)/gi, '');
                    s = s.replace(/[ ]{2,}/gi, ' ');
                    s = s.replace(/\n /, '\n');
                    return s.split(/[\s!-\/:-@\[-`{-~]+/);
                },
                words = splitter(data);
            for (word in words) {
                emit(words[word], 1, output);
            }
        },
        header: 'function (data, emit, output)',
        arguments: ['data', 'emit', 'output']
    },
    reducer: {
        body: function (data, output) {
            var key = null;
            for (key in data) {
                if (output[key]) {
                    output[key] += parseInt(data[key], 10);
                } else {
                    output[key] = parseInt(data[key], 10);
                }
            }
        },
        header: 'function (data, output)',
        arguments: ['data', 'output']
    },
    emitter: {
        body: function (key, value, mapperOutput) {
            if (mapperOutput[key]) {
                mapperOutput[key] += value;
            } else {
                mapperOutput[key] = 1;
            }
        },
        header: 'function (key, value, mapperOutput)',
        arguments: ['key', 'value', 'mapperOutput']
    }
};