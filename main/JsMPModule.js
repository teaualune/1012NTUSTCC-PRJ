/*global: module */

(function () {

    'use strict';

    var socketioModule = require('socket.io'),
        io = null;

    module.exports = {
        test: function () {
            console.log(socketioModule);
        },

        start: function (httpServer) {
            io = socketioModule.listen(httpServer);

            var clientPool = 0;

            io.sockets.on('connection', function (socket) {
                console.log('new connection in');
                clientPool = clientPool + 1;
                console.log(clientPool);
                socket.on('disconnect', function () {
                    console.log('a connection failed');
                    clientPool = clientPool - 1;
                });
            });

        },
    };


})();
