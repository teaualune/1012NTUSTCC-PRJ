/*global module, require, console */

(function () {

    'use strict';

    var socketioModule = require('socket.io'),
        _ = require('underscore'),
        fs = require('fs'),
        util = require('util'),
        io = null,
        clientPool = [],

        // _.each sucks!
        each = function (obj, callback) {
            var key = null;
            for (key in obj) {
                if (obj.hasOwnProperty(key)) {
                    callback(key, obj[key]);
                }
            }
        },

        generateMAPSTART_DATA = function (opts) {
            return {
                name: 'MAPSTART',
                input: opts.input,
                mapper: {
                    body: (opts.mapper.body + '').split(opts.mapper.header)[1], // turn function to string
                    arguments: opts.mapper.arguments
                },
                reducer: {
                    body: (opts.reducer.body + '').split(opts.reducer.header)[1],
                    arguments: opts.reducer.arguments
                },
                emitter: {
                    body: (opts.emitter.body + '').split(opts.emitter.header)[1],
                    arguments: opts.emitter.arguments
                }
            };
        },

        generateREDUCE_DATA = function (opts) {
            return {
                name: 'REDUCE',
                input: opts.input
            };
        },

        generateMAP_ALL_END_DATA = function (opts) {
            return {
                name: 'MAP_ALL_END',
                numOfReduces: opts.numOfReduces
            };
        },

        generateCOMPLETE_DATA = function (opts) {
            return {
                name: 'COMPLETE',
                data: opts.data
            };
        },

        readInput = function (inputDir, n, callback) {
            var numChunks = 0,
                ratio = 0,
                i = 0,
                j,
                outerBuffer = null,
                innerBuffer = null;

            inputDir = './' + inputDir;

            fs.readdir(inputDir, function (err, files) {
                if (err) {
                    throw err;
                } else {
                    numChunks = files.length;
                    ratio = Math.ceil(numChunks / n); // average chunks per mapper
                    for (i; i < n; i ++) {
                        outerBuffer = null;
                        for (j = 0; j < ratio; j ++) {
                            if (i * ratio + j < files.length) {
                                innerBuffer = fs.readFileSync(inputDir + '/' + files[i * ratio + j], 'utf8');
                                if (outerBuffer) {
                                    outerBuffer = outerBuffer + innerBuffer;
                                } else {
                                    outerBuffer = innerBuffer;
                                }
                            }
                        }
                        if (!outerBuffer) {
                            outerBuffer = '';
                        }
                        callback(outerBuffer, i);
                    }
                }
            });
        },

        writeResult = function (outputDir, result) {
            fs.writeFile('./' + outputDir + '/result.txt', util.format('%j', result), function (err) {
                if (err) {
                    console.log('write output error');
                }
            });
        },

        bucket = (function () {
            var keypool = {}, // key: socketID
                i = 0;
            return function (key, pool) {

                // initialization
                if (arguments.length === 0) {
                    keypool = {};
                    i = 0;
                    return;
                }

                if (!_.has(keypool, key)) {
                    keypool.key = pool[i].id;
                    i = (i + 1) % pool.length;
                }
                var socket = _.filter(pool, function (s) {
                    return s.id === keypool.key;
                });
                return socket[0];
            };
        }());
        bucket();

        // bucket = function (key, pool) { // match the key to a pool
        //     // currently fake one
        //     if (pool.length < 2) {
        //         return pool[0];
        //     } else if (key[0] < 'm') {
        //         return pool[0];
        //     } else {
        //         return pool[1];
        //     }
        // };



    // MP variables
    var numClients = 0,
        input = null,
        mapends = null,
        gotReduces = (function () {
            var send,
                got,
                callback = null,
                totalReduces = 0,
                check = function () {
                    if (callback) {
                        console.log(send);
                        console.log(got);
                        if (_.isEqual(send, got)) {
                            var sendSum = _.reduce(_.values(send), function (memo, num) {
                                    return memo + num;
                                }, 0),
                                gotSum = _.reduce(_.values(got), function (memo, num) {
                                    return memo + num;
                                }, 0);
                            if (sendSum === gotSum) {
                                callback();
                            }
                        }
                    }
                };
            return {
                init: function () {
                    send = {};
                    got = {};
                    totalReduces = 0;
                    callback = null;
                },
                appendSend: function (sid) {
                    if (send[sid]) {
                        send[sid] ++;
                    } else {
                        send[sid] = 1;
                    }
                },
                appendGot: function (sid) {
                    if (got[sid]) {
                        got[sid] ++;
                    } else {
                        got[sid] = 1;
                    }
                    check();
                },
                addTotalReduces: function (n) {
                    totalReduces += n;
                },
                listen: function (cb) {
                    callback = cb;
                    check();
                },
                numOfReduces: function (sid) {
                    var n = 0;
                    if (got[sid]) {
                        n = got[sid];
                    }
                    return n;
                }
            };
        }()),
        reduceEnds = 0,
        running = false,
        result = {},
        outputDir = null;

    module.exports = {
        start: function (config) {
            console.log('MAPREDUCE START!! ' + config.name);

            // init module-scope MP variables
            running = true;
            numClients = _.size(clientPool);
            mapends = {};
            gotReduces.init();
            reduceEnds = 0;
            result = {};
            outputDir = config.outputDir;

            readInput(config.inputDir, numClients, function (data, idx) {
                clientPool[idx].socket.emit('MAPSTART', generateMAPSTART_DATA({
                    input: data,
                    mapper: config.mapper,
                    reducer: config.reducer,
                    emitter: config.emitter
                }));
            });
        },

        setup: function (httpServer) {
            io = socketioModule.listen(httpServer, {
                log: false
            });

            io.sockets.on('connection', function (socket) {
                var newClient = {
                    id: socket.id,
                    socket: socket
                };

                if (running) {
                    return;
                }

                clientPool.push(newClient);

                socket.on('disconnect', function () {
                    console.log('a connection failed');
                    var idx = clientPool.indexOf(newClient);
                    if (idx !== -1) {
                        clientPool.splice(idx, 1);
                    }
                });


                // MAPEND
                socket.on('MAPEND', function (data) {
                    console.log('\n\nonMAPEND');
                    //console.log(data);

                    mapends[socket.id] = 1;
                    if (_.size(mapends) === numClients) {
                        console.log('gotReduces listen');
                        gotReduces.listen(function () {
                            var i = 0;
                            for (i; i < clientPool.length; i ++) {
                                clientPool[i].socket.emit('MAP_ALL_END', generateMAP_ALL_END_DATA({
                                    numOfReduces: gotReduces.numOfReduces(clientPool[i].id)
                                }));
                            }
                        });
                    }
                });

                // MAPDATA
                socket.on('MAPDATA', function (data, cb) {
                    console.log('\n\nonMAPDATA');
                    console.log(data);

                    var mapperOutput = data.data,
                        key = null,
                        clientSocket = null,
                        input = null;

                    gotReduces.addTotalReduces(_.size(mapperOutput));

                    each(mapperOutput, function (key, value) {
                        console.log(key);
                        console.log(value);
                        clientSocket = bucket(key, clientPool).socket;
                        gotReduces.appendSend(clientSocket.id);
                        input = {};
                        input[key] = value;
                        clientSocket.emit('REDUCE', generateREDUCE_DATA({
                            input: input
                        }), function (data) {
                            var trueClientSocketID = data.socketID;
                            gotReduces.appendGot(trueClientSocketID);
                        });
                    })

                    cb(); // let client call MAPEND
                });

                // REDUCEEND
                socket.on('REDUCEEND', function (data) {
                    console.log('\n\nonREDUCEEND');
                    //console.log(data);

                    reduceEnds ++;
                    if (reduceEnds === numClients) {
                        io.sockets.emit('COMPLETE', generateCOMPLETE_DATA({
                            data: result
                        }));
                        console.log('\n\nCOMPLETE!');
                        console.log(result);
                        writeResult(outputDir, result);
                    }
                });

                // REDUCEDATA
                socket.on('REDUCEDATA', function (data, cb) {
                    console.log('\n\nonREDUCEDATA');
                    //console.log(data);

                    var reducerOutput = data.data;
                    each(reducerOutput, function (key, value) {
                        console.log('reduce key: ' + key);
                        console.log('value: ' + value);
                        result[key] = value;
                    });

                    cb();
                });

            });
        }
    };


}());
