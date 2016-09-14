
//クライアントの動作を再現するサンプルスクリプト
//接続後はただ動作する

//モジュールの読み込み
var request = require('request');
var WebSocket = require('websocket').client;
var client = new WebSocket();

//WebSocketの接続に使用するToken、ログイン時に取得
var token;

//ログを決まった形式で出力
log = function(msg){
    console.log('[Client Log] '+msg);
}

//特定のChannelを示す文字列
channel = function(){
    res = {};
    res['channel'] = 'DungeonChannel';
    return JSON.stringify(res);
};

//特定のChannelを購読するための文字列
subscribe = function(){
    command = {};
    command['command'] = 'subscribe';
    command['identifier'] = channel();
    return JSON.stringify(command);
};

auth = function(){
    
    data = {};
    data['action'] = 'auth';
    data['id'] = 1;
    data['token'] = token;

    command = {};
    command['command'] = 'message';
    command['identifier'] = channel();
    command['data'] = JSON.stringify(data);

    return JSON.stringify(command);
};

//動いたという情報を示す文字列
move = function(x, y){
    
    data = {};
    data['action'] = 'move';
    data['x'] = x;
    data['y'] = y;

    command = {};
    command['command'] = 'message';
    command['identifier'] = channel();
    command['data'] = JSON.stringify(data);

    return JSON.stringify(command);
};

//繰り返し再帰的に動く
sendMove = function(connection, x, y){
    //動作をサーバーに伝える
    connection.sendUTF(move(x, y));
    //0.2秒後に再び送る
    setTimeout(function(){
	//適当に少しずつ動く
	sendMove(connection, x+(Math.random()-0.5), y+(Math.random()-0.5));
    }, 10);
};

//接続失敗
client.on('connectFailed', function(error){
    log('Connect Error: '+error.toString());
});

//接続開始
client.on('connect', function(connection){

    //接続
    log('WebSocket接続成功!');

    //エラー
    connection.on('error', function(error){
	log('エラー: '+error.toString());
    });

    //ActionCableからメッセージを受信
    connection.on('message', function(message){

	data = JSON.parse(message.utf8Data);
	msg  = data['message'];//data['message']内にデータが入っている

	//認証情報
	if('status' in Object(msg)){

	    //認証失敗
	    if(msg['status'] == 0){
		log('認証成功!');
	    }

	    //1秒後に動作開始
	    setTimeout(function(){
		log('動作開始');
		sendMove(connection, 1, 3);
	    }, 1000);

	}else
	    //ユーザーの情報更新
	    if('x' in Object(msg) && 'y' in Object(msg)){

		//ユーザーデータ
		u = JSON.parse(msg['user']);
		x = msg['x'];
		y = msg['y'];
		
		log(u['user']['name']+' is now at (x: '+x+', y: '+y+')');
	    }
    });
    
    //1秒後に購読開始
    setTimeout(function(){
	
	//購読のリクエスト
	log('Subscribeのリクエスト');
	connection.sendUTF(subscribe());

	//1秒後にユーザー認証を行う
	setTimeout(function(){
	    log('Tokenを使用したユーザー認証');
	    connection.sendUTF(auth());
	}, 1000);

    }, 1000);

});

//ログイン時に送信する情報
var options = {
    url: 'http://localhost:3000/users/1/login',
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    json: true,
    form: {/*ここにパスワードを入れる(未実装)*/}
};

//ログイン手続き
request(options, function(error, response, body){

    if(body['status'] == 200){

	token = body['user']['token'];

	log('ログイン成功');
	log('Token: '+token);

	//WebSocketに接続開始
	client.connect('ws://localhost:3000/cable');

    }else{
	log('ログイン失敗');
    }
});


