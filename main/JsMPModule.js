/*global module, require, console */

(function () {

    'use strict';

    var socketioModule = require('socket.io'),
        _ = require('underscore'),
        io = null,
        clientPool = [],

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

        fakeInput = function (n) {
            var i = 0,
                input = [];
            for (i; i < n; i ++) {
                input[i] = 'Hello World';
            }
            return input;
        },

        bucket = function (key, pool) { // match the key to a pool
            // currently fake one
            if (pool.length < 2) {
                return pool[0];
            } else if (key[0] < 'm') {
                return pool[0];
            } else {
                return pool[1];
            }
        };



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
        result = {};

    module.exports = {
        start: function (config) {
            console.log('MAPREDUCE START!!');

            // init module-scope MP variables
            running = true;
            numClients = _.size(clientPool);
            input = fakeInput(numClients);
            mapends = {};
            gotReduces.init();
            reduceEnds = 0;
            result = {};

            var i = 0;

            for (i; i < clientPool.length; i ++) {
                clientPool[i].socket.emit('MAPSTART', generateMAPSTART_DATA({
                    input: input[i],
                    mapper: config.mapper,
                    reducer: config.reducer,
                    emitter: config.emitter
                }));
            }

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
                    console.log(data);

                    mapends[socket.id] = 1;
                    if (_.size(mapends) === numClients) {
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

                    for (key in mapperOutput) {
                        if (mapperOutput.hasOwnProperty(key)) {
                            clientSocket = bucket(key, clientPool).socket;
                            gotReduces.appendSend(clientSocket.id);
                            input = {};
                            input[key] = mapperOutput[key];
                            clientSocket.emit('REDUCE', generateREDUCE_DATA({
                                input: input
                            }), function (data) {
                                gotReduces.appendGot(clientSocket.id);
                            });
                        }
                    }

                    cb(); // let client call MAPEND
                });

                // REDUCEEND
                socket.on('REDUCEEND', function (data) {
                    console.log('\n\nonREDUCEEND');
                    console.log(data);

                    reduceEnds ++;
                    if (reduceEnds === numClients) {
                        io.sockets.emit('COMPLETE', generateCOMPLETE_DATA({
                            data: result
                        }));
                        console.log('\n\nCOMPLETE!');
                        console.log(result);
                    }
                });

                // REDUCEDATA
                socket.on('REDUCEDATA', function (data, cb) {
                    console.log('\n\nonREDUCEDATA');
                    console.log(data);

                    var key = null,
                        reducerOutput = data.data;
                    for (key in reducerOutput) {
                        if (reducerOutput.hasOwnProperty(key)) {
                            console.log('reduced key: ' + key);
                            console.log('value: ' + reducerOutput[key]);
                            result[key] = reducerOutput[key];
                        }
                    }

                    cb();
                });

            });
        }
    };

}());
