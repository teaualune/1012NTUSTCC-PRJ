var mapper, reducer, map_input, emitter, 
    mapperOutput = {}, reduceOutput={},
    mapallend = false;

//開始MapReduce
socket.on('MAPSTART', function (data) {
	mapper = new Function (data.mapper);
	reducer = new Function (data.reducer);
	map_input = data.input;
	emitter = new Function (data.emitter);
	}
);

//Mapper運作
mapper(input, emitter);
socket.emit('MAPDATA', mapperOutput);//Mapper回傳資料

//觸發Map結束事件
socket.emit('MAPEND');

//開始Reducer
socket.on('REDUCE', function (data) {
	socket.emit("GOT_REDUCE"); //告訴server已經收到reduce資料
	var reduce_input = data.input();
	reducer(reduce_input, reduceOutput); //執行reducer
	socket.emit('REDUCEDATA', reduceOutput); //傳回Reducer完成的資料
	if (mapallend) {socket.emit('REDUCEEND');}
  }
);

//接收MAP_ALL_END訊號
socket.on('MAP_ALL_END', function () {
	mapallend = true;
  }
);

socket.on('COMPLETE', function (data) {
	console.log(data);
})