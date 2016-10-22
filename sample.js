
//クライアントの動作を再現するサンプルスクリプト
//接続後はただランダムに動く

var Client = require('./client');

var client = new Client(0);
client.run();

/*
var run = function(id){

    if(id === 5)
	return;

    var client = new Client(id);

    client.run();

    setTimeout(function(){
	run(id+1);
    }, 1000);
}

run(1);
*/
