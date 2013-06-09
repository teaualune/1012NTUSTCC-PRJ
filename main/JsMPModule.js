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
                mapper: opts.mapper + '', // turn function to string
                reducer: opts.reducer + '',
                emitter: opts.emitter + ''
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

        generateCOMPLETE_DATA = function () {
            return {
                name: 'COMPLETE'
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
        running = false,
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

            var i = 0;


            for (i; i < clientPool.length; i ++) {
                io.clients[client.id].send('MAPSTART', generateMAPSTART_DATA({
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
                    id: socket.id
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
                    mapends[socket.id] = 1;
                    if (gotReduces[socket.id].send === gotReduces[socket.id].got) {
                        checkMapAllEnd();
                    }
                });

                // MAPDATA
                socket.on('MAPDATA', function (data) {
                    var mapperOutput = data.data,
                        key = null,
                        clientID = null;

                    gotReduces[socket.id] = {
                        send: 0,
                        got: 0
                    };
                    for (key in mapperOutput) {
                        if (mapperOutput.hasOwnProperty(key)) {
                            gotReduces[socket.id].send ++;
                            clientID = bucket(key, clientPool).id;
                            io.clients[clientID].send('REDUCE', generateREDUCE_DATA({
                                input: mapperOutput[key]
                            }));
                        }
                    }
                });

                // GOT_REDUCE
                socket.on('GOT_REDUCE', function (data) {
                    gotReduces[socket.id].got ++;
                });

                // REDUCEEND
                socket.on('REDUCEEND', function (data) {});

                // REDUCEDATA
                socket.on('REDUCEDATA', function (data) {});


            });
        }
    };

}());
