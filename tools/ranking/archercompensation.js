#!/usr/bin/env node

var Log = require('log'),
    log = new Log(Log.DEBUG),
    redis = require("redis"),
    client = redis.createClient(null, null, {socket_nodelay: true});

client.smembers("usr", function(error, users){
  var i=0;
  var multi = client.multi();

  for(i=0; i<users.length; i++){
    multi.hget("u:" + users[i], "kind");
  }
  multi.exec(function(err, kinds){
    var j=0;
    for(j=0; j<users.length; j++){
      if(kinds[j] === "222"){
        log.info(users[j]);
        client.zincrby("adrank", 10, users[j]);
      }
    }
    log.info("The End");
  });
});
