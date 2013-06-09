/*global socket */

var mapper = null,
    reducer = null,
    map_input = null,
    emitter = null, 
    mapperOutput = {},
    reduceOutput = {},
    mapallend = false;

//開始MapReduce
socket.on('MAPSTART', function (data) {
    mapper = new Function(data.mapper.arguments, data.mapper.body);
    reducer = new Function(data.reducer.arguments, data.reducer.body);
    map_input = data.input;
    emitter = new Function (data.emitter.arguments, data.emitter.body);

    //Mapper運作
    mapper(map_input, emitter, mapperOutput);
    socket.emit('MAPDATA', {
        data: mapperOutput
    });//Mapper回傳資料
    socket.emit('MAPEND');//觸發Map結束事件
});

//開始Reducer
socket.on('REDUCE', function (data) {
    socket.emit("GOT_REDUCE"); //告訴server已經收到reduce資料
    var reduce_input = data.input;
    reducer(reduce_input, reduceOutput); //執行reducer

    if (mapallend) {
        socket.emit('REDUCEEND');
    }
});

//接收MAP_ALL_END訊號
socket.on('MAP_ALL_END', function () {
    socket.emit('REDUCEDATA', {
        name: 'REDUCEDATA',
        data: reduceOutput
    }); //傳回Reducer完成的資料
    mapallend = true;
});

socket.on('COMPLETE', function (data) {
    console.log(data.data);
});