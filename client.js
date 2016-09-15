
//クライアントオブジェクト
Client = function(id){

    //WebScoketモジュールの読み込み
    var WebSocket = require('websocket').client;

    //ログインに利用するrequestモジュールの読み込み
    this.request = require('request');

    //thisを再定義
    var _this = this;

    //User ID
    this.id = id;
    
    //ログを書き込むためのfsモジュールの読み込み
    this.fs = require('fs');
    //空のログファイル作成
    this.fs.writeFileSync("./logs/"+this.id+".log", "");

    //WebSocket用クライアント
    this.client = new WebSocket();
    
    //ログインするときに送信する情報
    this.options = {
	url: 'http://localhost:3000/users/1/login',
	method: 'POST',
	headers: {'Content-Type': 'application/json'},
	json: true,
	form: {/*ここにパスワードを入れる(未実装)*/}
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
		    
		    _this.log(u['user']['name']+' is now at (x: '+x+', y: '+y+')');
		}
	});

	_this.callback();

    });
}

Client.prototype.log = function(msg){

    //stdoutにログを出力
    //console.log("[Client Log] "+msg);

    var _this = this;

    this.fs.appendFileSync('./logs/'+this.id+".log", msg+"\n");
}

Client.prototype._channel = function(){

    res = {};
    res['channel'] = 'DungeonChannel';

    return JSON.stringify(res);
}

Client.prototype._subscribe = function(){

    command = {};
    command['command'] = 'subscribe';
    command['identifier'] = this._channel();

    return JSON.stringify(command);
}

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

Client.prototype._move = function(x, y){

    data = {};
    data['action'] = 'move';
    data['x'] = x;
    data['y'] = y;

    command = {};
    command['command'] = 'message';
    command['identifier'] = this._channel();
    command['data'] = JSON.stringify(data);

    return JSON.stringify(command);
}

Client.prototype.login = function(callback){

    var _this = this;

    this.request(this.options, function(error, response, body){
	
	if(body['status'] == 200){

	    _this.token = body['user']['token'];

	    _this.log('ログイン成功');
	    _this.log('Token: '+_this.token);

	    //WebSocketに接続開始
	    _this.client.connect('ws://localhost:3000/cable');
	    _this.callback = callback;

	}else{
	    _this.log('ログイン失敗');
	}
    })
}

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

Client.prototype.moveLoop = function(x, y){
    
    var _this = this;
    
    //動作をサーバーに伝える
    this.connection.sendUTF(this._move(x, y));
    
    //0.01秒後に再び送る
    setTimeout(function(){
	
	//適当に少しずつ動く
	_this.moveLoop(x+(Math.random()-0.5), y+(Math.random()-0.5));
	
    }, 10);
}

Client.prototype.run = function(){

    var _this = this;

    var moveLoop = function(){
	_this.moveLoop(0, 0);
    }

    var auth = function(){
	_this.auth(moveLoop);
    }

    var subscribe = function(){
	_this.subscribe(auth);
    }

    var login = function(){
	_this.login(subscribe);
    }

    login();
}

module.exports = Client;
