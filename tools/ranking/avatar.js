#!/usr/bin/env node

var Log = require('log'),
    log = new Log(Log.DEBUG),
    redis = require("redis"),
    client = redis.createClient(null, null, {socket_nodelay: true});

client.smembers("usr", function(error, users){
  var i=0;
  var multi = client.multi();

  for(i=0; i<users.length; i++){
    multi.hget("u:" + users[i], "armor");
  }
  multi.exec(function(err, armors){
    var j=0;
    var multi2 = client.multi();

    for(j=0; j<users.length; j++){
      multi2.hget("u:" + users[j], "avatar");
    }
    multi2.exec(function(err, avatars){
      var k=0;
      for(k=0; k<users.length; k++){
        if(armors[k] === avatars[k]){
          client.hdel("u:" + users[k], "avatar");
        }
      }
      log.debug("The End");
    });
  });
});
