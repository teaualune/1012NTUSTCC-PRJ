/*global module, require, console */

(function () {

    'use strict';

    var socketioModule = require('socket.io'),
        io = null,
        clientPool = {},
        running = false,

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
        };

    module.exports = {
        start: function (config) {
            console.log('MAPREDUCE START!!')
            running = true;

            var numClients = size(clientPool),
                input = fakeInput(numClients),
                i = 0;

            for (client in clientPool) {
                io.clients[client].send('MAPSTART', generateMAPSTART_DATA({
                    input: input[i],
                    mapper: config.mapper,
                    reducer: config.reducer,
                    emitter: config.emitter
                }));
                i ++;
            }

        },

        setup: function (httpServer) {
            io = socketioModule.listen(httpServer);

            io.sockets.on('connection', function (socket) {

                if (running) {
                    return;
                }

                clientPool[socket.id] = {
                    id: socket.id
                };
                console.log(clientPool);
                socket.on('disconnect', function () {
                    console.log('a connection failed');
                    delete clientPool[socket.id];
                });
            });

        }
    };


}());
