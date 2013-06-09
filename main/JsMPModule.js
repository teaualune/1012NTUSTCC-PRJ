/*global module, require, console */

(function () {

    'use strict';

    var socketioModule = require('socket.io'),
        io = null,
        clientPool = {};

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
                reducer: opts.reducer + ''
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
        };

    module.exports = {
        start: function () {
            console.log('MAPSTART!!');
        },

        setup: function (httpServer) {
            io = socketioModule.listen(httpServer);

            io.sockets.on('connection', function (socket) {

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
