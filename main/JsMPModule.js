/*global module, require, console */

(function () {

    'use strict';

    var socketioModule = require('socket.io'),
        io = null,
        clientPool = [],

        /* a utility for counting size of an object. */
        size = function (obj) {
            var count = 0, key;
            for (key in obj) {
                if (obj.hasOwnProperty(key)) {
                    count = count + 1;
                }
            }
            return count;
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

        generateMAP_ALL_END_DATA = function () {
            return {
                name: 'MAP_ALL_END'
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
            } else if (key[0] > 'm') {
                return pool[1];
            }
        };



    // MP variables
    var numClients = 0,
        input = null,
        mapends = null,
        gotReduces = null,
        mapAllends = false,
        reduceEnds = 0,
        running = false,
        result = {},
        checkMapAllEnd = function () {
            if (size(mapends) === numClients && !mapAllends) {
                io.sockets.emit('MAP_ALL_END', generateMAP_ALL_END_DATA());
                mapAllends = true;
            }
        };

    module.exports = {
        start: function (config) {
            console.log('MAPREDUCE START!!')

            // init module-scope MP variables
            running = true;
            numClients = size(clientPool);
            input = fakeInput(numClients);
            mapends = {};
            gotReduces = {};
            mapAllends = false;
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
            io = socketioModule.listen(httpServer);

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
                    if (gotReduces[socket.id].send === gotReduces[socket.id].got) {
                        checkMapAllEnd();
                    }
                });

                // MAPDATA
                socket.on('MAPDATA', function (data) {
                    console.log('\n\nonMAPDATA');
                    console.log(data);

                    var mapperOutput = data.data,
                        key = null,
                        clientSocket = null,
                        input = null;

                    gotReduces[socket.id] = {
                        send: 0,
                        got: 0
                    };
                    for (key in mapperOutput) {
                        if (mapperOutput.hasOwnProperty(key)) {
                            gotReduces[socket.id].send ++;
                            clientSocket = bucket(key, clientPool).socket;
                            input = {};
                            input[key] = mapperOutput[key];
                            clientSocket.emit('REDUCE', generateREDUCE_DATA({
                                input: input
                            }));
                        }
                    }
                });

                // GOT_REDUCE
                socket.on('GOT_REDUCE', function (data) {
                    console.log('\n\nonGOT_REDUCE');
                    console.log(data);

                    gotReduces[socket.id].got ++;
                    checkMapAllEnd();
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
                    }
                });

                // REDUCEDATA
                socket.on('REDUCEDATA', function (data) {
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
                });


            });
        }
    };

}());
