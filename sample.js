
//特定のChannelを示す文字列
channel = function(){
    res = {};
    res["channel"] = "DungeonChannel";
    return JSON.stringify(res);
};

//特定のChannelを購読するための文字列
subscribe = function(){
    command = {};
    command["command"] = "subscribe";
    command["identifier"] = channel();
    return JSON.stringify(command);
};

//動いたという情報を示す文字列
move = function(x, y){
    
    data = {};
    data["action"] = "move";
    data["x"] = x;
    data["y"] = y;

    command = {};
    command["command"] = "message";
    command["identifier"] = channel();
    command["data"] = JSON.stringify(data);

    return JSON.stringify(command);
};

//繰り返し再帰的に動く
sendMove = function(connection, x, y){
    //動作をサーバーに伝える
    connection.sendUTF(move(x, y));
    //0.2秒後に再び送る
    setTimeout(function(){
	sendMove(connection, x+1, y+1);
    }, 200);
};

var WebSocket = require('websocket').client;
var client = new WebSocket();

//接続失敗
client.on('connectFailed', function(error){
    console.log('Connect Error: '+error.toString());
});

//接続開始
client.on('connect', function(connection){

    //接続
    console.log(' -- 接続!');

    //エラー
    connection.on('error', function(error){
	console.log('Error: '+error.toString());
    });

    //ActionCableからメッセージを受信
    connection.on('message', function(message){

	data = JSON.parse(message.utf8Data);
	msg  = data["message"];//data["message"]内にデータが入っている

	if("x" in Object(msg) && "y" in Object(msg)){
	    x = msg["x"];
	    y = msg["y"];
	    console.log("x: "+x+", y: "+y);
	}
    });

    //mainループ
    console.log(" -- Mainループ");
    
    //1秒後に購読開始
    setTimeout(function(){
	
	//購読のリクエスト
	connection.sendUTF(subscribe());

	//1秒後に動作開始
	setTimeout(function(){sendMove(connection, 1, 3)}, 1000);

    }, 1000);

});

client.connect('ws://localhost:3000/cable');
