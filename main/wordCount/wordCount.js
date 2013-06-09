/*global module */

module.exports = {
    name: 'Word Counter',
    inputDir: 'input',
    outputDir: 'output',
    mapper: function (data, emit, output) {
        var word = null,
            words = data.split(' '); // split by space
        for (word in words) {
            emit(word, 1, output);
        }
    },
    reducer: function (data, output) {
        var key = null;
        for (key in data) {
            output[key] += parseInt(data[key], 10);
        }
    },
    emitter: function (key, value, mapperOutput) {
        mapperOutput[key] += value;
    }
};