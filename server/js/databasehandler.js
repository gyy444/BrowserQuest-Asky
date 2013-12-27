
var cls = require("./lib/class"),
    Player = require('./player'),
    Messages = require("./message"),
    redis = require("redis"),
    client = redis.createClient(null, null, {socket_nodelay: true});

module.exports = DatabaseHandler = cls.Class.extend({
  init: function(){
  },
  loadPlayer: function(player, isJoin, callback){
    var self = this;
    var userKey = "u:" + player.name;
    var curTime = new Date().getTime();
    if(isJoin === 0){
      client.multi()
      .hget(userKey, "pw") // 0
      .hget("b:" + player.connection._connection.remoteAddress, "time") // 1
      .hget("b:" + player.connection._connection.remoteAddress, "banUseTime") // 2
      .hget("b:" + player.connection._connection.remoteAddress, "loginTime") // 3
      .hget("cb:" + player.connection._connection.remoteAddress, "etime") // 4
      .hget("cb:" + player.connection._connection.remoteAddress, "count") // 5
      .sismember("adminname", player.name)         // 6
      .hget(userKey, "kind")                       // 7
      .hget(userKey, "x")                          // 8
      .hget(userKey, "y")                          // 9
      .hget(userKey, "exp")                        // 10
      .zrevrank("ranking", player.name)            // 11
      .hget(userKey, "parent")                     // 12
      .hget(userKey, "armor")                      // 13
      .hget(userKey, "armorEnchantedPoint")        // 14
      .hget(userKey, "armorkillKind")              // 15
      .hget(userKey, "armorSkillLevel")            // 16
      .hget(userKey, "avatar")                     // 17
      .hget(userKey, "avatarEnchantedPoint")       // 18
      .hget(userKey, "avatarkillKind")             // 19
      .hget(userKey, "avatarSkillLevel")           // 20
      .hget(userKey, "weapon")                     // 21
      .hget(userKey, "weaponEnchantedPoint")       // 22
      .hget(userKey, "weaponSkillKind")            // 23
      .hget(userKey, "weaponSkillLevel")           // 24
      .hget(userKey, "weaponAvatar")               // 25
      .hget(userKey, "weaponAvatarEnchantedPoint") // 26
      .hget(userKey, "weaponAvatarSkillKind")      // 27
      .hget(userKey, "weaponAvatarSkillLevel")     // 28
      .hget(userKey, "pendant")                    // 29
      .hget(userKey, "pendantEnchantedPoint")      // 30
      .hget(userKey, "pendantSkillKind")           // 31
      .hget(userKey, "pendantSkillLevel")          // 32
      .hget(userKey, "ring")                       // 33
      .hget(userKey, "ringEnchantedPoint")         // 34
      .hget(userKey, "ringSkillKind")              // 35
      .hget(userKey, "ringSkillLevel")             // 36
      .hget(userKey, "boots")                      // 37
      .hget(userKey, "bootsEnchantedPoint")        // 38
      .hget(userKey, "bootsSkillKind")             // 39
      .hget(userKey, "bootsSkillLevel")            // 40
      .exec(function(err, replies){
        var pw = replies[0];
        var bannedTime = Utils.NaN2Zero(replies[1]);
        var banUseTime = Utils.NaN2Zero(replies[2]);
        var lastLoginTime = Utils.NaN2Zero(replies[3]);
        var chatBanEndTime = Utils.NaN2Zero(replies[4]);
        var chatBanCount = Utils.NaN2Zero(replies[5]);
        var isAdmin = replies[6];
        var kind = Utils.NaN2Zero(replies[7]) === 222 ? Types.Entities.ARCHER : Types.Entities.WARRIOR;
        var x = Utils.NaN2Zero(replies[8]);
        var y = Utils.NaN2Zero(replies[9]);
        var exp = Utils.NaN2Zero(replies[10]);
        var rank = isNaN(parseInt(replies[11])) ? 999999 : parseInt(replies[11]);
        var parentName = replies[12];
        var armor = replies[13];
        var armorEnchantedPoint = Utils.NaN2Zero(replies[14]);
        var armorSkillKind = Utils.NaN2Zero(replies[15]);
        var armorSkillLevel = Utils.NaN2Zero(replies[16]);
        var avatar = replies[17];
        var avatarEnchantedPoint = Utils.NaN2Zero(replies[18]);
        var avatarSkillKind = Utils.NaN2Zero(replies[19]);
        var avatarSkillLevel = Utils.NaN2Zero(replies[20]);
        var weapon = replies[21];
        var weaponEnchantedPoint = Utils.NaN2Zero(replies[22]);
        var weaponSkillKind = Utils.NaN2Zero(replies[23]);
        var weaponSkillLevel = Utils.NaN2Zero(replies[24]);
        var weaponAvatar = replies[25];
        var weaponAvatarEnchantedPoint = Utils.NaN2Zero(replies[26]);
        var weaponAvatarSkillKind = Utils.NaN2Zero(replies[27]);
        var weaponAvatarSkillLevel = Utils.NaN2Zero(replies[28]);
        var pendant = replies[29];
        var pendantEnchantedPoint = Utils.NaN2Zero(replies[30]);
        var pendantSkillKind = Utils.NaN2Zero(replies[31]);
        var pendantSkillLevel = Utils.NaN2Zero(replies[32]);
        var ring = replies[33];
        var ringEnchantedPoint = Utils.NaN2Zero(replies[34]);
        var ringSkillKind = Utils.NaN2Zero(replies[35]);
        var ringSkillLevel = Utils.NaN2Zero(replies[36]);
        var boots = replies[37];
        var bootsEnchantedPoint = Utils.NaN2Zero(replies[38]);
        var bootsSkillKind = Utils.NaN2Zero(replies[39]);
        var bootsSkillLevel = Utils.NaN2Zero(replies[40]);

        // Check Password
        if(!player.isRightPassword(pw, player.pw)){
          player.connection.sendUTF8("wrongpw");
          player.connection.close("Wrong Password: " + player.name);
          return;
        }

        if(parentName){
          client.hget("u:" + parentName, "lastIp", function(err, parentIp){
            if(parentIp === player.connection._connection.remoteAddress){
              client.multi()
              .hdel("u:" + player.name, "parent")
              .srem("u:" + parentName + ":children", player.name)
              .exec();
            }
          });
        }

        var d = new Date();
        var lastLoginTimeDate = new Date(lastLoginTime);

        // Check Ban
        d.setDate(d.getDate() - d.getDay());
        d.setHours(0, 0, 0);
        if(lastLoginTime < d.getTime()){
          log.info(player.name + "ban is initialized.");
          bannedTime = 0;
          client.hset("b:" + player.connection._connection.remoteAddress, "time", bannedTime);
        }
        client.hset("b:" + player.connection._connection.remoteAddress, "loginTime", curTime);

        client.sadd(userKey + ":ip", player.connection._connection.remoteAddress);
        client.hset(userKey, "lastIp", player.connection._connection.remoteAddress);
        client.hset(userKey, "lastLoginTime", curTime);
        client.sadd("ip:" + player.connection._connection.remoteAddress, player.name);
        log.info("Player name: " + player.name);
        log.debug("pendantSkillLevel: " + pendantSkillLevel);

        callback(isAdmin, kind, x, y, exp, rank,
                 armor, armorEnchantedPoint, armorSkillKind, armorSkillLevel,
                 avatar, avatarEnchantedPoint, avatarSkillKind, avatarSkillLevel,
                 weapon, weaponEnchantedPoint, weaponSkillKind, weaponSkillLevel,
                 weaponAvatar, weaponAvatarEnchantedPoint, weaponAvatarSkillKind, weaponAvatarSkillLevel,
                 ring, ringEnchantedPoint, ringSkillKind, ringSkillLevel,
                 pendant, pendantEnchantedPoint, pendantSkillKind, pendantSkillLevel,
                 boots, bootsEnchantedPoint, bootsSkillKind, bootsSkillLevel,
                 bannedTime, banUseTime, chatBanEndTime, chatBanCount);
      }); 
    } else{
      client.sismember("usr", player.name, function(err, reply){
        if(reply === 1){
          player.connection.sendUTF8("alreadyExist");
          player.connection.close("Already Exist: " + player.name);
          return;
        }
        client.multi()
        .sadd("usr", player.name)
        .hset(userKey, "pw", player.passwordArray2String(player.pw))
        .hset(userKey, "email", player.email)
        .hset(userKey, "armor", "clotharmor")
        .hset(userKey, "weapon", "sword1")
        .hset(userKey, "exp", 0)
        .hset("b:" + player.connection._connection.remoteAddress, "loginTime", curTime)
        .exec(function(err, replies){
          log.info("New User: " + player.name);

          client.multi()
          .hget("pip:" + player.connection._connection.remoteAddress, "parent")
          .hget("pip:" + player.connection._connection.remoteAddress, "referer")
          .exec(function(err, replies){
            var parentName = replies[0];
            var referer = replies[1];
            log.debug("Parent Name: " + parentName);
            log.debug("Referer: " + referer);
            if(parentName && referer){
              client.multi()
              .hdel("pip:" + player.connection._connection.remoteAddress, "parent")
              .hdel("pip:" + player.connection._connection.remoteAddress, "referer")
              .hset("u:" + player.name, "parent", parentName)
              .sadd("u:" + parentName + ":adrefs", referer)
              .sadd("u:" + parentName + ":adref:" + referer, player.name)
              .exec();
            }
          });

          callback(0, Types.Entities.WARRIOR, player.x, player.y, 0, 999999,
                   "clotharmor", 0, 0, 0,
                   null, 0, 0, 0,
                   "sword1", 0, 0, 0,
                   null, 0, 0, 0,
                   null, 0, 0, 0,
                   null, 0, 0, 0,
                   null, 0, 0, 0,
                   0, 0, 0, 0);
        });
      });
    }
  },
  getCharacterByIp: function(ip, callback){
    client.smembers("ip:" + ip, function(err, names){
      var i=0;
      var multi = client.multi();

      for(i=0; i<names.length; i++){
        multi.hget("u:" + names[i], "lastLoginTime");
      }
      multi.exec(function(err, lastLoginTimes){
        callback(names, lastLoginTimes);
      });
    });
  },
  getLastIp: function(playerName, callback){
    client.hget("u:" + playerName, "lastIp", function(err, ip){
      callback(ip);
    });
  },
  getAllInventory: function(player, callback){
    var userKey = "u:" + player.name;
    client.hget(userKey, "maxInventoryNumber", function(err, maxInventoryNumber){
      maxInventoryNumber = Utils.NaN2Zero(maxInventoryNumber) === 0 ? 5 : Utils.NaN2Zero(maxInventoryNumber);

      var i=0;
      var multi = client.multi();
      for(i=0; i<maxInventoryNumber; i++){
        multi.hget(userKey, "inventory"+i);
        multi.hget(userKey, "inventory" + i + ":number");
        multi.hget(userKey, "inventory" + i + ":skillKind");
        multi.hget(userKey, "inventory" + i + ":skillLevel");
      }
      multi.exec(function(err, data){
        var i=0;
        var itemKinds = [];
        var itemNumbers = [];
        var itemSkillKinds = [];
        var itemSkillLevels = [];
        for(i=0; i<maxInventoryNumber; i++){
          itemKinds.push(Types.getKindFromString(data.shift()));
          itemNumbers.push(Utils.NaN2Zero(data.shift()));
          itemSkillKinds.push(Utils.NaN2Zero(data.shift()));
          itemSkillLevels.push(Utils.NaN2Zero(data.shift()));
        }
        callback(maxInventoryNumber, itemKinds, itemNumbers, itemSkillKinds, itemSkillLevels);
      });
    });
  },
  newCharacter: function(player, name, pw, email){
    client.sismember("usr", name, function(err, reply){
      if(parseInt(reply) === 1){
        player.server.pushToPlayer(player, new Messages.Notify(name + "은 이미 존재하는 닉네임입니다."));
      } else{
        client.zscore("adrank", player.name, function(err, point){
          var userKey = "u:" + player.name;
          var pubPoint = Utils.NaN2Zero(point);
          log.info(player.name + ' pubPoint: ' + pubPoint);
          if(pubPoint >= 90){
            client.zincrby("adrank", -90, player.name);

            var userKey = "u:" + name;
            var multi = client.multi();
            multi.sadd("usr", name);
            multi.hset(userKey, "pw", player.passwordArray2String(pw));
            multi.hset(userKey, "email", email);
            multi.hset(userKey, "armor", "archerarmor");
            multi.hset(userKey, "weapon", "woodenbow");
            multi.hset(userKey, "exp", 0);
            multi.hset(userKey, "kind", Types.Entities.ARCHER);
            multi.hset("b:" + player.connection._connection.remoteAddress, "loginTime",new Date().getTime());
            multi.exec();

            player.server.pushToPlayer(player, new Messages.Notify("궁수 캐릭터 " + name + "가 성공적으로 생성되었습니다. 재접해서 로그인하실 수 있습니다."));
          } else{
            player.server.pushToPlayer(player, new Messages.Notify("홍보포인트가 모자릅니다."));
          }
        });
      }
    });
  },
  changePassword: function(player, curpw, newpw, email){
    var userKey = "u:" + player.name;
    client.multi()
    .hget(userKey, "pw")
    .hget(userKey, "email")
    .exec(function(err, curpwEmail){
      var curDatabasePw = curpwEmail[0];
      var curDatabaseEmail = curpwEmail[1];

      if(!player.isRightPassword(curDatabasePw, curpw)){
        player.server.pushToPlayer(player, new Messages.Notify("비밀번호가 틀렸습니다."));
        return;
      } else if(curDatabaseEmail !== email){
        log.info("curDatabaseEmail: " + curDatabaseEmail);
        log.info("email: " + email);
        player.server.pushToPlayer(player, new Messages.Notify("이메일 주소가 틀렸습니다."));
        return;
      }

      client.hset(userKey, "pw", player.passwordArray2String(newpw), function(err, reply){
        player.server.pushToPlayer(player, new Messages.Notify("비밀번호가 성공적으로 변경되었습니다."));
      });
    });
  },
  loadQuest: function(player, callback){
    var userKey = "u:" + player.name;
    var multi = client.multi();
    var i=0;
    for(i=0; i<Types.Quest.TOTAL_QUEST_NUMBER; i++){
      multi.hget(userKey, "achievement" + (i+1) + ":found");
      multi.hget(userKey, "achievement" + (i+1) + ":progress");
    }
    for(i=0; i<4; i++){
      multi.hget(userKey, "dailyQuest" + (i+1) + ":found");
      multi.hget(userKey, "dailyQuest" + (i+1) + ":progress");
      multi.hget(userKey, "dailyQuest" + (i+1) + ":foundTime");
    }
    multi.exec(function(err, replies){
      var i=0;
      var dFound, dProgress, foundTime;

      for(i=0; i<Types.Quest.TOTAL_QUEST_NUMBER; i++){
        dFound = Utils.trueFalse(replies.shift());
        dProgress = Utils.NaN2Zero(replies.shift());

        player.achievement[i+1] = {
          found: dFound,
          progress: dProgress,
        };
      }

      for(i=0; i<4; i++){
        dFound = Utils.trueFalse(replies.shift());
        dProgress = Utils.NaN2Zero(replies.shift());
        foundTime = Utils.NaN2Zero(replies.shift());

        if((new Date(foundTime)).getDate() !== (new Date()).getDate()){
          dFound = false;
          dProgress = 0;
          client.hset(userKey, "dailyQuest" + (i+1) + ":found", "false");
          client.hset(userKey, "dailyQuest" + (i+1) + ":progress", 0);
        }

        player.achievement[i+101] = {
          found: dFound,
          progress: dProgress,
          foundTime: foundTime,
        }
      }
      callback();
    });
  },
  loadSkillSlots: function(player, callback) {
    var userKey = "u:" + player.name,
        multi = client.multi();

    for(var index = 0; index < 5; index++) {
      multi.hget(userKey, "skillSlot" + index);
    }
    multi.exec(function(err, replies) {
      if(callback) {
        callback(replies);
      }
    });
  },
  checkBan: function(player){
    client.sismember("ipban", player.connection._connection.remoteAddress, function(err, reply){
      if(parseInt(reply) === 1){
        client.multi()
        .hget("b:" + player.connection._connection.remoteAddress, "rtime")
        .hget("b:" + player.connection._connection.remoteAddress, "time")
        .exec(function(err, replies){
          var curTime = new Date();
          var banEndTime = new Date(replies[0]*1);
          log.info("curTime: " + curTime.toString());
          log.info("banEndTime: " + banEndTime.toString());
          if(banEndTime.getTime() > curTime.getTime()){
            player.connection.sendUTF8("ban");
            player.connection.close("IP Banned player: " + player.name + " " + player.connection._connection.remoteAddress);
          }
        });
        return;
      }
    });
    client.hget("u:" + player.name, "banEndTime", function(err, reply){
      var curTime = new Date().getTime();
      var banEndTime = Utils.NaN2Zero(reply);
      if(banEndTime > curTime){
        player.connection.sendUTF8("ban");
        player.connection.close("Character Banned player: " + player.name + " " + player.connection._connection.remoteAddress);
      }
    });
  },
  delCharacterBan: function(banPlayerName){
    client.hdel("u:" + banPlayerName, "banEndTime");
  },
  characterBan: function(banPlayerName, days){
    var banEndTime = new Date().getTime() + days*24*60*60*1000;
    client.hset("u:" + banPlayerName, "banEndTime", banEndTime);
  },
  banPlayer: function(adminPlayer, banPlayerName, days){
    client.sismember("usr", banPlayerName, function(err, reply){
      if(parseInt(reply) === 1){
        client.hget("u:" + banPlayerName, "lastIp", function(err, lastIp){
          var curTime = (new Date()).getTime();
          var banPlayer = adminPlayer.server.getPlayerByName(banPlayerName);
          client.sadd("ipban", lastIp);
          adminPlayer.server.pushBroadcast(new Messages.Chat(adminPlayer, "/1 " + adminPlayer.name + "-- IP밴 ->" + banPlayerName + " " + days + "일"));
          if(banPlayer){
            setTimeout( function(){ banPlayer.connection.close("Added IP Banned player: " + banPlayer.name + " " + banPlayer.connection._connection.remoteAddress); }, 30000);
          }
          client.hset("b:" + lastIp, "rtime", (curTime+(days*24*60*60*1000)).toString());
          log.info(adminPlayer.name + "-- BAN ->" + banPlayerName + " to " + (new Date(curTime+(days*24*60*60*1000)).toString()));
        });
      } else{
        adminPlayer.server.pushToPlayer(adminPlayer, new Messages.Notify(banPlayerName + "란 플레이어는 존재하지 않습니다."));
      }
    });
  },
  chatBan: function(adminPlayer, targetPlayer, minutes) {
    var curTime = (new Date()).getTime();
    targetPlayer.chatBanCount++;
    client.hset("cb:" + targetPlayer.connection._connection.remoteAddress, "count", targetPlayer.chatBanCount);
    adminPlayer.server.pushBroadcast(new Messages.Chat(targetPlayer, "/1 " + adminPlayer.name + "-- " + targetPlayer.chatBanCount + " 번째 채금 ->" + targetPlayer.name + " " + minutes + "분"));
    targetPlayer.chatBanEndTime = curTime + (minutes * 60 * 1000);
    client.hset("cb:" + targetPlayer.connection._connection.remoteAddress, "etime", (targetPlayer.chatBanEndTime).toString());
    log.info(adminPlayer.name + "-- Chatting BAN ->" + targetPlayer.name + " to " + (new Date(targetPlayer.chatBanEndTime).toString()));
  },
  userBanPlayer: function(adminPlayer, banPlayer){
    if(adminPlayer.experience > 6410000){
      client.hget("b:" + adminPlayer.connection._connection.remoteAddress, "banUseTime", function(err, reply){
        var curTime = new Date();
        log.debug("curTime: " + curTime.getTime());
        log.debug("bannable Time: " + (reply*1) + 1000*60*60*24);
        if(curTime.getTime() > (reply*1) + 1000*60*60*24){
          banPlayer.bannedTime++;
          var banMsg = "" + adminPlayer.name + "-- 밴 ->" + banPlayer.name + " " + banPlayer.bannedTime + "번째 " + (Math.pow(2,(banPlayer.bannedTime))/2) + "분";
          client.sadd("ipban", banPlayer.connection._connection.remoteAddress);
          client.hset("b:" + banPlayer.connection._connection.remoteAddress, "rtime", (curTime.getTime()+(Math.pow(2,(banPlayer.bannedTime))*500*60)).toString());
          client.hset("b:" + banPlayer.connection._connection.remoteAddress, "time", banPlayer.bannedTime.toString());
          client.hset("b:" + adminPlayer.connection._connection.remoteAddress, "banUseTime", curTime.getTime().toString());
          setTimeout( function(){ banPlayer.connection.close("Added IP Banned player: " + banPlayer.name + " " + banPlayer.connection._connection.remoteAddress); }, 30000);
          adminPlayer.server.pushBroadcast(new Messages.Chat(banPlayer, "/1 " + banMsg));
          log.info(banMsg);
        }
        return;
      });
    }
  },
  equipArmor: function(name, armor, enchantedPoint, skillKind, skillLevel){
    log.info("Set Armor: " + name + " " + armor);
    client.hset("u:" + name, "armor", armor);
    client.hset("u:" + name, "armorEnchantedPoint", enchantedPoint);
    client.hset("u:" + name, "armorSkillKind", skillKind);
    client.hset("u:" + name, "armorSkillLevel", skillLevel);
  },
  equipAvatar: function(name, armor, enchantedPoint, skillKind, skillLevel){
    log.info("Set Avatar: " + name + " " + armor);
    client.hset("u:" + name, "avatar", armor);
    client.hset("u:" + name, "avatarEnchantedPoint", enchantedPoint);
    client.hset("u:" + name, "avatarSkillKind", skillKind);
    client.hset("u:" + name, "avatarSkillLevel", skillLevel);
  },
  equipWeapon: function(name, weapon, enchantedPoint, skillKind, skillLevel){
    log.info("Set Weapon: " + name + " " + weapon + " +" + enchantedPoint);
    client.hset("u:" + name, "weapon", weapon);
    client.hset("u:" + name, "weaponEnchantedPoint", enchantedPoint);
    client.hset("u:" + name, "weaponSkillKind", skillKind);
    client.hset("u:" + name, "weaponSkillLevel", skillLevel);
  },
  equipWeaponAvatar: function(name, weapon, enchantedPoint, skillKind, skillLevel){
    log.info("Set Weapon: " + name + " " + weapon + " +" + enchantedPoint);
    client.hset("u:" + name, "weaponAvatar", weapon);
    client.hset("u:" + name, "weaponAvatarEnchantedPoint", enchantedPoint);
    client.hset("u:" + name, "weaponAvatarSkillKind", skillKind);
    client.hset("u:" + name, "weaponAvatarSkillLevel", skillLevel);
  },
  takeOffAvatar: function(name){
    log.info("Take Off Avatar: " + name);
    client.hdel("u:" + name, "avatar");
    client.hdel("u:" + name, "avatarEnchantedPoint");
    client.hdel("u:" + name, "avatarSkillKind");
    client.hdel("u:" + name, "avatarSkillLevel");
  },
  takeOffWeaponAvatar: function(name){
    log.info("Take Off Weapon Avatar: " + name);
    client.hdel("u:" + name, "weaponAvatar");
    client.hdel("u:" + name, "weaponAvatarEnchantedPoint");
    client.hdel("u:" + name, "weaponAvatarSkillKind");
    client.hdel("u:" + name, "weaponAvatarSkillLevel");
  },
  enchantWeapon: function(name, enchantedPoint){
    log.info("Enchant Weapon: " + name + " " + enchantedPoint);
    client.hset("u:" + name, "weaponEnchantedPoint", enchantedPoint);
  },
  setWeaponSkill: function(name, skillKind, skillLevel){
    log.info("Set Weapon Skill Level: " + name + " " + skillLevel);
    client.hset("u:" + name, "weaponSkillKind", skillKind);
    client.hset("u:" + name, "weaponSkillLevel", skillLevel);
  },
  equipPendant: function(name, pendant, enchantedPoint, skillKind, skillLevel) {
    log.info("Set Pendant: " + name + " " + pendant + " " + skillKind + " " + skillLevel);
    client.hset("u:" + name, "pendant", pendant);
    client.hset("u:" + name, "pendantEnchantedPoint", enchantedPoint);
    client.hset("u:" + name, "pendantSkillKind", skillKind);
    client.hset("u:" + name, "pendantSkillLevel", skillLevel);
  },
  equipRing: function(name, ring, enchantedPoint, skillKind, skillLevel) {
    log.info("Set Ring: " + name + " " + ring + " " + skillKind + " " + skillLevel);
    client.hset("u:" + name, "ring", ring);
    client.hset("u:" + name, "ringEnchantedPoint", enchantedPoint);
    client.hset("u:" + name, "ringSkillKind", skillKind);
    client.hset("u:" + name, "ringSkillLevel", skillLevel);
  },
  enchantPendant: function(name, enchantedPoint){
    log.info("Enchant Pendant: " + name + " " + enchantedPoint);
    client.hset("u:" + name, "pendantEnchantedPoint", enchantedPoint);
  },
  enchantRing: function(name, enchantedPoint){
    log.info("Enchant Ring: " + name + " " + enchantedPoint);
    client.hset("u:" + name, "ringEnchantedPoint", enchantedPoint);
  },
  equipBoots: function(name, boots, enchantedPoint, skillKind, skillLevel) {
    log.info("Set Boots: " + name + " " + boots + " " + skillKind + " " + skillLevel); 
    client.hset("u:" + name, "boots", boots);
    client.hset("u:" + name, "bootsEnchantedPoint", enchantedPoint);
    client.hset("u:" + name, "bootsSkillKind", skillKind);
    client.hset("u:" + name, "bootsSkillLevel", skillLevel);
  },
  setExp: function(name, exp){
    log.info("Set Exp: " + name + " " + exp);
    client.hset("u:" + name, "exp", exp);
  },
  putBurgerOfflineUser: function(name, itemNumber, successCallback, failCallback){
    var i=0;
    var multi = client.multi();
    for(i=0; i<30; i++){
      multi.hget("u:" + name, "inventory"+i);
    }
    for(i=0; i<30; i++){
      multi.hget("u:" + name, "inventory"+i+":number");
    }
    multi.hget("u:" + name, "maxInventoryNumber");
    multi.exec(function(err, replies){
      log.info("putBurgerOfflineUser(" + name + ", " + itemNumber + ")");
      var i=0;
      var maxInventoryNumber = parseInt(replies[60]);
      if(isNaN(maxInventoryNumber) || maxInventoryNumber < 5){
        maxInventoryNumber = 5;
      }
      for(i=0; i<maxInventoryNumber; i++){
        if(replies[i] === "burger"){
          client.hset("u:" + name, "inventory" + i + ":number", parseInt(replies[i+30]) + itemNumber);
          if(successCallback){
            successCallback();
          }
          return;
        }
      }
      for(i=0; i<maxInventoryNumber; i++){
        if(replies[i]){
          continue;
        } else{
          client.multi()
          .hset("u:" + name, "inventory" + i, "burger")
          .hset("u:" + name, "inventory" + i + ":number", itemNumber)
          .exec();
          if(successCallback){
            successCallback();
          }
          return;
        }
      }
      if(failCallback){
        failCallback();
      }
    });
  },
  setInventory: function(player, inventoryNumber, itemKind, itemNumber, itemSkillKind, itemSkillLevel){
    if(itemKind){
      client.hset("u:" + player.name, "inventory" + inventoryNumber, Types.getKindAsString(itemKind));
      client.hset("u:" + player.name, "inventory" + inventoryNumber + ":number", itemNumber);
      client.hset("u:" + player.name, "inventory" + inventoryNumber + ":skillKind", itemSkillKind);
      client.hset("u:" + player.name, "inventory" + inventoryNumber + ":skillLevel", itemSkillLevel);
      player.server.pushToPlayer(player, new Messages.Inventory(inventoryNumber, itemKind, itemNumber, itemSkillKind, itemSkillLevel));
      log.info("SetInventory: " + player.name + ", "
             + Types.getKindAsString(itemKind) + ", "
             + inventoryNumber + ", "
             + itemNumber + ", "
             + itemSkillKind + ", "
             + itemSkillLevel);
    } else{
      this.makeEmptyInventory(player, inventoryNumber);
    }
    var i=0;
    for(i=0; i<player.maxInventoryNumber; i++){
      log.info("Inventory " + i + ": " + player.inventory.rooms[i].itemKind
               + " " + player.inventory.rooms[i].itemNumber
               + " " + player.inventory.rooms[i].itemSkillKind
               + " " + player.inventory.rooms[i].itemSkillLevel);
    }
  },
  makeEmptyInventory: function(player, number){
    log.info("Empty Inventory: " + player.name + " " + number);
    client.hdel("u:" + player.name, "inventory" + number);
    client.hdel("u:" + player.name, "inventory" + number + ":number");
    client.hdel("u:" + player.name, "inventory" + number + ":skillKind");
    client.hdel("u:" + player.name, "inventory" + number + ":skillLevel");
    player.send([Types.Messages.INVENTORY, number, null, 0]);
  },
  foundAchievement: function(name, number){
    log.info("Found Achievement: " + name + " " + number);
    if(number < 100){
      client.hset("u:" + name, "achievement" + number + ":found", "true");
    } else{
      client.hset("u:" + name, "dailyQuest" + (number-100) + ":found", "true");
      client.hset("u:" + name, "dailyQuest" + (number-100) + ":foundTime", (new Date()).getTime());
    }
  },
  progressAchievement: function(name, number, progress){
    log.info("Progress Achievement: " + name + " " + number + " " + progress);
    if(number < 100){
      client.hset("u:" + name, "achievement" + number + ":progress", progress);
    } else{
      client.hset("u:" + name, "dailyQuest" + (number-100) + ":progress", progress);
    }
  },
  setCheckpoint: function(name, x, y){
    log.info("Set Check Point: " + name + " " + x + " " + y);
    client.hset("u:" + name, "x", x);
    client.hset("u:" + name, "y", y);
  },
  viewBoard: function(player, number){
    client.multi()
    .hget('bo:free', number+':title')
    .hget('bo:free', number+':content')
    .hget('bo:free', number+':writer')
    .hincrby('bo:free', number+':cnt', 1)
    .smembers('bo:free:' + number + ':up')
    .smembers('bo:free:' + number + ':down')
    .hget('bo:free', number+':time')
    .exec(function(err, replies){
      var title = replies[0];
      var content = replies[1];
      var writer = replies[2];
      var counter = replies[3];
      var up = replies[4].length;
      var down = replies[5].length;
      var time = replies[6];
      player.send([Types.Messages.BOARD,
                   'view',
                   title,
                   content,
                   writer,
                   counter,
                   up,
                   down,
                   time]);
    });
  },
  viewReply: function(player, number, replyNumber){
    client.multi()
    .hget('bo:free', number+':reply:'+replyNumber+':writer')
    .hget('bo:free', number+':reply:'+replyNumber+':content')
    .smembers('bo:free:' + number+':reply:'+replyNumber+':up')
    .smembers('bo:free:' + number+':reply:'+replyNumber+':down')

    .hget('bo:free', number+':reply:'+(replyNumber+1)+':writer')
    .hget('bo:free', number+':reply:'+(replyNumber+1)+':content')
    .smembers('bo:free:' + number+':reply:'+(replyNumber+1)+':up')
    .smembers('bo:free:' + number+':reply:'+(replyNumber+1)+':down')

    .hget('bo:free', number+':reply:'+(replyNumber+2)+':writer')
    .hget('bo:free', number+':reply:'+(replyNumber+2)+':content')
    .smembers('bo:free:' + number+':reply:'+(replyNumber+2)+':up')
    .smembers('bo:free:' + number+':reply:'+(replyNumber+2)+':down')

    .hget('bo:free', number+':reply:'+(replyNumber+3)+':writer')
    .hget('bo:free', number+':reply:'+(replyNumber+3)+':content')
    .smembers('bo:free:' + number+':reply:'+(replyNumber+3)+':up')
    .smembers('bo:free:' + number+':reply:'+(replyNumber+3)+':down')

    .hget('bo:free', number+':reply:'+(replyNumber+4)+':writer')
    .hget('bo:free', number+':reply:'+(replyNumber+4)+':content')
    .smembers('bo:free:' + number+':reply:'+(replyNumber+4)+':up')
    .smembers('bo:free:' + number+':reply:'+(replyNumber+4)+':down')

    .exec(function(err, replies){
      player.send([Types.Messages.BOARD,
                   'reply',
                    replies[0],  replies[1],  replies[2].length, replies[3].length,
                    replies[4],  replies[5],  replies[6].length, replies[7].length,
                    replies[8],  replies[9],  replies[10].length, replies[11].length,
                    replies[12], replies[13], replies[14].length, replies[15].length,
                    replies[16], replies[17], replies[18].length, replies[19].length]);
    });
  },
  contentUp: function(player, number){
    if(player.level >= 50){
      client.sadd('bo:free:' + number + ':up', player.name);
    }
  },
  contentDown: function(player, number){
    if(player.level >= 50){
      client.sadd('bo:free:' + number + ':down', player.name);
    }
  },
  replyUp: function(player, number, replyNumber){
    if(player.level >= 50){
      client.sadd('bo:free:'+number+':reply:'+replyNumber+':up', player.name);
    }
  },
  replyDown: function(player, number, replyNumber){
    if(player.level >= 50){
      client.sadd('bo:free:'+number+':reply:'+replyNumber+':down', player.name);
    }
  },
  viewList: function(player, number){
    client.hget('bo:free', 'lastnum', function(err, reply){
      var lastnum = reply;
      if(number > 0){
        lastnum = number;
      }
      client.multi()
      .hget('bo:free', lastnum +':title')
      .hget('bo:free', (lastnum-1) +':title')
      .hget('bo:free', (lastnum-2) +':title')
      .hget('bo:free', (lastnum-3) +':title')
      .hget('bo:free', (lastnum-4) +':title')
      .hget('bo:free', (lastnum-5) +':title')
      .hget('bo:free', (lastnum-6) +':title')
      .hget('bo:free', (lastnum-7) +':title')
      .hget('bo:free', (lastnum-8) +':title')
      .hget('bo:free', (lastnum-9) +':title')

      .hget('bo:free', lastnum +':writer')
      .hget('bo:free', (lastnum-1) +':writer')
      .hget('bo:free', (lastnum-2) +':writer')
      .hget('bo:free', (lastnum-3) +':writer')
      .hget('bo:free', (lastnum-4) +':writer')
      .hget('bo:free', (lastnum-5) +':writer')
      .hget('bo:free', (lastnum-6) +':writer')
      .hget('bo:free', (lastnum-7) +':writer')
      .hget('bo:free', (lastnum-8) +':writer')
      .hget('bo:free', (lastnum-9) +':writer')

      .hget('bo:free', lastnum +':cnt')
      .hget('bo:free', (lastnum-1) +':cnt')
      .hget('bo:free', (lastnum-2) +':cnt')
      .hget('bo:free', (lastnum-3) +':cnt')
      .hget('bo:free', (lastnum-4) +':cnt')
      .hget('bo:free', (lastnum-5) +':cnt')
      .hget('bo:free', (lastnum-6) +':cnt')
      .hget('bo:free', (lastnum-7) +':cnt')
      .hget('bo:free', (lastnum-8) +':cnt')
      .hget('bo:free', (lastnum-9) +':cnt')

      .smembers('bo:free:' + lastnum + ':up')
      .smembers('bo:free:' + (lastnum-1) + ':up')
      .smembers('bo:free:' + (lastnum-2) + ':up')
      .smembers('bo:free:' + (lastnum-3) + ':up')
      .smembers('bo:free:' + (lastnum-4) + ':up')
      .smembers('bo:free:' + (lastnum-5) + ':up')
      .smembers('bo:free:' + (lastnum-6) + ':up')
      .smembers('bo:free:' + (lastnum-7) + ':up')
      .smembers('bo:free:' + (lastnum-8) + ':up')
      .smembers('bo:free:' + (lastnum-9) + ':up')

      .smembers('bo:free:' + lastnum + ':down')
      .smembers('bo:free:' + (lastnum-1) + ':down')
      .smembers('bo:free:' + (lastnum-2) + ':down')
      .smembers('bo:free:' + (lastnum-3) + ':down')
      .smembers('bo:free:' + (lastnum-4) + ':down')
      .smembers('bo:free:' + (lastnum-5) + ':down')
      .smembers('bo:free:' + (lastnum-6) + ':down')
      .smembers('bo:free:' + (lastnum-7) + ':down')
      .smembers('bo:free:' + (lastnum-8) + ':down')
      .smembers('bo:free:' + (lastnum-9) + ':down')

      .hget('bo:free', lastnum + ':replynum')
      .hget('bo:free', (lastnum+1) + ':replynum')
      .hget('bo:free', (lastnum+2) + ':replynum')
      .hget('bo:free', (lastnum+3) + ':replynum')
      .hget('bo:free', (lastnum+4) + ':replynum')
      .hget('bo:free', (lastnum+5) + ':replynum')
      .hget('bo:free', (lastnum+6) + ':replynum')
      .hget('bo:free', (lastnum+7) + ':replynum')
      .hget('bo:free', (lastnum+8) + ':replynum')
      .hget('bo:free', (lastnum+9) + ':replynum')

      .exec(function(err, replies){
        var i=0;
        var msg = [Types.Messages.BOARD, 'list', lastnum];

        for(i=0; i<30; i++){
          msg.push(replies[i]);
        }
        for(i=30; i<50; i++){
          msg.push(replies[i].length);
        }
        for(i=50; i<60; i++){
          msg.push(replies[i]);
        }

        player.send(msg);
      });
    });
  },
  vote: function(player, number, voteId){
    if(player.level >= 100){
      client.hget('bo:free:'+number+':vote', 'startTime', function(err, startTime){
        startTime = parseInt(startTime);
        if(startTime){
          var curTime = new Date().getTime();
          if(curTime > startTime + 1000*60*60*24){
            player.send([Types.Messages.BOARD, 'view',
                        '투표 시간이 종료되었습니다.',
                        '종료 시각: ' + new Date(startTime+1000*60*60*24).toLocaleString(),
                        '', '', 0, 0, 0]);
            return;
          }
        } else{
          client.hset('bo:free:'+number+':vote', 'startTime', (new Date().getTime()));
        }
        client.sadd('bo:free:'+number+':votedName', player.name, function(err, reply){
          if(reply === 1){
            client.smembers('bo:free:'+number+':votedIp', function(err, votedIps){
              client.smembers('u:' + player.name + ":ip", function(err, playerIps){
                var i=0, j=0;
                for(i=0; i<playerIps.length; i++){
                  client.sadd('bo:free:'+number+':votedIp', playerIps[i]);
                }
                for(i=0; i<votedIps.length; i++){
                  for(j=0; j<playerIps.length; j++){
                    if(votedIps[i] === playerIps[j]){
                      log.info("vote manipulation name: " + player.name);
                      log.info("vote manipulation ip: " + playerIps);
                      player.send([Types.Messages.BOARD, 'view',
                                  '투표 조작이 의심되어 처리되지 않았습니다.',
                                  '투표 조작이 의심되어 처리되지 않았습니다.',
                                  '', '', 0, 0, 0]);
                      return;
                    }
                  }
                }
                client.sadd('bo:free:'+number+':vote:id', voteId);
                client.sadd('bo:free:'+number+':vote:'+voteId, player.name);
                client.zincrby('bo:free:'+number+':vote:list', 1, voteId);
                player.send([Types.Messages.BOARD, 'view',
                             '정상적으로 투표가 완료되었습니다.',
                             '정상적으로 투표가 완료되었습니다.',
                             '', '', 0, 0, 0]);
              });
            });
          } else{
            player.send([Types.Messages.BOARD, 'view',
                         '이미 투표하셨습니다.',
                         '이미 투표하셨습니다.',
                         '', '', 0, 0, 0]);
          }
        });
      });
    } else{
      player.send([Types.Messages.BOARD, 'view',
                   '레벨 100이상만 투표하실 수 있습니다.',
                   '레벨 100이상만 투표하실 수 있습니다.',
                   '', '', 0, 0, 0]);
    }
  },
  voteResult: function(player, number){
    var self = this;
    client.hget('bo:free:'+number+':vote', 'startTime', function(err, startTime){
      startTime = parseInt(startTime);
      if(startTime){
        client.zrange('bo:free:'+number+':vote:list', 0, -1, function(err, list){
          self._voteResult(player, number, list, '', startTime);
        });
        return;
      }
      player.send([Types.Messages.BOARD, 'view',
                  '투표가 아직 시작되지 않았습니다.',
                  '투표가 아직 시작되지 않았습니다.',
                  '', '', 0, 0, 0]);
    });
  },
  _voteResult: function(player, number, list, result, startTime){
    var self = this;
    var name = list.pop();
    if(name){
      client.zscore('bo:free:'+number+':vote:list', name, function(err, score){
        result += name + ': ' + score + '<br>';
        self._voteResult(player, number, list, result, startTime);
      });
    } else{
      player.send([Types.Messages.BOARD, 'view',
                  '투표 결과',
                  result + '<br>종료 시각: ' + new Date(startTime+1000*60*60*24).toLocaleString(),
                  '', '', 0, 0, 0]);
    }
  },
  writeBoard: function(player, title, content){
    log.info("Write Board: " + player.name + " " + title);
    client.hincrby('bo:free', 'lastnum', 1, function(err, reply){
      var curTime = new Date().getTime();
      var number = reply ? reply : 1;
      client.multi()
      .hset('bo:free', number+':title', title)
      .hset('bo:free', number+':content', content)
      .hset('bo:free', number+':writer', player.name)
      .hset('bo:free', number+':time', curTime)
      .exec();
      player.send([Types.Messages.BOARD,
                   'view',
                   title,
                   content,
                   player.name,
                   0,
                   0,
                   0,
                   curTime]);
    });
  },
  writeReply: function(player, content, number){
    log.info("Write Reply: " + player.name + " " + content + " " + number);
    var self = this;
    client.hincrby('bo:free', number + ':replynum', 1, function(err, reply){
      var replyNum = reply ? reply : 1;
      client.multi()
      .hset('bo:free', number+':reply:'+replyNum+':content', content)
      .hset('bo:free', number+':reply:'+replyNum+':writer', player.name)
      .exec(function(err, replies){
        player.send([Types.Messages.BOARD,
                     'reply',
                     player.name,
                     content]);
      });
    });
  },
  pushKungWord: function(player, word){
    var server = player.server;

    if(!server.checkKungPlayer(player)){ return; }
    if(server.isAlreadyKung(word, player)){ return; }
    if(!server.isRightKungWord(word, player)){ return; }

    if(server.kungWords.length === 0){
      client.srandmember('dic', function(err, reply){
        var randWord = reply;
        server.pushKungWord(player, randWord);
      });
    } else{
      client.sismember('dic', word, function(err, reply){
        if(reply === 1){
          server.pushKungWord(player, word);
        } else{
          player.server.pushToPlayer(player, new Messages.Notify(word + "는 사전에 없습니다."));
        }
      });
    }
  },
  getState: function(player){
    client.multi()
    .zscore("adrank", player.name)
    .zrevrangebyscore(['adhold:' + player.name, '+inf', '-inf', 'WITHSCORES'])
    .exec(function(err, oldData){
      client.smembers("u:" + player.name + ":adrefs", function(err, newData){
        client.smembers("u:" + player.name + ":children", function(err, children){
          var i=0;
          var multi = client.multi();
          for(i=0; i<children.length; i++){
            multi.hget("u:" + children[i], "exp");
          }
          multi.exec(function(err, exps){
            player.server.pushToPlayer(player, new Messages.State('show', oldData, [newData], [children], [exps]));
          });
        });
      });
    });
  },
  levelUp: function(player){
    client.hget("u:" + player.name, "maxLevel", function(err, maxLevel){
      maxLevel = Utils.NaN2Zero(maxLevel);
      if(maxLevel < player.level){
        client.hset("u:" + player.name, "maxLevel", player.level);
        if(player.level >= 50){
          client.hget("u:" + player.name, "parent", function(err, parentName){
            if(parentName){
              client.sismember("u:" + parentName + ":children", player.name, function(err, reply){
                if(parseInt(reply) === 1){
                  if(player.level === 50){
                    client.zincrby("adrank", 25, parentName);
                  } else if(player.level < 100){
                    client.zincrby("adrank", 2, parentName);
                  } else{
                    client.zincrby("adrank", 5, parentName);
                  }
                }
              });
            }
          });
        }
      }
    });
  },
  buyInventory: function(player){
    var self = this;
    client.zscore("adrank", player.name, function(err, reply){
      var userKey = "u:" + player.name;
      var pubPoint = Utils.NaN2Zero(reply);
      log.info(player.name + ' pubPoint: ' + pubPoint);
      if(pubPoint >= 100){
        if(player.inventory.number < 30){
          player.inventory.incInventoryRoom();
          client.zincrby("adrank", -100, player.name);
          client.hset(userKey, "maxInventoryNumber", player.inventory.number);
          player.send([Types.Messages.STATE, 'maxInventoryNumber', player.inventory.number]);
          self.getState(player);
        }
      }
    });
  },
  incPubPoint: function(player, point){
    client.zincrby("adrank", point, player.name);
  },
  buySnowpotion: function(player){
    var self = this;
    client.zscore("adrank", player.name, function(err, reply){
      var userKey = "u:" + player.name;
      var pubPoint = Utils.NaN2Zero(reply);
      log.info(player.name + ' pubPoint: ' + pubPoint);
      if(pubPoint >= 50){
        if(player.inventory.putInventory(Types.Entities.SNOWPOTION, 1, 0, 0)){
          client.zincrby("adrank", -50, player.name);
          self.getState(player);
        } else{
          player.server.pushToPlayer(player, new Messages.Notify("인벤토리에 빈 칸이 없습니다."));
        }
      }
    });
  },
  buyRoyalazalea: function(player){
    var self = this;
    client.zscore("adrank", player.name, function(err, reply){
      var userKey = "u:" + player.name;
      var pubPoint = Utils.NaN2Zero(reply);
      log.info(player.name + ' pubPoint: ' + pubPoint);
      if(pubPoint >= 5){
        if(player.inventory.putInventory(Types.Entities.ROYALAZALEA, 1, 0, 0)){
          client.zincrby("adrank", -5, player.name);
          self.getState(player);
        } else{
          player.server.pushToPlayer(player, new Messages.Notify("인벤토리에 빈 칸이 없습니다."));
        }
      }
    });
  },
  buyRainbowApro: function(player){
    var self = this;
    client.zscore("adrank", player.name, function(err, reply){
      var userKey = "u:" + player.name;
      var pubPoint = Utils.NaN2Zero(reply);
      log.info(player.name + ' pubPoint: ' + pubPoint);
      if(pubPoint >= 20){
        if(player.inventory.putInventory(Types.Entities.RAINBOWAPRO, 0, 0, 0)){
          client.zincrby("adrank", -20, player.name);
          self.getState(player);
        } else{
          player.server.pushToPlayer(player, new Messages.Notify("인벤토리에 빈 칸이 없습니다."));
        }
      }
    });
  },
  buyCokeArmor: function(player){
    var self = this;
    client.zscore("adrank", player.name, function(err, reply){
      var userKey = "u:" + player.name;
      var pubPoint = Utils.NaN2Zero(reply);
      log.info(player.name + ' pubPoint: ' + pubPoint);
      if(pubPoint >= 20){
        if(player.inventory.putInventory(Types.Entities.COKEARMOR, 0, 0, 0)){
          client.zincrby("adrank", -20, player.name);
          self.getState(player);
        } else{
          player.server.pushToPlayer(player, new Messages.Notify("인벤토리에 빈 칸이 없습니다."));
        }
      }
    });
  },
  buyFriedPotatoArmor: function(player){
    var self = this;
    client.zscore("adrank", player.name, function(err, reply){
      var userKey = "u:" + player.name;
      var pubPoint = Utils.NaN2Zero(reply);
      log.info(player.name + ' pubPoint: ' + pubPoint);
      if(pubPoint >= 50){
        if(player.inventory.putInventory(Types.Entities.FRIEDPOTATOARMOR, 0, 0, 0)){
          client.zincrby("adrank", -50, player.name);
          self.getState(player);
        } else{
          player.server.pushToPlayer(player, new Messages.Notify("인벤토리에 빈 칸이 없습니다."));
        }
      }
    });
  },
  buyBurgerArmor: function(player){
    var self = this;
    client.zscore("adrank", player.name, function(err, reply){
      var userKey = "u:" + player.name;
      var pubPoint = Utils.NaN2Zero(reply);
      log.info(player.name + ' pubPoint: ' + pubPoint);
      if(pubPoint >= 80){
        if(player.inventory.putInventory(Types.Entities.BURGERARMOR, 0, 0, 0)){
          client.zincrby("adrank", -80, player.name);
          self.getState(player);
        } else{
          player.server.pushToPlayer(player, new Messages.Notify("인벤토리에 빈 칸이 없습니다."));
        }
      }
    });
  },
  buyRadishArmor: function(player){
    var self = this;
    client.zscore("adrank", player.name, function(err, reply){
      var userKey = "u:" + player.name;
      var pubPoint = Utils.NaN2Zero(reply);
      log.info(player.name + ' pubPoint: ' + pubPoint);
      if(pubPoint >= 20){
        if(player.inventory.putInventory(Types.Entities.RADISHARMOR, 0, 0, 0)){
          client.zincrby("adrank", -20, player.name);
          self.getState(player);
        } else{
          player.server.pushToPlayer(player, new Messages.Notify("인벤토리에 빈 칸이 없습니다."));
        }
      }
    });
  },
  buyHalloweenJKArmor: function(player){
    var self = this;
    client.zscore("adrank", player.name, function(err, reply){
      var userKey = "u:" + player.name;
      var pubPoint = Utils.NaN2Zero(reply);
      log.info(player.name + ' pubPoint: ' + pubPoint);
      if(pubPoint >= 20){
        if(player.inventory.putInventory(Types.Entities.HALLOWEENJKARMOR, 0, 0, 0)){
          client.zincrby("adrank", -20, player.name);
          self.getState(player);
        } else{
          player.server.pushToPlayer(player, new Messages.Notify("인벤토리에 빈 칸이 없습니다."));
        }
      }
    });
  },
  buyFrankensteinArmor: function(player){
    var self = this;
    client.zscore("adrank", player.name, function(err, reply){
      var userKey = "u:" + player.name;
      var pubPoint = Utils.NaN2Zero(reply);
      log.info(player.name + ' pubPoint: ' + pubPoint);
      if(pubPoint >= 20){
        if(player.inventory.putInventory(Types.Entities.FRANKENSTEINARMOR, 0, 0, 0)){
          client.zincrby("adrank", -20, player.name);
          self.getState(player);
        } else{
          player.server.pushToPlayer(player, new Messages.Notify("인벤토리에 빈 칸이 없습니다."));
        }
      }
    });
  },
  getRanking: function(player){
    var self = this;

    client.multi()
    .zadd("ranking", player.experience, player.name)
    .zrevrank("ranking", player.name)
    .zcount("ranking", '-inf', '+inf')
    .exec(function(err, replies){
      var playerRank = replies[1];
      var numOfRankers = replies[2];
      var bottomRank = playerRank - 5;
      var topRank = playerRank + 5;
      if(bottomRank < 0){
        bottomRank = 0;
      }
      if(topRank > numOfRankers-1){
        topRank = numOfRankers-1;
      }
      log.info("bottomRank: " + bottomRank);
      log.info("topRank: " + topRank);
      client.zrevrange("ranking", bottomRank, topRank, function(error, rankers){
        var i = 0;

        client.multi()
        .zscore("ranking", rankers[0])
        .zscore("ranking", rankers[1])
        .zscore("ranking", rankers[2])
        .zscore("ranking", rankers[3])
        .zscore("ranking", rankers[4])
        .zscore("ranking", rankers[5])
        .zscore("ranking", rankers[6])
        .zscore("ranking", rankers[7])
        .zscore("ranking", rankers[8])
        .zscore("ranking", rankers[9])
        .zscore("ranking", rankers[10])
        .zscore("ranking", rankers[11])
        .exec(function(err, scores){
          log.info("" + rankers);
          log.info("" + scores);
          var msg = [Types.Messages.RANKING, bottomRank+1];
          for(i=0; i < 11; i++){
            msg.push(rankers[i]);
            msg.push(scores[i]);
          }
          player.send(msg);
        });
      });
    });
  },
  getPlayerRanking: function(player, callback) {
    var result = -1;
    var multi = client.multi();

    multi.zadd("ranking", player.experience, player.name);
    multi.zrevrank("ranking", player.name);
    multi.exec(function(err, ranking) {
      callback(parseInt(ranking[1]));
    });
  },

  sell: function(player, inventoryNumber, burgerCount){
    var self = this;
    client.hget('u:'+player.name+':shop0', 'itemKind', function(err, itemKindInShop){
      itemKindInShop = Utils.NaN2Zero(itemKindInShop);
      var multi = client.multi();
      multi.hset('u:'+player.name+':shop0', 'itemKind', player.inventory.rooms[inventoryNumber].itemKind);
      multi.hset('u:'+player.name+':shop0', 'burgerCount', burgerCount);
      if(!itemKindInShop){
        multi.lpush('shop:id', player.name+':'+0)
      }
      multi.exec();
      player.inventory.makeEmptyInventory(inventoryNumber);
      if(itemKindInShop){
        player.inventory.putInventory(itemKindInShop, 0, 0, 0);
      }
      self.getShop(player, 0);
    });
  },
  getShop: function(player, number){
    client.lrange('shop:id', number, number+5, function(err, ids){
      var i=0;
      var multi = client.multi();

      for(i=0; i < ids.length; i++){
        var splitedId = ids[i].split(':');
        multi.hget('u:' + splitedId[0] + ':shop'+ splitedId[1], 'itemKind');
        multi.hget('u:' + splitedId[0] + ':shop'+ splitedId[1], 'burgerCount');
      }

      multi.exec(function(err, items){
        var msg = [Types.Messages.SHOP, number];
        for(i=0; i < ids.length; i++){
          msg.push(ids[i]);
          msg.push(items[i*2]);
          msg.push(items[i*2+1]);
        }
        player.send(msg);
      });
    });
  },
  buy: function(player, id, itemKind, burgerCount){
    var self = this;
    var splitedId = id.split(':');
    var name = splitedId[0];
    var number = splitedId[1];
    if(!player.inventory.hasEmptyInventory()){
      player.server.pushToPlayer(player, new Messages.Notify("인벤토리에 빈 칸이 없습니다."));
      return;
    }

    var multi = client.multi();
    multi.hget('u:' + name + ':shop'+number, 'itemKind');
    multi.hget('u:' + name + ':shop'+number, 'burgerCount');
    multi.exec(function(err, replies){
      var databaseItemKind = parseInt(replies[0]);
      var databaseBurgerCount = parseInt(replies[1]);
      var playerBurgerCount = player.inventory.getItemNumber(Types.Entities.BURGER);

      if(parseInt(databaseItemKind) === itemKind
      && parseInt(databaseBurgerCount) === burgerCount
      && playerBurgerCount >= databaseBurgerCount){
        if(player.inventory.putInventory(itemKind, 0, 0, 0)){
          client.multi()
          .hdel('u:'+name+':shop0', 'itemKind')
          .hdel('u:'+name+':shop0', 'burgerCount')
          .lrem('shop:id', 0, name+':'+0)
          .exec();
          soldPlayer = player.server.getPlayerByName(name);
          if(soldPlayer){
            soldPlayer.inventory.putInventory(Types.Entities.BURGER, burgerCount, 0, 0);
          } else{
            self.putBurgerOfflineUser(name, burgerCount);
          }
          player.inventory.putInventory(Types.Entities.BURGER, -1 * burgerCount, 0, 0);
        }
      }
      self.getShop(player, 0);
    });
  },
  isAdmin: function(name, callback){
    client.smembers("adminname", function(err, adminnames){
      var i=0;
      for(i=0; i<adminnames.length; i++){
        if(name === adminnames[i]){
          callback(true);
          return;
        }
      }
      callback(false);
    });
  },
  blockPubPoint: function(adminPlayer, blockPlayerName, isBlock){
    client.sismember("usr", blockPlayerName, function(err, reply){
      if(reply === 1){
        if(isBlock){
          client.hset("u:" + blockPlayerName, "pubBlock", 1);
          adminPlayer.server.pushBroadcast(new Messages.Chat(adminPlayer, "/1 " + adminPlayer.name + "님께서 " + blockPlayerName + "님의 홍보포인트 사용을 금지하였습니다."));
        } else{
          client.hdel("u:" + blockPlayerName, "pubBlock");
          adminPlayer.server.pushBroadcast(new Messages.Chat(adminPlayer, "/1 " + adminPlayer.name + "님께서 " + blockPlayerName + "님의 홍보포인트 사용을 허용하였습니다."));
        }
      } else{
        adminPlayer.server.pushToPlayer(adminPlayer, new Messages.Notify(blockPlayerName + "이란 유저는 존재하지 않습니다."));
      }
    });
  },
  canUsePubPoint: function(name, callback){
    client.hget("u:" + name, "pubBlock", function(err, reply){
      if(parseInt(reply) === 1){
        callback(true);
      } else{
        callback(false);
      }
    });
  },
  changeEmailAddress: function(targetPlayerName, emailAddress){
    client.hset("u:" + targetPlayerName, "email", emailAddress);
  },
  delInventory: function(name, callback){
    client.hdel("u:" + name, "maxInventoryNumber", function(err, reply){
      if(parseInt(reply) === 1){
        callback();
      }
    });
  },
  delPubPoint: function(name, callback){
    client.zrem("adrank", name, function(err, reply){
      if(parseInt(reply) === 1){
        callback();
      }
    });
  },
  delEnchantedWeaponPoint: function(name, callback){
    client.hdel("u:" + name, "weaponEnchantedPoint", function(err, reply){
      if(parseInt(reply) === 1){
        callback();
      }
    });
  },
  handleHoldingPubPoint: function(player, command, ref){
    var self = this;
    if(command === "accept" || command === "reject"){
      client.zscore("adhold:"+player.name, ref, function(err, point){
        if(point){
          var multi = client.multi();
          if(command === "accept"){
            multi.zrem("adhold:"+player.name, ref);
            multi.zincrby("adrank", point, player.name);
          } else if(command === "reject"){
            multi.zrem("adhold:"+player.name, ref);
          }
          multi.lpush("adlog:"+player.name, (new Date()).toString() + " " + command + " " + point + " " + ref);
          multi.exec(function(err, replies){
            self.getState(player);
          });
        }
      });
    } else if(command === "newaccept" || command === "newreject"){
      client.srem("u:" + player.name + ":adrefs", ref, function(err, reply){
        if(parseInt(reply) === 1){
          client.smembers("u:" + player.name + ":adref:" + ref, function(err, children){
            var multi = client.multi();
            var i = 0;
            for(i=0; i<children.length; i++){
              if(command === "newaccept"){
                multi.sadd("u:" + player.name + ":children", children[i]);
              }
              multi.srem("u:" + player.name + ":adref:" + ref, children[i]);
            }
            multi.exec(function(err, replies){
              var multi2 = client.multi();
              var j=0;
              for(j=0; j<children.length; j++){
                multi2.hget("u:" + children[j], "exp");
              }
              multi2.exec(function(err, exps){
                var k=0;
                var total = 0;
                for(k=0; k<exps.length; k++){
                  var level = Types.getLevel(exps[k]);
                  if(level >= 50){
                    total += level - 25;
                  }
                }
                client.zincrby("adrank", total, player.name);
                player.logHandler.addAdLog(player.name, ref, command, children);
                self.getState(player);
              });
            });
          });
        }
      });
    }
  },
  handleSkillInstall: function(player, index, name, callback) {
    client.hset('u:' + player.name, 'skillSlot' + index, name, function(err, reply) {
      if(callback) {
        callback();
      }
    });
  },
  getAdLog: function(name, callback){
    client.lrange("adlog:" + name, 0, -1, function(err, logs){
      callback(logs);
    });
  },
  positionReset: function(name){
    var multi = client.multi();
    multi.hdel("u:" + name, "x");
    multi.hdel("u:" + name, "y");
    multi.exec();
  },
});
