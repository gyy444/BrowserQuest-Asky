#!/usr/bin/env node

var Log = require('log'),
    log = new Log(Log.DEBUG),
    redis = require("redis"),
    client = redis.createClient(null, null, {socket_nodelay: true});

var curTime = new Date().getTime();
var count = 0;

client.zrange("ranking", 0, -1, function(error, rankers){
  var i=0;
  for(i=0; i<rankers.length; i++){
    log.info("" + rankers[i]);
    getIps(rankers[i]);
  }
});

var getIps = function(ranker){
    client.smembers("u:" + ranker + ":ip", function(err, ips){
      var multi = client.multi();
      var j=0;
      for(j=0; j<ips.length; j++){
        multi.hget("b:" + ips[j], "loginTime");
      }
      multi.exec(function(err, loginTimes){
        var k=0;
        var recentLoginTime = 0;
        for(k=0; k<loginTimes.length; k++){
          if(parseInt(loginTimes[k]) > recentLoginTime){
            recentLoginTime = parseInt(loginTimes[k]);
          }
        }
        if(recentLoginTime + 30*24*60*60*1000 < curTime){
          log.info("" + (++count) + " " + ranker + ": " + new Date(recentLoginTime));
          client.zrem("ranking", ranker);
        }
      });
    });
};
