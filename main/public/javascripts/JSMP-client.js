/*global socket */

var mapper = null,
    reducer = null,
    map_input = null,
    emitter = null,
    mapperOutput = {},
    reduceOutput = {},
    reduceDataEmitted = false,
    numOfReduces = 0,
    numOfReducesCompleted = 0,

    emitReduceData = function () {
        socket.emit('REDUCEDATA', {
            name: 'REDUCEDATA',
            data: reduceOutput
        }, function () {
            socket.emit('REDUCEEND', {
                name: 'REDUCEEND'
            });
        }); //傳回Reducer完成的資料
    }

//開始MapReduce
socket.on('MAPSTART', function (data) {
    console.log('\n\nonMAPSTART');
    console.log(data);

    mapper = new Function(data.mapper.arguments, data.mapper.body);
    reducer = new Function(data.reducer.arguments, data.reducer.body);
    map_input = data.input;
    emitter = new Function (data.emitter.arguments, data.emitter.body);

    //Mapper運作
    mapper(map_input, emitter, mapperOutput);
    socket.emit('MAPDATA', {
        data: mapperOutput
    }, function () {
        socket.emit('MAPEND', {
            keys: _.keys(mapperOutput)
        });//觸發Map結束事件
    });//Mapper回傳資料
});

//開始Reducer
socket.on('REDUCE', function (data, cb) {
    console.log('\n\nonREDUCE;');
    console.log(data);


    //socket.emit("GOT_REDUCE"); //告訴server已經收到reduce資料
    cb({
        name:'GOT_REDUCE',
        socketID: socket.socket.sessionid
    });
    var reduce_input = data.input;
    reducer(reduce_input, reduceOutput); //執行reducer

    numOfReducesCompleted ++;

    if (numOfReduces === numOfReducesCompleted && !reduceDataEmitted) {
        emitReduceData();
    }

});

//接收MAP_ALL_END訊號
socket.on('MAP_ALL_END', function (data) {
    console.log('\n\nonMAP_ALL_END');
    console.log(data);

    numOfReduces = data.numOfReduces;
    if (numOfReduces === numOfReducesCompleted) {
        emitReduceData();
        reduceDataEmitted = true;
    }

});

socket.on('COMPLETE', function (data) {
    console.log('\n\nonCOMPLETE');
    console.log(data);
});