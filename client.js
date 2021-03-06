
//クライアントオブジェクト
Client = function(){

    //WebScoketモジュールの読み込み
    var WebSocket = require('websocket').client;

    //ログインに利用するrequestモジュールの読み込み
    this.request = require('request');

    //thisを再定義
    var _this = this;

    //User ID
    this.name = new Date().getTime().toString(16) + Math.floor(1000*Math.random()).toString(16)
    
    //ログを書き込むためのfsモジュールの読み込み
    this.fs = require('fs');

    //空のログファイル作成
    this.fs.writeFileSync("./logs/"+this.name+".log", "");

    //WebSocket用クライアント
    this.client = new WebSocket();
    
    //ユーザー作成ときに送信する情報
    this.options = {
	url: 'http://localhost:3000/users',
	method: 'POST',
	headers: {'Content-Type': 'application/json'},
	json: true,
	form: {name: this.name}
    };

    //接続失敗
    this.client.on('connectFailed', function(error){
	_this.log('Connect Error: '+error.toString());
    });

    //接続開始
    this.client.on('connect', function(connection){
	
	_this.connection = connection;

	//接続
	_this.log('WebSocket接続成功!');

	//エラー
	_this.connection.on('error', function(error){
	    _this.log('エラー: '+error.toString());
	});

	//ActionCableからメッセージを受信
	_this.connection.on('message', function(message){

	    data = JSON.parse(message.utf8Data);
	    msg  = data['message'];//data['message']内にデータが入っている

	    //認証情報
	    if('status' in Object(msg)){

		//認証成功
		if(msg['status'] == 0){
		    _this.log('認証成功!');
		    _this.callback();
		}

	    }else
		//ユーザーの情報更新
		if('x' in Object(msg) && 'y' in Object(msg)){
		    
		    //ユーザーデータ
		    u = JSON.parse(msg['user']);
		    x = msg['x'];
		    y = msg['y'];
		    pos_x = msg['pos_x'];
		    pos_y = msg['pos_y'];
		    
		    _this.log(u['user']['name']+
			      ' move to (x: '+x+', y: '+y+')'+
			      ' from (x: '+pos_x+', y: '+pos_y+')');
		}
	});

	_this.callback();

    });
}

//ログを logs/[user_id].log に書き込む
Client.prototype.log = function(msg){

    //stdoutにログを出力
    console.log("[Client Log] "+msg);

    //    var _this = this;
    //    this.fs.appendFileSync('./logs/'+this.id+".log", msg+"\n");
}

//Channelを指定する文字列
Client.prototype._channel = function(){

    res = {};
    res['channel'] = 'DungeonChannel';

    return JSON.stringify(res);
}

//購読するための文字列
Client.prototype._subscribe = function(){

    command = {};
    command['command'] = 'subscribe';
    command['identifier'] = this._channel();

    return JSON.stringify(command);
}

//Tokenを送信して認証する文字列
Client.prototype._auth = function(){

    data = {};
    data['action'] = 'auth';
    data['id'] = this.id;
    data['token'] = this.token;

    command = {};
    command['command'] = 'message';
    command['identifier'] = this._channel();
    command['data'] = JSON.stringify(data);

    return JSON.stringify(command);
}

//(x , y)        タップした点
//(pos_x, pos_y) 今いるところ
Client.prototype._move = function(x, y, pos_x, pos_y){

    data = {};
    data['action'] = 'move';
    data['x'] = x;
    data['y'] = y;
    data['pos_x'] = pos_x;
    data['pos_y'] = pos_y;

    command = {};
    command['command'] = 'message';
    command['identifier'] = this._channel();
    command['data'] = JSON.stringify(data);

    return JSON.stringify(command);
}

//ユーザー作成
Client.prototype.create = function(callback){

    var _this = this;

    this.request(this.options, function(error, response, body){
	
	if(body['status'] == 200){

	    _this.token = body['user']['token'];
	    _this.id    = body['user']['id'];

	    _this.log('ユーザー作成成功');
	    _this.log('Token: '+_this.token);

	    //WebSocketに接続開始
	    _this.client.connect('ws://localhost:3000/cable');
	    _this.callback = callback;

	}else{
	    _this.log('ログイン失敗: '+body['status']+" "+body['message']);
	}
    })
}

//購読手続き
Client.prototype.subscribe = function(callback){
    
    var _this = this;
    
    //0.5秒後に購読開始
    setTimeout(function(){
	
	//購読のリクエスト
	_this.log('Subscribeのリクエスト');
	_this.connection.sendUTF(_this._subscribe());

	callback();
	
    }, 500);
}

//認証手続き
Client.prototype.auth = function(callback){
    
    var _this = this;
    
    //0.5秒後にユーザー認証を行う
    setTimeout(function(){
	
	//Tokenを送信
	_this.log('Tokenを使用したユーザー認証');
	_this.connection.sendUTF(_this._auth());
	_this.callback = callback;
	
    }, 500);
}

//動作する
Client.prototype.moveLoop = function(x, y, pos_x, pos_y){
    
    var _this = this;
    
    //動作をサーバーに伝える
    this.connection.sendUTF(this._move(x, y, pos_x, pos_y));
    
    //定期的に再び動く
    setTimeout(function(){
	
	//適当に少しずつ動く
	_this.moveLoop(x+(Math.random()-0.5), y+(Math.random()-0.5), x, y);
	
    }, Math.random()*1000);
}

//一連の作業を行う
Client.prototype.run = function(){

    var _this = this;

    var moveLoop = function(){
	_this.moveLoop(0, 0, 0, 0);
    }

    var auth = function(){
	_this.auth(moveLoop);
    }

    var subscribe = function(){
	_this.subscribe(auth);
    }

    var create = function(){
	_this.create(subscribe);
    }

    create();
}

module.exports = Client;
