/*global: module */

(function () {

    'use strict';

    var socketioModule = require('socket.io'),
        io = null;

    /* a utility for counting size of an object. */
    function size (obj) {
        var count = 0, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                count = count + 1;
            }
        }
        return count;
    };


    function MAPSTART_DATA (opts) {
        return {
            name: 'MAPSTART',
            input: opts.input,
            mapper: opts.mapper + '', // turn function to string
            reducer: opts.reducer + ''
        };
    };

    module.exports = {
        test: function () {
            console.log(socketioModule);
        },

        start: function (httpServer) {
            io = socketioModule.listen(httpServer);

            var clientPool = {};

            io.sockets.on('connection', function (socket) {
                console.log('new connection in');
                clientPool[socket.id] = {
                    id: socket.id
                };
                console.log(clientPool);
                socket.on('disconnect', function () {
                    console.log('a connection failed');
                    delete clientPool[socket.id];
                });
            });

        },
    };


})();
