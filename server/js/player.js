
var cls = require("./lib/class"),
    _ = require("underscore"),
    Messages = require("./message"),
    Utils = require("./utils"),
    Properties = require("./properties"),
    Party = require("./party"),
    Inventory = require("./inventory"),
    Formulas = require("./formulas"),
    check = require("./format").check,
    Types = require("../../shared/js/gametypes"),
    SkillHandler = require("./skillhandler");

module.exports = Player = Character.extend({
  init: function(connection, worldServer, databaseHandler, logHandler) {
    var self = this;
        
    this.server = worldServer;
    this.connection = connection;
    this.logHandler = logHandler;

    this._super(this.connection.id, "player", Types.Entities.WARRIOR, 0, 0, "");

    this.hasEnteredGame = false;
    this.isDead = false;
    this.haters = {};
    this.lastCheckpoint = null;
    this.formatChecker = new FormatChecker();
    this.disconnectTimeout = null;

    this.pvpFlag = false;
    this.bannedTime = 0;
    this.banUseTime = 0;
    this.experience = 0;
    this.level = 0;

    this.inventory = null;
    this.achievement = [];
        
    this.chatBanEndTime = 0;
        
    this.royalAzaleaBenefTimeout = null;
    this.cooltimeTimeout = null;

    this.skillHandler = new SkillHandler();

    this.healExecuted = 0;

    this.flareDanceCallback = null;
    this.flareDanceExecuted1 = 0;
    this.flareDanceExecuted2 = 0;
    this.flareDanceCount = 0;

    this.stunExecuted = 0;

    this.superCatCallback = null;
    this.superCatExecuted = 0;

    this.provocationExecuted = 0;

    this.pubPointBuyTimeout = null;

    this.connection.listen(function(message) {
      var action = parseInt(message[0]);
            
      if(!check(message)) {
        self.connection.close("Invalid "+Types.getMessageTypeAsString(action)+" message format: "+message);
        return;
      }
            
      if(!self.hasEnteredGame && action !== Types.Messages.HELLO) { // HELLO must be the first message
        self.connection.close("Invalid handshake message: "+message);
        return;
      }
      if(self.hasEnteredGame && !self.isDead && action === Types.Messages.HELLO) { // HELLO can be sent only once
        self.connection.close("Cannot initiate handshake twice: "+message);
        return;
      }
            
      self.resetTimeout();
            
      if(action === Types.Messages.HELLO) {
        log.info("HELLO: " + Utils.sanitize(message[1]));
        self.handleHello(message);
      } else if(action === Types.Messages.WHO) {
        log.info("WHO: " + self.name);
        message.shift();
        self.server.pushSpawnsToPlayer(self, message);
      } else if(action === Types.Messages.ZONE) {
        log.info("ZONE: " + self.name);
        self.zone_callback();
      } else if(action === Types.Messages.CHAT) {
        self.handleChat(message);
      } else if(action === Types.Messages.MOVE) {
        self.handleMove(message);
      } else if(action === Types.Messages.LOOTMOVE) {
        self.handleLootMove(message);
      } else if(action === Types.Messages.AGGRO) {
        log.info("AGGRO: " + self.name + " " + message[1]);
        if(self.move_callback) {
          self.server.handleMobHate(message[1], self.id, 5);
        }
      } else if(action === Types.Messages.ATTACK) {
        log.info("ATTACK: " + self.name + " " + message[1]);
        var mob = self.server.getEntityById(message[1]);
                
        if(mob) {
          self.setTarget(mob);
          self.server.broadcastAttacker(self);
        }
      } else if(action === Types.Messages.HIT) {
        log.info("HIT: " + self.name + " " + message[1]);
        self.handleHit(message);
      } else if(action === Types.Messages.HURT) {
        self.handleHurt(message);
      } else if(action === Types.Messages.LOOT) {
        log.info("LOOT: " + self.name + " " + message[1]);
        self.handleLoot(message);
      } else if(action === Types.Messages.TELEPORT) {
        log.info("TELEPORT: " + self.name + "(" + message[1] + ", " + message[2] + ")");
        var x = message[1],
            y = message[2];
                
        if(self.server.isValidPosition(x, y)) {
          self.setPosition(x, y);
          self.clearTarget();

          self.broadcast(new Messages.Teleport(self));
                    
          self.server.handlePlayerVanish(self);
          self.server.pushRelevantEntityListTo(self);
        }
      } else if(action === Types.Messages.OPEN) {
        log.info("OPEN: " + self.name + " " + message[1]);
        var chest = self.server.getEntityById(message[1]);
        if(chest && chest instanceof Chest) {
          self.server.handleOpenedChest(chest, self);
        }
      } else if(action === Types.Messages.CHECK) {
        log.info("CHECK: " + self.name + " " + message[1]);
        var checkpoint = self.server.map.getCheckpoint(message[1]);
        if(checkpoint) {
          self.lastCheckpoint = checkpoint;
          databaseHandler.setCheckpoint(self.name, self.x, self.y);
        }
      } else if(action === Types.Messages.INVENTORY){
        log.info("INVENTORY: " + self.name + " " + message[1] + " " + message[2] + " " + message[3]);
        self.handleInventory(message);
      } else if(action === Types.Messages.QUEST){
        log.info("QUEST: " + self.name + " " + message[1] + " " + message[2]);
        self.handleQuest(message);
      } else if(action === Types.Messages.TALKTONPC){
        log.info("TALKTONPC: " + self.name + " " + message[1]);
        self.handleTalkToNPC(message);
      } else if(action === Types.Messages.MAGIC){
        log.info("MAGIC: " + self.name + " " + message[1] + " " + message[2]);
        var magicName = message[1];
        var magicTargetName = message[2];

        if(magicName === "setheal"){
          self.magicTarget = self.server.getPlayerByName(magicTargetName);
          if(self.magicTarget === self){
            self.magicTarget = null;
          }
        } else if(magicName === "heal"){
          if(self.magicTarget){
            if(!self.magicTarget.hasFullHealth()) {
                self.magicTarget.regenHealthBy(50);
                self.server.pushToPlayer(self.magicTarget, self.magicTarget.health());
            }
          }
        }
      } else if(action === Types.Messages.BOARD){
        log.info("BOARD: " + self.name + " " + message[1] + " " + message[2] + " " + message[3]);
        self.handleBoard(message);
      } else if(action === Types.Messages.BOARDWRITE){
        log.info("BOARDWRITE: " + self.name + " " + message[1] + " " + message[2] + " " + message[3]);
        var command = message[1];
        if(command === "board"){
          var title = message[2];
          var content = message[3];
          databaseHandler.writeBoard(self, title, content);
        } else if(command === "reply"){
          var reply = message[2];
          var number = message[3]*1;
          if(number > 0){
            databaseHandler.writeReply(self, reply, number);
          }
        }
      } else if(action === Types.Messages.KUNG){
        log.info("KUNG: " + self.name + " " + message[1]);
        var word = message[1];
        databaseHandler.pushKungWord(self, word);
      } else if(action === Types.Messages.STATE){
        log.info("STATE: " + self.name + " " + message[1]);
        self.handleState(message);
      } else if(action === Types.Messages.RANKING){
        log.info("RANKING: " + self.name + " " + message[1]);
        self.handleRanking(message);
      } else if(action === Types.Messages.SELL){
        log.info("SELL: " + self.name + " " + message[1] + " " + message[2]);
        self.handleSell(message);
      } else if(action === Types.Messages.SHOP){
        log.info("SHOP: " + self.name + " " + message[1] + " " + message[2]);
        self.handleShop(message);
      } else if(action === Types.Messages.BUY){
        log.info("BUY: " + self.name + " " + message[1] + " " + message[2] + " " + message[3]);
        self.handleBuy(message);
      } else if(action === Types.Messages.NEWCHARACTER){
        log.info("NEWCHARACTER: " + self.name + " " + message[1]);
        self.handleNewCharacter(message);
      } else if(action === Types.Messages.PWCHANGE){
        log.info("PWCHANGE: " + self.name);
        self.handlePasswordChange(message);
      } else if(action === Types.Messages.SKILL){
        log.info("SKILL: " + self.name + " " + message[1] + " " + message[2]);
        self.handleSkill(message);
      } else if(action === Types.Messages.FLAREDANCE){
        log.info("FLAREDANCE: " + self.name + " " + message[1] + ", " + message[2] + ", " + message[3] + ", " + message[4]);
        self.handleFlareDance(message);
      } else if(action === Types.Messages.CHARACTERINFO) {
        log.info("CHARACTERINFO: " + self.name);
        self.server.pushToPlayer(self, new Messages.CharacterInfo(self));
      } else if(action === Types.Messages.STORESELL) {
        log.info("STORESELL: " + self.name + " " + message[1]);
        self.handleStoreSell(message);
      } else if(action === Types.Messages.STOREBUY) {
        log.info("STOREBUY: " + self.name + " " + message[1] + " " + message[2] + " " + message[3]);
        self.handleStoreBuy(message);
      } else if(action === Types.Messages.HOLDINGPUBPOINT) {
        log.info("HOLDINGPUBPOINT: " + self.name + " " + message[1] + " " + message[2]);
        self.handleHoldingPubPoint(message);
      } else if(action === Types.Messages.SKILLINSTALL) {
        log.info("SKILLINSTALL: " + self.name + " " + message[1] + " " + message[2]);
        self.handleSkillInstall(message);
      } else {
        if(self.message_callback) {
          self.message_callback(message);
        }
      }
    });
        
    this.connection.onClose(function() {
      clearTimeout(self.disconnectTimeout);
      if(self.exit_callback) {
        self.exit_callback();
      }
    });
        
    this.connection.sendUTF8("go"); // Notify client that the HELLO/WELCOME handshake can start
  },
  destroy: function() {
    var self = this;
        
    this.forEachAttacker(function(mob) {
      mob.clearTarget();
    });
    this.attackers = {};
        
    this.forEachHater(function(mob) {
      mob.forgetPlayer(self.id);
    });
    this.haters = {};
  },
  getState: function() {
    var basestate = this._getBaseState(),
        state = [this.name, this.orientation, this.avatar ? this.avatar : this.armor, this.weaponAvatar ? this.weaponAvatar : this.weapon, this.level, this.admin, this.rank];

    if(this.target) {
      state.push(this.target);
    }
        
    return basestate.concat(state);
  },
  send: function(message) {
    this.connection.send(message);
  },
  flagPVP: function(pvpFlag){
    if(this.pvpFlag != pvpFlag){
      this.pvpFlag = pvpFlag;
      this.send(new Messages.PVP(this.pvpFlag).serialize());
    }
  },
  broadcast: function(message, ignoreSelf) {
    if(this.broadcast_callback) {
      this.broadcast_callback(message, ignoreSelf === undefined ? true : ignoreSelf);
    }
  },
  broadcastToZone: function(message, ignoreSelf) {
    if(this.broadcastzone_callback) {
      this.broadcastzone_callback(message, ignoreSelf === undefined ? true : ignoreSelf);
    }
  },
  onExit: function(callback) {
    this.exit_callback = callback;
  },
  onMove: function(callback) {
    this.move_callback = callback;
  },
  onLootMove: function(callback) {
    this.lootmove_callback = callback;
  },
  onZone: function(callback) {
    this.zone_callback = callback;
  },
  onOrient: function(callback) {
    this.orient_callback = callback;
  },
  onMessage: function(callback) {
    this.message_callback = callback;
  },
  onBroadcast: function(callback) {
    this.broadcast_callback = callback;
  },
  onBroadcastToZone: function(callback) {
    this.broadcastzone_callback = callback;
  },
  equip: function(item) {
    return new Messages.EquipItem(this, item);
  },
  addHater: function(mob) {
    if(mob) {
      if(!(mob.id in this.haters)) {
        this.haters[mob.id] = mob;
      }
    }
  },
  removeHater: function(mob) {
    if(mob && mob.id in this.haters) {
      delete this.haters[mob.id];
    }
  },
  forEachHater: function(callback) {
    _.each(this.haters, function(mob) {
      callback(mob);
    });
  },
  equipArmor: function(kind, enchantedPoint, skillKind, skillLevel) {
    this.armor = kind;
    if(enchantedPoint){
      this.armorEnchantedPoint = enchantedPoint;
    } else{
      this.armorEnchantedPoint = 0;
    }
    this.armorLevel = Properties.getArmorLevel(kind) + this.armorEnchantedPoint;
    this.armorSkillKind = skillKind;
    this.armorSkillLevel = skillLevel;
  },
  equipAvatar: function(kind, enchantedPoint, skillKind, skillLevel) {
    if(kind){
      this.avatar = kind;
    } else{
      this.avatar = null;
    }
    if(enchantedPoint){
      this.avatarEnchantedPoint = enchantedPoint;
    } else{
      this.avatarEnchantedPoint = 0;
    }
    this.avatarSkillKind = skillKind;
    this.avatarSkillLevel = skillLevel;
  },
  equipWeapon: function(kind, enchantedPoint, skillKind, skillLevel){
    this.weapon = kind;
    if(enchantedPoint){
      this.weaponEnchantedPoint = enchantedPoint;
    } else{
      this.weaponEnchantedPoint = 0;
    }
    this.weaponLevel = Properties.getWeaponLevel(kind) + this.weaponEnchantedPoint;
    this.weaponSkillKind = skillKind;
    this.weaponSkillLevel = skillLevel;
  },
  equipWeaponAvatar: function(kind, enchantedPoint, skillKind, skillLevel){
    if(kind){
      this.weaponAvatar = kind;
      if(enchantedPoint){
        this.weaponAvatarEnchantedPoint = enchantedPoint;
      } else{
        this.weaponAvatarEnchantedPoint = 0;
      }
      this.weaponAvatarSkillKind = skillKind;
      this.weaponAvatarSkillLevel = skillLevel;
    } else{
      this.weaponAvatar = null;
      this.weaponAvatarEnchantedPoint = 0;
      this.weaponAvatarSkillKind = 0;
      this.weaponAvatarSkillLevel = 0;
    }
  },
  equipPendant: function(kind, enchantedPoint, skillKind, skillLevel) {
    if(kind) {
      this.pendant = kind;
      if(enchantedPoint){
        this.pendantEnchantedPoint = enchantedPoint;
      } else{
        this.pendantEnchantedPoint = 0;
      }
      this.pendantLevel = Properties.getPendantLevel(kind);
      this.pendantSkillKind = skillKind;
      this.pendantSkillLevel = skillLevel;
    } else {
      this.pendant = null;
      this.pendantEnchantedPoint = 0;
      this.pendantLevel = 0;
      this.pendantSkillKind = 0;
      this.pendantSkillLevel = 0;
    }
  },
  equipRing: function(kind, enchantedPoint, skillKind, skillLevel) {
    if(kind) {
      this.ring = kind;
      if(enchantedPoint){
        this.ringEnchantedPoint = enchantedPoint;
      } else{
        this.ringEnchantedPoint = 0;
      }
      this.ringLevel = Properties.getRingLevel(kind);
      this.ringSkillKind = skillKind;
      this.ringSkillLevel = skillLevel;
    } else {
      this.ring = null;
      this.ringEnchantedPoint = 0;
      this.ringLevel = 0;
      this.ringSkillKind = 0;
      this.ringSkillLevel = 0;
    }
  },
  equipBoots: function(kind, enchantedPoint, skillKind, skillLevel) {
    if(kind) {
      this.boots = kind;
      if(enchantedPoint){
        this.bootsEnchantedPoint = enchantedPoint;
      } else{
        this.bootsEnchantedPoint = 0;
      }
      this.bootsLevel = Properties.getBootsLevel(kind);
      this.bootsSkillKind = skillKind;
      this.bootsSkillLevel = skillLevel;
    } else {
      this.boots = null;
      this.bootsEnchantedPoint = 0;
      this.bootsLevel = 0;
      this.bootsSkillKind = 0;
      this.bootsSkillLevel = 0;
    }
  },
  equipItem: function(itemKind, enchantedPoint, skillKind, skillLevel, isAvatar) {
    if(itemKind) {
      log.debug(this.name + " equips " + Types.getKindAsString(itemKind));
            
      if(Types.isArmor(itemKind) || Types.isArcherArmor(itemKind)) {
        if(isAvatar){
          databaseHandler.equipAvatar(this.name, Types.getKindAsString(itemKind), enchantedPoint, skillKind, skillLevel);
          this.equipAvatar(itemKind, enchantedPoint, skillKind, skillLevel);
        } else{
          databaseHandler.equipArmor(this.name, Types.getKindAsString(itemKind), enchantedPoint, skillKind, skillLevel);
          this.equipArmor(itemKind, enchantedPoint, skillKind, skillLevel);
        }
      } else if(Types.isWeapon(itemKind) || Types.isArcherWeapon(itemKind)) {
        if(isAvatar){
          databaseHandler.equipWeaponAvatar(this.name, Types.getKindAsString(itemKind), enchantedPoint ? enchantedPoint : 0, skillKind, skillLevel);
          this.equipWeaponAvatar(itemKind, enchantedPoint, skillKind, skillLevel);
        } else{
          databaseHandler.equipWeapon(this.name, Types.getKindAsString(itemKind), enchantedPoint ? enchantedPoint : 0, skillKind, skillLevel);
          this.equipWeapon(itemKind, enchantedPoint, skillKind, skillLevel);
        }
      } else if(Types.isPendant(itemKind)) {
        databaseHandler.equipPendant(this.name, Types.getKindAsString(itemKind), enchantedPoint, skillKind, skillLevel);
        this.equipPendant(itemKind, enchantedPoint, skillKind, skillLevel);
      } else if(Types.isRing(itemKind)) {
        databaseHandler.equipRing(this.name, Types.getKindAsString(itemKind), enchantedPoint, skillKind, skillLevel);
        this.equipRing(itemKind, enchantedPoint, skillKind, skillLevel);
      } else if(Types.isBoots(itemKind)) {
        databaseHandler.equipBoots(this.name, Types.getKindAsString(itemKind), enchantedPoint, skillKind, skillLevel);
        this.equipBoots(itemKind, enchantedPoint, skillKind, skillLevel);
      }
    }
  },
  takeOffAvatar: function(){
    this.inventory.putInventory(this.avatar, this.avatarEnchantedPoint, this.avatarSkillKind, this.avatarSkillLevel);
    this.avatar = null;
    this.avatarEnchantedPoint = 0;
    this.avatarSkillKind = 0;
    this.avatarSkillLevel = 0;
    databaseHandler.takeOffAvatar(this.name);
    this.broadcastToZone(new Messages.EquipItem(this, this.armor), false);
  },
  takeOffWeaponAvatar: function(){
    this.inventory.putInventory(this.weaponAvatar, this.weaponAvatarEnchantedPoint, this.weaponAvatarSkillKind, this.weaponAvatarSkillLevel);
    this.weaponAvatar = null;
    this.weaponAvatarEnchantedPoint = 0;
    this.weaponAvatarSkillKind = 0;
    this.weaponAvatarSkillLevel = 0;
    databaseHandler.takeOffWeaponAvatar(this.name);
    this.broadcastToZone(new Messages.EquipItem(this, this.weapon), false);
  },
  resetHPandMana: function() {
    this.resetHitPoints(Formulas.hp(this.kind, this.level));
    this.resetMana(Formulas.mana(this.kind, this.level));
  },
  updatePosition: function() {
    if(this.requestpos_callback) {
      var pos = this.requestpos_callback();
      this.setPosition(pos.x, pos.y);
    }
  },
  onRequestPosition: function(callback) {
    this.requestpos_callback = callback;
  },
  resetTimeout: function() {
    clearTimeout(this.disconnectTimeout);
    this.disconnectTimeout = setTimeout(this.timeout.bind(this), 1000 * 60 * 20); // 20 min.
  },
  timeout: function() {
    this.connection.sendUTF8("timeout");
    this.connection.close("Player was idle for too long");
  },
  incExp: function(gotexp){
    this.experience = parseInt(this.experience) + (parseInt(gotexp));
    databaseHandler.setExp(this.name, this.experience);
    var origLevel = this.level;
    this.level = Types.getLevel(this.experience);
    if(origLevel !== this.level){
      this.resetHPandMana();
      this.server.pushToPlayer(this, new Messages.HitPoints(this.maxHitPoints, this.maxMana));
      this.server.pushToAdjacentGroups(this.group, new Messages.LevelUp(this));
      databaseHandler.levelUp(this);
    }
    this.server.pushToPlayer(this, new Messages.Kill(this.level, gotexp));
  },
  sendWelcome: function(admin, kind, x, y, exp, rank,
                        armor, armorEnchantedPoint, armorSkillKind, armorSkillLevel,
                        avatar, avatarEnchantedPoint, avatarSkillKind, avatarSkillLevel,
                        weapon, weaponEnchantedPoint, weaponSkillKind, weaponSkillLevel,
                        weaponAvatar, weaponAvatarEnchantedPoint, weaponAvatarSkillKind, weaponAvatarSkillLevel,
                        ring, ringEnchantedPoint, ringSkillKind, ringSkillLevel,
                        pendant, pendantEnchantedPoint, pendantSkillKind, pendantSkillLevel,
                        boots, bootsEnchantedPoint, bootsSkillKind, bootsSkillLevel,
                        bannedTime, banUseTime, chatBanEndTime, chatBanCount){

    var self = this;
    this.kind = kind;
    this.admin = admin;
    this.rank = rank;
    this.equipArmor(Types.getKindFromString(armor), armorEnchantedPoint, armorSkillKind, armorSkillLevel);
    this.equipAvatar(Types.getKindFromString(avatar), avatarEnchantedPoint, avatarSkillKind, armorSkillLevel);
    this.equipWeapon(Types.getKindFromString(weapon), weaponEnchantedPoint, weaponSkillKind, weaponSkillLevel);
    this.equipWeaponAvatar(Types.getKindFromString(weaponAvatar), weaponAvatarEnchantedPoint, weaponAvatarSkillKind, weaponAvatarSkillLevel);
    this.equipPendant(Types.getKindFromString(pendant), pendantEnchantedPoint, pendantSkillKind, pendantSkillLevel);
    this.equipRing(Types.getKindFromString(ring), ringEnchantedPoint, ringSkillKind, ringSkillLevel);
    this.equipBoots(Types.getKindFromString(boots), bootsEnchantedPoint, bootsSkillKind, bootsSkillLevel);
    this.bannedTime = bannedTime;
    this.banUseTime = banUseTime;
    this.experience = exp;
    this.level = Types.getLevel(this.experience);
    this.orientation = Utils.randomOrientation();
    this.resetHPandMana();
    if(x === 0 && y === 0){
      this.updatePosition();
    } else{
      this.setPosition(x, y);
    }
    this.chatBanEndTime = chatBanEndTime;
    this.chatBanCount = chatBanCount;

    this.server.addPlayer(this);
    this.server.enter_callback(this);
    databaseHandler.getAllInventory(this, function(maxInventoryNumber, itemKinds, itemNumbers, itemSkillKinds, itemSkillLevels){
      self.inventory = new Inventory(self, maxInventoryNumber, itemKinds, itemNumbers, itemSkillKinds, itemSkillLevels);
      self.logHandler.addLoginLog(self);
      databaseHandler.loadQuest(self, function(){
        var i=0;
        var msg = [
          Types.Messages.WELCOME, self.id, self.name, self.x, self.y,
          self.hitPoints, self.mana, self.armor, self.weapon, self.avatar,
          self.weaponAvatar, self.experience, self.admin, self.rank];
        for(i=0; i<Types.Quest.TOTAL_QUEST_NUMBER; i++){
          msg.push(self.achievement[i+1].found);
          msg.push(self.achievement[i+1].progress);
        }
        for(i=0; i<4; i++){
          msg.push(self.achievement[i+101].found);
          msg.push(self.achievement[i+101].progress);
        }
        msg.push(self.kind);
        msg.push(self.inventory.number);
        for(i=0; i<self.inventory.number; i++){
          msg.push(self.inventory.rooms[i].itemKind);
          msg.push(self.inventory.rooms[i].itemNumber);
          msg.push(self.inventory.rooms[i].itemSkillKind);
          msg.push(self.inventory.rooms[i].itemSkillLevel);
        }
        self.send(msg);

        databaseHandler.loadSkillSlots(self, function(names) {
          for(var index = 0; index < names.length; index++) {
            if(names[index]) {
              self.skillHandler.install(index, names[index]);
              self.send((new Messages.SkillInstall(index, names[index])).serialize());
            }
          }
          self.setAbility();
        });
      });
    });

    self.hasEnteredGame = true;
    self.isDead = false;
  },
  computeSkillLevel: function() {
    if(this.achievement[10].progress === 999) {
      if(this.achievement[11].progress === 999) {
        if(this.achievement[14].progress === 999) {
          if(this.achievement[18].progress === 999) {
            this.skillHandler.add('evasion', 4);
          } else {
            this.skillHandler.add('evasion', 3);
          }
        } else{
          this.skillHandler.add('evasion', 2);
        }
      } else{
        this.skillHandler.add('evasion', 1);
      }
    }
    if(this.achievement[12].progress === 999) {
      if(this.achievement[13].progress === 999) {
        if(this.achievement[17].progress === 999) {
          if(this.achievement[20].progress === 999) {
            this.skillHandler.add('bloodSucking', 4);
          } else {
            this.skillHandler.add('bloodSucking', 3);
          }
        } else {
          this.skillHandler.add('bloodSucking', 2);
        }
      } else {
        this.skillHandler.add('bloodSucking', 1);
      }
    }
    if(this.achievement[15].progress === 999) {
      if(this.achievement[16].progress === 999) {
        if(this.achievement[21].progress === 999) {
          if(this.achievement[24].progress === 999) {
            this.skillHandler.add('criticalStrike', 4);
          } else {
            this.skillHandler.add('criticalStrike', 3);
          }
        } else {
          this.skillHandler.add('criticalStrike', 2);
        }
      } else {
        this.skillHandler.add('criticalStrike', 1);
      }
    }
    if(this.achievement[19].progress === 999) {
      if(this.achievement[22].progress === 999) {
        if(this.achievement[25].progress === 999) {
          if(this.achievement[28].progress === 999) {
            this.skillHandler.add('heal', 4);
          } else{
            this.skillHandler.add('heal', 3);
          }
        } else {
          this.skillHandler.add('heal', 2);
        }
      } else {
        this.skillHandler.add('heal', 1);
      }
    }
    if(this.achievement[23].progress === 999) {
      if(this.achievement[26].progress === 999) {
        if(this.achievement[29].progress === 999) {
          if(this.achievement[32].progress === 999) {
            this.skillHandler.add('flareDance', 4);
          } else{
            this.skillHandler.add('flareDance', 3);
          }
        } else{
          this.skillHandler.add('flareDance', 2);
        }
      } else {
        this.skillHandler.add('flareDance', 1);
      }
    }
    if(this.achievement[27].progress === 999) {
      if(this.achievement[30].progress === 999) {
        if(this.achievement[33].progress === 999) {
          this.skillHandler.add('stun', 3);
        } else{
          this.skillHandler.add('stun', 2);
        }
      } else{
        this.skillHandler.add('stun', 1);
      }
    }
    if(this.achievement[31].progress === 999){
      if(this.achievement[34].progress === 999) {
        this.skillHandler.add('superCat', 2);
      } else{
        this.skillHandler.add('superCat', 1);
      }
    }
    if(this.achievement[35].progress === 999){
      this.skillHandler.add('provocation', 1);
    }
  },
  setAbility: function(){
    this.computeSkillLevel();

    this.bloodsuckingRatio = 0;
    if(this.weaponSkillKind === Types.Skills.BLOODSUCKING){
      this.bloodsuckingRatio += this.weaponSkillLevel*0.02;
    }

    this.criticalRatio = 0;
    if(this.skillHandler.getLevel("criticalStrike") > 0){
      this.criticalRatio = 0.1;
    }
    if(this.weaponSkillKind === Types.Skills.CRITICALRATIO){
      this.criticalRatio += this.weaponSkillLevel*0.01;
    }
  },
  checkName: function(name){
    if(name === null) return false;
    else if(name === '') return false;
    else if(name === ' ') return false;

    for(var i=0; i < name.length; i++){
      var c = name.charCodeAt(i);

     if(!((0xAC00 <= c && c <= 0xD7A3) || (0x3131 <= c && c <= 0x318E)
       || (0x61 <= c && c <= 0x7A) || (0x41 <= c && c <= 0x5A)
       || (0x30 <= c && c <= 0x39))){
       return false;
     }
    }
    return true;
  },
  questAboutKill: function(mob){
    var self = this;
    // Daily Quest
    if(this.achievement[101].found){
      if(this.achievement[101].progress < 999){
        this._questAboutKill(mob.kind, 0, 101, 25, function(){
          log.info("Quest 101 Completed");
          self.inventory.putInventory(Types.Entities.FLASK, 100, 0, 0);
        });
        return;
      } else if(this.achievement[102].found){
        if(this.achievement[102].progress < 999){
          this._questAboutKill(mob.kind, 0, 102, 100, function(){
            log.info("Quest 102 Completed");
            self.inventory.putInventory(Types.Entities.BURGER, 100, 0, 0);
          });
          return;
        } else if(this.achievement[103].found){
          if(this.achievement[103].progress < 999){
            this._questAboutKill(mob.kind, 0, 103, 200, function(){
              log.info("Quest 103 Completed");
              self.inventory.putInventory(Types.Entities.ROYALAZALEA, 50, 0, 0);
            });
            return;
          } else if(this.achievement[104].found){
            if(this.achievement[104].progress < 999){
              this._questAboutKill(mob.kind, 0, 104, 500, function(){
                log.info("Quest 104 Completed");
                self.inventory.putInventory(Types.Entities.SNOWPOTION, 1, 0, 0);
              });
              return;
            }
          }
        }
      }
    }
    this._questAboutKill(mob.kind, Types.Entities.RAT, 2, 10, function(){
      self.incExp(200);
    });
    this._questAboutKill(mob.kind, Types.Entities.CRAB, 4, 5, function(){
      self.incExp(100);
    });
    this._questAboutKill(mob.kind, Types.Entities.SKELETON, 7, 10, function(){
      self.incExp(400);
    });
    this._questAboutKill(mob.kind, Types.Entities.SKELETONKING, 9, 2, function(){
      self.incExp(1000);
    });
    this._questAboutKill(mob.kind, Types.Entities.ORC, 10, 10, function(){ self.setAbility(); });
    this._questAboutKill(mob.kind, Types.Entities.GOLEM, 11, 10, function(){ self.setAbility(); });
    this._questAboutKill(mob.kind, Types.Entities.HOBGOBLIN, 12, 13, function(){ self.setAbility(); });
    this._questAboutKill(mob.kind, Types.Entities.YELLOWMOUSE, 13, 12, function(){ self.setAbility(); });
    this._questAboutKill(mob.kind, Types.Entities.MERMAID, 16, 15, function(){ self.setAbility(); });
    this._questAboutKill(mob.kind, Types.Entities.LIVINGARMOR, 17, 9, function(){ self.setAbility(); });
    this._questAboutKill(mob.kind, Types.Entities.PENGUIN, 18, 12, function(){ self.setAbility(); });
    this._questAboutKill(mob.kind, Types.Entities.DARKSKELETON, 19, 20, function(){ self.setAbility(); });
    this._questAboutKill(mob.kind, Types.Entities.MINIKNIGHT, 20, 30, function(){ self.setAbility(); });
    this._questAboutKill(mob.kind, Types.Entities.WOLF, 22, 50, function(){ self.setAbility(); });
    this._questAboutKill(mob.kind, Types.Entities.SNOWWOLF, 28, 60, function(){ self.setAbility(); });
    this._questAboutKill(mob.kind, Types.Entities.SNOWLADY, 29, 70, function(){ self.setAbility(); });
  },
  _questAboutKill: function(mobKind, questMobKind, questId, completeNumber, callback){
    if((questMobKind === 0 && Types.getMobLevel(mobKind)*2 > this.level) || mobKind === questMobKind){
      var achievement = this.achievement[questId];
      if(achievement.found && achievement.progress !== 999){
        if(isNaN(achievement.progress)){
          achievement.progress = 0;
        } else{
          achievement.progress++;
        }
        if(achievement.progress >= completeNumber){
          this.send([Types.Messages.QUEST, "complete", questId]);
          achievement.progress = 999;
          if(callback){
            callback();
          }
        }
        databaseHandler.progressAchievement(this.name, questId, achievement.progress);
        if(achievement.progress < completeNumber){
          this.send([Types.Messages.QUEST, "progress", questId, achievement.progress]);
        }
      }
    }
  },
  getDailyQuest: function(){
    var i=0;
    for(i=0; i<4; i++){
      if(this.achievement[i+101].found){
        if(this.achievement[i+101].progress !== 999){
          break;
        }
      } else{
        this.foundQuest(i+101);
        break;
      }
    }
  },
  foundQuest: function(questId){
    this.achievement[questId].found = true;
    databaseHandler.foundAchievement(this.name, questId);
    this.send([Types.Messages.QUEST, "found", questId]);
  },
  isRightPassword: function(strPw, arrayPw){
    var i=0;
    if(strPw === null){
      return false;
    }
    for(i=0; i<15; i++){
      if(strPw.charCodeAt(i) !== arrayPw[i]){
        return false;
      }
    }
    return true;
  },
  passwordArray2String: function(arrayPw){
    var strPw = '';
    var i=0;
    for(i=0; i<15; i++){
      strPw += String.fromCharCode(arrayPw[i]);
    }
    return strPw;
  },
  handleHello: function(message){ // 0
    var self = this;
    var name = Utils.sanitize(message[1]);
    var pw = [];
    var email = Utils.sanitize(message[17]);
    var isJoin = parseInt(message[18]);
    var language = parseInt(message[19]);
    log.info("isJoin: " + isJoin);

    var i=0;

    for(i=0; i<15; i++){
      pw.push(parseInt(Utils.sanitize(message[2+i])));
    }
    this.pw = pw;

    this.name = name.substr(0, 8).split(' ')[0];
    if(!this.checkName(this.name)){
       this.connection.close("Invalid name " + this.name);
       return;
    }
    this.email = email;
    this.language = language;

    databaseHandler.checkBan(this);
    databaseHandler.loadPlayer(this, isJoin, function(isAdmin, kind, x, y, exp, rank,
                 armor, armorEnchantedPoint, armorSkillKind, armorSkillLevel,
                 avatar, avatarEnchantedPoint, avatarSkillKind, avatarSkillLevel,
                 weapon, weaponEnchantedPoint, weaponSkillKind, weaponSkillLevel,
                 weaponAvatar, weaponAvatarEnchantedPoint, weaponAvatarSkillKind, weaponAvatarSkillLevel,
                 ring, ringEnchantedPoint, ringSkillKind, ringSkillLevel,
                 pendant, pendantEnchantedPoint, pendantSkillKind, pendantSkillLevel,
                 boots, bootsEnchantedPoint, bootsSkillKind, bootsSkillLevel,
                 bannedTime, banUseTime, chatBanEndTime, chatBanCount){
      self.server.samePlayerDisconnect(self);
      self.sendWelcome(isAdmin, kind, x, y, exp, rank,
                 armor, armorEnchantedPoint, armorSkillKind, armorSkillLevel,
                 avatar, avatarEnchantedPoint, avatarSkillKind, avatarSkillLevel,
                 weapon, weaponEnchantedPoint, weaponSkillKind, weaponSkillLevel,
                 weaponAvatar, weaponAvatarEnchantedPoint, weaponAvatarSkillKind, weaponAvatarSkillLevel,
                 ring, ringEnchantedPoint, ringSkillKind, ringSkillLevel,
                 pendant, pendantEnchantedPoint, pendantSkillKind, pendantSkillLevel,
                 boots, bootsEnchantedPoint, bootsSkillKind, bootsSkillLevel,
                 bannedTime, banUseTime, chatBanEndTime, chatBanCount);
    });
  },
  handleMove: function(message){ // 4
    log.info("MOVE: " + this.name + "(" + message[1] + ", " + message[2] + ")");
    if(this.move_callback) {
      var x = message[1],
          y = message[2];
                  
      if(this.server.isValidPosition(x, y)) {
        this.setPosition(x, y);
        this.clearTarget();
                      
        this.broadcast(new Messages.Move(this));
        this.move_callback(this.x, this.y);
      }
    }
  },
  handleLootMove: function(message){ // 5
    log.info("LOOTMOVE: " + this.name + "(" + message[1] + ", " + message[2] + ")");
    if(this.lootmove_callback) {
      this.setPosition(message[1], message[2]);
                    
      var item = this.server.getEntityById(message[3]);
      if(item) {
        this.clearTarget();

        this.broadcast(new Messages.LootMove(this, item));
        this.lootmove_callback(this.x, this.y);
      }
    }
  },
  handleHit: function(message){ // 8
    var mobId = message[1];
    var mob = this.server.getEntityById(message[1]);
    var self = this;

    if(this.cooltimeTimeout){
      return;
    } else{
      this.cooltimeTimeout = setTimeout(function(){
        self.cooltimeTimeout = null;
      }, 720);
    }

    if(mob && this.id){
      var dmg = Formulas.dmg(this, mob);
      if(mob instanceof Player){
        dmg = Formulas.newDmg(this, mob);
      }
                    
      if(dmg > 0){
        if(Utils.ratioToBool(this.criticalRatio)){
          var criticalStrikeLevel = this.skillHandler.getLevel("criticalStrike");
          var dmg2 = dmg * (1 + (0.5 * criticalStrikeLevel));
          dmg = Math.round(dmg2 + (this.ringSkillKind == Types.Skills.CRITICALATTACK ? dmg * (this.ringSkillLevel * 0.05) : 0));

          log.info('critical: ' + dmg);

          this.broadcast(new Messages.Skill("critical", mobId, 0), false);
        }

        var bloodsuckingAmount = dmg * (this.bloodsuckingRatio + this.skillHandler.getLevel("bloodSucking")*0.05);

        if(this.ringSkillKind == Types.Skills.ATTACKWITHBLOOD) {
          var hitPoints = this.hitPoints,
              bleedingAmount = this.maxHitPoints * (this.ringSkillLevel * 0.01);
          if(hitPoints > bleedingAmount) {
            bloodsuckingAmount -= bleedingAmount;
          }
        }

        bloodsuckingAmount = Math.floor(bloodsuckingAmount);
        if(bloodsuckingAmount != 0){
          this.regenHealthBy(bloodsuckingAmount);
          this.server.pushToPlayer(this, this.health());
        }

        if(mob.type !== "player"){
          mob.receiveDamage(dmg, this.id);
          if(mob.hitPoints <= 0){
            this.questAboutKill(mob);
          }
          this.server.handleMobHate(mob.id, this.id, dmg);
          this.server.handleHurtEntity(mob, this, dmg);
        } else{
          mob.hitPoints -= dmg;
          mob.server.handleHurtEntity(mob, this, dmg);
          if(mob.hitPoints <= 0){
            mob.isDead = true;
            this.server.pushBroadcast(new Messages.Chat(this, "/1 " + this.name + "가(이) " + mob.name + "을(를) PK"));
          }
        }
      }
    }
  },
  handleHurt: function(message){ // 9
    var self = this;
    log.info("HURT: " + this.name + " " + message[1]);
    var mob = this.server.getEntityById(message[1]);
    if(mob &&
       (mob.kind === Types.Entities.FORESTDRAGON
       || mob.kind == Types.Entities.SEADRAGON
       || mob.kind == Types.Entities.HELLSPIDER
       || mob.kind == Types.Entities.SKYDINOSAUR)){
      var group = this.server.groups[this.group];
      if(group){
        _.each(group.players, function(playerId){
          var attackedPlayer = self.server.getEntityById(playerId);
          if(attackedPlayer){
            attackedPlayer.hitPoints -= Formulas.dmg(mob, attackedPlayer);
            self.server.handleHurtEntity(attackedPlayer, mob);
                    
            if(attackedPlayer.hitPoints <= 0) {
              attackedPlayer.isDead = true;
              if(attackedPlayer.level >= 50){
                attackedPlayer.incExp(Math.floor(attackedPlayer.level*attackedPlayer.level*(-2)));
              }
            }
          }
        });
      }
    }
    if(mob && this.hitPoints > 0 && mob instanceof Mob) {
      var evasionLevel = this.skillHandler.getLevel("evasion");
      if(evasionLevel > 0) {
        var randNum = Math.random(),
            avoidChance = 0.05 * evasionLevel;

        if(this.pendantSkillKind == Types.Skills.AVOIDATTACK){
          avoidChance += this.pendantSkillLevel * 0.01;
        }

        if(randNum < avoidChance){
          this.server.pushToPlayer(this, new Messages.Damage(this, 'MISS', this.hitPoints, this.maxHitPoints));
          return;
        }
      }

      this.hitPoints -= Formulas.dmg(mob, this);
      this.server.handleHurtEntity(this, mob);
      mob.addTanker(this.id);
                    
      if(this.hitPoints <= 0) {
        this.isDead = true;
        if(this.level >= 50){
          this.incExp(Math.floor(this.level*this.level*(-2)));
        }
        if(this.flareDanceCallback) {
          clearTimeout(this.flareDanceCallback);
          this.flareDanceCallback = null;
          this.flareDanceExecuted1 = 0;
          this.flareDanceExecuted2 = 0;
          this.flareDanceCount = 0;
        }
      }
    }
  },
  handleChat: function(message){ // 11
    var self = this;
    var msg = Utils.sanitize(message[1]);
    log.info("CHAT: " + this.name + ": " + msg);
                
    // Sanitized messages may become empty. No need to broadcast empty chat messages.
    if(msg && msg !== "") {
      msg = msg.substr(0, 60); // Enforce maxlength of chat input
      var splitMsg = msg.split(' ');
      var key = splitMsg[0];
      if(key === "/1"){
        if((new Date()).getTime() > this.chatBanEndTime){
          this.server.pushBroadcast(new Messages.Chat(this, msg));
          this.logHandler.addChatLog(this, "global", msg);
        } else{
          this.server.pushToPlayer(this, new Messages.Notify("채팅이 금지 되었습니다."));
        }
      } else if(key === "/3"){
        var partyPlayer = this.server.getPlayerByName(splitMsg[1]);
        if(partyPlayer && this !== partyPlayer){
          if(this.level - partyPlayer.level < 30
          && partyPlayer.level - this.level < 30){
            if(this.askedPartyPlayer === partyPlayer){
              if(partyPlayer.party){
                var highestLevel = partyPlayer.party.getHighestLevel();
                var lowestLevel = partyPlayer.party.getLowestLevel();
                if(highestLevel - this.level < 30
                && this.level - highestLevel < 30
                && lowestLevel - this.level < 30
                && this.level - lowestLevel < 30){
                  this.server.pushToPlayer(this, new Messages.Notify(partyPlayer.name + '님의 파티에 추가되었습니다.'));
                  partyPlayer.party.addPlayer(this);
                } else{
                  this.server.pushToPlayer(this, new Messages.Notify('레벨이 30이상 차이 나면 파티를 할 수 없습니다.'));
                }
              } else{
                var newParty = new Party(this, partyPlayer);
              }
            } else{
              partyPlayer.askedPartyPlayer = this;
              this.server.pushToPlayer(this, new Messages.Notify(partyPlayer.name + '님을 파티로 초대했습니다.'));
              partyPlayer.server.pushToPlayer(partyPlayer, new Messages.Notify(this.name + '님이 파티로 초대했습니다. /3 ' + this.name + ' 이라고 치시면 파티에 들어갈 수 있습니다.'));
            }
          } else{
            this.server.pushToPlayer(this, new Messages.Notify('레벨이 30이상 차이 나면 파티를 할 수 없습니다.'));
          }
        }
      } else if(key === "/4"){
        var remPartyPlayer = this.server.getPlayerByName(splitMsg[1]);
        if(remPartyPlayer && this.party && remPartyPlayer !== this){
          this.party.removePlayer(remPartyPlayer);
          if(this.party.players.length < 2){
            delete this.party;
            this.party = null;
          }
        }
      } else if(key === "//"){
        if(this.party){
          var i=0;
          var members = this.party.players;
          for(i=0; i<members.length; i++){
            this.server.pushToPlayer(members[i], new Messages.Chat(this, msg));
          }
          this.logHandler.addChatLog(this, "party", msg);
        } else{
          this.server.pushToPlayer(this, new Messages.Notify('파티가 없습니다'));
        }
      } else if(key === "///"){
        var i=0;
        var targetName = splitMsg[3];
        if(targetName){
          var target = this.server.getPlayerByName(targetName);
          if(target){
            this.server.pushToPlayer(target, new Messages.Chat(this, msg));
            this.server.pushToPlayer(this, new Messages.Chat(this, msg));
            this.logHandler.addChatLog(this, "whisper", msg);
          } else{
            this.server.pushToPlayer(this, new Messages.Notify('접속 중인 유저 중 ' + targetName + '란 유저는 없습니다.'));
          }
        }
      } else if(key === "/b"){
        var banPlayerName = splitMsg[1];
        var days = parseInt(splitMsg[2]);
        if(banPlayerName && days >= 0){
          databaseHandler.isAdmin(this.name, function(isAdmin){
            if(isAdmin){
              databaseHandler.banPlayer(self, banPlayerName, days);
            }
          });
        }
      } else if((key === "/c") || (key === '/ㅊ')) {
        targetPlayer = this.server.getPlayerByName(splitMsg[1]),
        minutes = splitMsg.length > 2 ? parseInt(splitMsg[2]) : 10;
        if(targetPlayer && (minutes > 0)){
          databaseHandler.isAdmin(this.name, function(isAdmin){
            if(isAdmin){
              databaseHandler.chatBan(self, targetPlayer, minutes);
            }
          });
        }
      } else if(key === "/e"){
        var self = this;
        var targetPlayer = this.server.getPlayerByName(splitMsg[1]);
        var emailAddress = splitMsg[2];

        databaseHandler.isAdmin(this.name, function(isAdmin){
          if(isAdmin){
            if(targetPlayer){
              if(emailAddress){
                databaseHandler.changeEmailAddress(splitMsg[1], emailAddress);
                self.server.pushBroadcast(new Messages.Chat(self, "/1 " + self.name + "님께서 " + splitMsg[1] + "님의 이메일 주소를 변경하였습니다."));
              } else{
                self.server.pushToPlayer(self, new Messages.Notify('이메일 주소를 입력하셔야 합니다.'));
              }
            } else{
              self.server.pushToPlayer(self, new Messages.Notify('접속 중인 유저 중 ' + splitMsg[1] + '이란 유저는 없습니다.'));
            }
          }
        });
      } else if(key === "/i"){
        var banPlayer = this.server.getPlayerByName(splitMsg[1]);
        if(banPlayer){
          databaseHandler.userBanPlayer(this, banPlayer);
        }
      } else if(key === '/o') {
        var playerName = splitMsg[1];
        var isBlock = parseInt(splitMsg[2]) === 0 ? false : true;
        databaseHandler.isAdmin(this.name, function(isAdmin){
          if(isAdmin){
            databaseHandler.blockPubPoint(self, playerName, isBlock);
          }
        });
      } else if(key === '/p') {
        var playerName = splitMsg[1];
        if(playerName){
          databaseHandler.isAdmin(this.name, function(isAdmin){
            if(isAdmin){
              databaseHandler.getLastIp(playerName, function(ip){
                self.server.pushToPlayer(self, new Messages.Notify("" + playerName + "의 IP는 " + ip + "입니다."));
              });
            }
          });
        }
      } else if(key === '/u') {
        var givenPlayer = this.server.getPlayerByName(splitMsg[1]);
        var count = parseInt(splitMsg[2]);
        if(count > 0){
          databaseHandler.isAdmin(this.name, function(isAdmin){
            if(isAdmin){
              if(givenPlayer){
                if(givenPlayer.inventory.putInventory(Types.Entities.BURGER, count, 0, 0)){
                  self.server.pushBroadcast(new Messages.Chat(self, "/1 " + self.name + "-- Burger ->" + givenPlayer.name + " " + count + "개"));
                } else{
                  self.server.pushToPlayer(self, new Messages.Notify("인벤토리에 빈공간이 없어 버거를 지급하지 못했습니다."));
                }
              } else{
                databaseHandler.putBurgerOfflineUser(splitMsg[1], count, function(){
                  self.server.pushBroadcast(new Messages.Chat(self, "/1 " + self.name + "-- Burger ->" + splitMsg[1] + " " + count + "개"));
                }, function(){
                  self.server.pushToPlayer(self, new Messages.Notify("인벤토리에 빈공간이 없어 버거를 지급하지 못했습니다."));
                });
              }
            }
          });
        }
      } else if(key === '/characterBan') {
        var banPlayerName = splitMsg[1];
        var days = parseInt(splitMsg[2]);
        databaseHandler.isAdmin(this.name, function(isAdmin){
          if(isAdmin){
            var banPlayer = self.server.getPlayerByName(banPlayerName);
            if(banPlayer){
              setTimeout(function(){
                banPlayer.connection.close("Character Banned player: " + banPlayer.name + " " + banPlayer.connection._connection.remoteAddress);
              }, 30000);
            }
            var globalChatMsg = null;
            if(days === 0){
              globalChatMsg = "/1 " + self.name + "님이 " + banPlayerName + "님의 캐릭밴을 해제하였습니다.";
              databaseHandler.delCharacterBan(banPlayerName);
            } else if(days > 0){
              globalChatMsg = "/1 " + self.name + "-- 캐릭밴 ->" + banPlayerName + " " + days + "일";
              databaseHandler.characterBan(banPlayerName, days);
            }

            if(globalChatMsg){
              self.server.pushBroadcast(new Messages.Chat(self, globalChatMsg));
              log.debug(globalChatMsg);
            }
          }
        });
      } else if(key === '/characterByIp') {
        var ip = splitMsg[1];
        databaseHandler.isAdmin(this.name, function(isAdmin){
          if(isAdmin){
            databaseHandler.getCharacterByIp(ip, function(names, lastLoginTimes){
              self.server.pushToPlayer(self, new Messages.CharacterByIp(names, lastLoginTimes));
            });
          }
        });
      } else if(key === '/delInventory') {
        var name = splitMsg[1];
        databaseHandler.isAdmin(this.name, function(isAdmin){
          if(isAdmin){
            var delInventoryPlayer = self.server.getPlayerByName(name);
            if(delInventoryPlayer){
              delInventoryPlayer.inventory.number = 3;
              delInventoryPlayer.send([Types.Messages.STATE, 'maxInventoryNumber', self.inventory.number]);
            }

            databaseHandler.delInventory(name, function(){
              var globalChatMsg = "/1 " + self.name + "님이 " + name + "님의 인벤토리를 삭제하였습니다.";
              self.server.pushBroadcast(new Messages.Chat(self, globalChatMsg));
              log.debug(globalChatMsg);
            });
          }
        });
      } else if(key === '/delPubPoint') {
        var name = splitMsg[1];
        databaseHandler.isAdmin(this.name, function(isAdmin){
          if(isAdmin){
            databaseHandler.delPubPoint(name, function(){
              var globalChatMsg = "/1 " + self.name + "님이 " + name + "님의 홍보포인트를 삭제하였습니다.";
              self.server.pushBroadcast(new Messages.Chat(self, globalChatMsg));
              log.debug(globalChatMsg);
            });
          }
        });
      } else if(key === '/delEnchantedWeaponPoint') {
        var name = splitMsg[1];
        databaseHandler.isAdmin(this.name, function(isAdmin){
          if(isAdmin){
            var delEnchantedWeaponPointPlayer = self.server.getPlayerByName(name);
            if(delEnchantedWeaponPointPlayer){
              delEnchantedWeaponPointPlayer.weaponEnchantedPoint = 0;
            }

            databaseHandler.delEnchantedWeaponPoint(name, function(){
              var globalChatMsg = "/1 " + self.name + "님이 " + name + "님의 강화포인트를 삭제하였습니다.";
              self.server.pushBroadcast(new Messages.Chat(self, globalChatMsg));
              log.debug(globalChatMsg);
            });
          }
        });
      } else if(key === '/adlog') {
        var name = splitMsg[1];
        databaseHandler.isAdmin(this.name, function(isAdmin){
          if(isAdmin){
            databaseHandler.getAdLog(name, function(logs){
              var log = '';
              for(i=0; i<logs.length; i++){
                log += logs[i] + "<br>";
              }
              self.server.pushToPlayer(self, new Messages.Notify(log));
            });
          }
        });
      } else if(key === '/newAdlog') {
        var name = splitMsg[1];
        databaseHandler.isAdmin(this.name, function(isAdmin){
          if(isAdmin){
            self.logHandler.getAdLog(name, function(results){
              var i=0, logStr='';
              for(i=0; i<results.length; i++){
                logStr += results[i].time + " ";
                logStr += results[i].user + " ";
                logStr += results[i].kind + " ";
                logStr += results[i].action + " ";
                logStr += results[i].content + "<br>";
              }
              self.server.pushToPlayer(self, new Messages.Notify(logStr));
            });
          }
        });
      } else if(key === '/log') {
        var name = splitMsg[1];
        var kind = splitMsg[2];
        var action = splitMsg[3];
        var time = splitMsg[4] + " " + splitMsg[5];

        databaseHandler.isAdmin(this.name, function(isAdmin){
          if(isAdmin){
            self.logHandler.getLog(name, kind, action, time, function(results){
              var i=0, logStr='';
              for(i=0; i<results.length; i++){
                logStr += results[i].time + " ";
                logStr += results[i].user + " ";
                logStr += results[i].kind + " ";
                logStr += results[i].action + " ";
                logStr += results[i].content + "<br>";
              }
              self.server.pushToPlayer(self, new Messages.Notify(logStr));
            });
          }
        });
      } else if(key === '/notice') {
        databaseHandler.isAdmin(this.name, function(isAdmin){
          if(isAdmin){
            var chatMsg = '/1 <font color="#dda0dd">' + self.name + ': ' + msg.slice(8) + '</font>';
            self.server.pushBroadcast(new Messages.Chat(self, chatMsg));
          }
        });
      } else if(key === '/positionReset') {
        databaseHandler.isAdmin(this.name, function(isAdmin){
          if(isAdmin){
            var globalChatMsg = "/1 " + self.name + "님이 " + splitMsg[1] + "님의 로그인 후 시작 위치를 리셋하였습니다.";
            self.server.pushBroadcast(new Messages.Chat(self, globalChatMsg));
            databaseHandler.positionReset(splitMsg[1]);
          }
        });
      } else if(key === '/avatar') {
        var inventoryNumber = parseInt(splitMsg[1]) - 1;
        if(this.level < 100){
          this.server.pushToPlayer(this, new Messages.Notify("100레벨 이상부터 외형변경하실 수 있습니다."));
          return;
        }
        if(inventoryNumber || inventoryNumber === 0){
          if(inventoryNumber >= 0 && inventoryNumber < 5){
            var itemKind = this.inventory.rooms[inventoryNumber].itemKind;
            if(Types.isArmor(itemKind) || Types.isArcherArmor(itemKind)){
              this.handleInventoryAvatar(inventoryNumber);
            } else{
              this.server.pushToPlayer(this, new Messages.Notify("갑옷류만 갑옷 외형변경하실 수 있습니다."));
            }
          } else{
            this.server.pushToPlayer(this, new Messages.Notify("1번에서 5번 인벤토리에 있는 갑옷만 외형변경하실 수 있습니다."));
          }
        } else{
          this.server.pushToPlayer(this, new Messages.Notify("외형변경 명령어 형식에 맞지 않습니다."));
        }
      } else if(key === '/avatarOff'){
        if(this.avatar){
          if(this.inventory.hasEmptyInventory()){
            this.takeOffAvatar();
          } else{
            this.server.pushToPlayer(this, new Messages.Notify("인벤토리에 빈 칸이 없습니다."));
          }
        } else{
          this.server.pushToPlayer(this, new Messages.Notify("외형변경 착용하고 있지 않습니다."));
        }
      } else if(key === '/weaponAvatar'){
        var inventoryNumber = parseInt(splitMsg[1]) - 1;
        if(this.level < 100){
          this.server.pushToPlayer(this, new Messages.Notify("100레벨 이상부터 외형변경하실 수 있습니다."));
          return;
        }
        if(inventoryNumber || inventoryNumber === 0){
          if(inventoryNumber >= 0 && inventoryNumber < 5){
            var itemKind = this.inventory.rooms[inventoryNumber].itemKind;
            if(Types.isWeapon(itemKind) || Types.isArcherWeapon(itemKind)){
              this.handleInventoryWeaponAvatar(inventoryNumber);
            } else{
              this.server.pushToPlayer(this, new Messages.Notify("무기류만 무기 외형변경하실 수 있습니다."));
            }
          } else{
            this.server.pushToPlayer(this, new Messages.Notify("1번에서 5번 인벤토리에 있는 무기만 무기 외형변경하실 수 있습니다."));
          }
        } else{
          this.server.pushToPlayer(this, new Messages.Notify("외형변경 명령어 형식에 맞지 않습니다."));
        }
      } else if(key === '/weaponAvatarOff'){
        if(this.weaponAvatar){
          if(this.inventory.hasEmptyInventory()){
            this.takeOffWeaponAvatar();
          } else{
            this.server.pushToPlayer(this, new Messages.Notify("인벤토리에 빈 칸이 없습니다."));
          }
        } else{
          this.server.pushToPlayer(this, new Messages.Notify("외형변경 착용하고 있지 않습니다."));
        }
      } else{
        this.broadcastToZone(new Messages.Chat(this, msg), false);
        this.logHandler.addChatLog(this, "normal", msg);
      }
    }
  },
  handleLoot: function(message){ // 12
    var self = this;
    var item = this.server.getEntityById(message[1]);
                
    if(item) {
      var kind = item.kind;
      var itemRank = 0;
                    
      if(Types.isItem(kind)) {
        if(kind === Types.Entities.FIREPOTION) {
          this.resetHPandMana();
          this.broadcast(this.equip(Types.Entities.FIREBENEF), false);
          this.broadcast(item.despawn(), false);
          this.server.removeEntity(item);
          this.server.pushToPlayer(this, new Messages.HitPoints(this.maxHitPoints, this.maxMana));
        } else if(Types.isHealingItem(kind)
               || Types.isWeapon(kind)
               || Types.isArmor(kind)
               || Types.isArcherArmor(kind)
               || Types.isArcherWeapon(kind)
               || Types.isPendant(kind)
               || Types.isRing(kind)
               || Types.isBoots(kind)
               || kind === Types.Entities.CAKE
               || kind === Types.Entities.CD
               || kind === Types.Entities.SNOWPOTION
               || kind === Types.Entities.BLACKPOTION) {
          if(this.inventory.putInventory(item.kind, item.count, item.skillKind, item.skillLevel)){
            this.logHandler.addItemLog(this, "loot", item);
            this.broadcast(item.despawn(), false);
            this.server.removeEntity(item);
          }
        }
      }
    }
  },
  handleInventory: function(message){ // 28
    var inventoryNumber = message[2],
        count = message[3];
    var self = this;

    if(inventoryNumber > this.inventory.number){
      return;
    }

    var itemKind = this.inventory.rooms[inventoryNumber].itemKind;
    if(itemKind){
      if(message[1] === "armor"){
        this.handleInventoryArmor(itemKind, inventoryNumber);
      } else if(message[1] === "weapon"){
        this.handleInventoryWeapon(itemKind, inventoryNumber);
      } else if(message[1] === "pendant") {
        this.handleInventoryPendant(itemKind, inventoryNumber);
      } else if(message[1] === "ring") {
        this.handleInventoryRing(itemKind, inventoryNumber);
      } else if(message[1] === "boots") {
        this.handleInventoryBoots(itemKind, inventoryNumber);
      } else if(message[1] === "empty"){
        this.handleInventoryEmpty(itemKind, inventoryNumber, count);
      } else if(message[1] === "eat"){
        this.handleInventoryEat(itemKind, inventoryNumber);
      } else if(message[1] === "enchantweapon"){
        this.handleInventoryEnchantWeapon(itemKind, inventoryNumber);
      } else if(message[1] === "enchantbloodsucking"){
        this.handleInventoryEnchantBloodsucking(itemKind, inventoryNumber);
      } else if(message[1] === "enchantring"){
        this.handleInventoryEnchantRing(itemKind, inventoryNumber);
      } else if(message[1] === "enchantpendant"){
        this.handleInventoryEnchantPendant(itemKind, inventoryNumber);
      }
    }
  },
  canEquipArmor: function(itemKind){
    if(this.kind === Types.Entities.ARCHER && Types.isArmor(itemKind)){
      this.server.pushToPlayer(this, new Messages.Notify("궁수는 궁수용 갑옷만 착용할 수 있습니다."));
      return false;
    } else if(this.kind === Types.Entities.WARRIOR && Types.isArcherArmor(itemKind)){
      this.server.pushToPlayer(this, new Messages.Notify("검사는 검사용 갑옷만 착용할 수 있습니다."));
      return false;
    }
    var armorLevel = Types.getArmorRank(itemKind)+1;
    if(armorLevel*2 > this.level){
      this.server.pushToPlayer(this, new Messages.Notify(""+armorLevel+"레벨 갑옷은 " + (armorLevel*2) + "레벨 이상만 착용할 수 있습니다."));
      return false;
    }
    return true;
  },
  canEquipWeapon: function(itemKind){
    if(this.kind === Types.Entities.ARCHER && Types.isWeapon(itemKind)){
      this.server.pushToPlayer(this, new Messages.Notify("궁수는 궁수용 무기만 착용할 수 있습니다."));
      return false;
    } else if(this.kind === Types.Entities.WARRIOR && Types.isArcherWeapon(itemKind)){
      this.server.pushToPlayer(this, new Messages.Notify("검사는 검사용 무기만 착용할 수 있습니다."));
      return false;
    }
    var weaponLevel = Types.getWeaponRank(itemKind)+1;
    if(weaponLevel*2 > this.level){
      this.server.pushToPlayer(this, new Messages.Notify(""+weaponLevel+"레벨 무기는 " + (weaponLevel*2) + "레벨 이상만 착용할 수 있습니다."));
      return false;
    }
    return true;
  },
  handleInventoryAvatar: function(inventoryNumber){
    var itemKind = this.inventory.rooms[inventoryNumber].itemKind;
    var itemEnchantedPoint = this.inventory.rooms[inventoryNumber].itemNumber;
    var itemSkillKind = this.inventory.rooms[inventoryNumber].itemSkillKind;
    var itemSkillLevel = this.inventory.rooms[inventoryNumber].itemSkillKind;

    if(!this.canEquipArmor(itemKind)){
      return;
    }
    if(this.avatar){
      this.inventory.setInventory(inventoryNumber, this.avatar, this.avatarEnchantedPoint, this.avatarSkillKind, this.avatarSkillLevel);
    } else{
      this.inventory.makeEmptyInventory(inventoryNumber);
    }
    this.equipItem(itemKind, itemEnchantedPoint, itemSkillKind, itemSkillLevel, true);
    this.broadcast(this.equip(itemKind), false);
  },
  handleInventoryWeaponAvatar: function(inventoryNumber){
    var itemKind = this.inventory.rooms[inventoryNumber].itemKind;
    var itemEnchantedPoint = this.inventory.rooms[inventoryNumber].itemNumber;
    var itemSkillKind = this.inventory.rooms[inventoryNumber].itemSkillKind;
    var itemSkillLevel = this.inventory.rooms[inventoryNumber].itemSkillLevel;

    if(!this.canEquipWeapon(itemKind)){
      return;
    }
    if(this.weaponAvatar){
      this.inventory.setInventory(inventoryNumber, this.weaponAvatar, this.weaponAvatarEnchantedPoint, this.weaponAvatarSkillKind, this.weaponAvatarSkillLevel);
    } else{
      this.inventory.makeEmptyInventory(inventoryNumber);
    }
    this.equipItem(itemKind, itemEnchantedPoint, itemSkillKind, itemSkillLevel, true);
    this.broadcast(this.equip(itemKind), false);
  },

  handleInventoryArmor: function(itemKind, inventoryNumber){
    if(!this.canEquipArmor(itemKind)){
      return;
    }
    this.inventory.setInventory(inventoryNumber, this.armor, 0, 0, 0);
    this.equipItem(itemKind, 0, 0, 0, false);
    if(!this.avatar){
      this.broadcast(this.equip(itemKind), false);
    }
  },
  handleInventoryWeapon: function(itemKind, inventoryNumber){
    if(this.kind === Types.Entities.ARCHER && Types.isWeapon(itemKind)){
      this.server.pushToPlayer(this, new Messages.Notify("궁수는 궁수용 무기만 착용할 수 있습니다."));
      return;
    } else if(this.kind === Types.Entities.WARRIOR && Types.isArcherWeapon(itemKind)){
      this.server.pushToPlayer(this, new Messages.Notify("검사는 검사용 무기만 착용할 수 있습니다."));
      return;
    }
    var weaponLevel = Types.getWeaponRank(itemKind)+1;
    if(weaponLevel*2 > this.level){
      this.server.pushToPlayer(this, new Messages.Notify(""+weaponLevel+"레벨 무기는 " + (weaponLevel*2) + "레벨 이상만 착용할 수 있습니다."));
      return;
    }

    var enchantedPoint = this.inventory.rooms[inventoryNumber].itemNumber;
    var weaponSkillKind = this.inventory.rooms[inventoryNumber].itemSkillKind;
    var weaponSkillLevel = this.inventory.rooms[inventoryNumber].itemSkillLevel;

    this.inventory.setInventory(inventoryNumber, this.weapon, this.weaponEnchantedPoint, this.weaponSkillKind, this.weaponSkillLevel);

    this.equipItem(itemKind, enchantedPoint, weaponSkillKind, weaponSkillLevel, false);
    this.setAbility();
    if(!this.weaponAvatar){
      this.broadcast(this.equip(itemKind), false);
    }
  },
  handleInventoryPendant: function(itemKind, inventoryNumber){
    if(!Types.isPendant(itemKind)) {
      this.server.pushToPlayer(this, new Messages.Notify("펜던트가 아닙니다.."));
      return;
    }
    var pendantLevel = Properties.getPendantLevel(itemKind);
    if((pendantLevel * 10) > this.level) {
      this.server.pushToPlayer(this, new Messages.Notify("" + pendantLevel + "레벨 펜던트는 " + (pendantLevel * 10) + "레벨 이상만 착용할 수 있습니다."));
      return;
    }
    var enchantedPoint = this.inventory.rooms[inventoryNumber].itemNumber;
    var pendantSkillKind = this.inventory.rooms[inventoryNumber].itemSkillKind;
    var pendantSkillLevel = this.inventory.rooms[inventoryNumber].itemSkillLevel;

    if(this.pendant) {
      this.inventory.setInventory(inventoryNumber, this.pendant, this.pendantEnchantedPoint, this.pendantSkillKind, this.pendantSkillLevel);
    } else {
      this.inventory.makeEmptyInventory(inventoryNumber);
    }
    this.equipItem(itemKind, enchantedPoint, pendantSkillKind, pendantSkillLevel, false);
    this.server.pushToPlayer(this, this.equip(itemKind));

  },
  handleInventoryRing: function(itemKind, inventoryNumber){
    if(!Types.isRing(itemKind)) {
      this.server.pushToPlayer(this, new Messages.Notify("반지가 아닙니다."));
      return;
    }
    var ringLevel = Properties.getRingLevel(itemKind);
    if((ringLevel * 10) > this.level) {
      this.server.pushToPlayer(this, new Messages.Notify("" + ringLevel + "레벨 반지는 " + (ringLevel * 10) + "레벨 이상만 착용할 수 있습니다."));
      return;
    }
    var enchantedPoint = this.inventory.rooms[inventoryNumber].itemNumber;
    var ringSkillKind = this.inventory.rooms[inventoryNumber].itemSkillKind;
    var ringSkillLevel = this.inventory.rooms[inventoryNumber].itemSkillLevel;

    if(this.ring) {
      this.inventory.setInventory(inventoryNumber, this.ring, this.ringEnchantedPoint, this.ringSkillKind, this.ringSkillLevel);
    } else {
      this.inventory.makeEmptyInventory(inventoryNumber);

    }
    this.equipItem(itemKind, enchantedPoint, ringSkillKind, ringSkillLevel, false);
    this.server.pushToPlayer(this, this.equip(itemKind));
  },
  handleInventoryBoots: function(itemKind, inventoryNumber){
    if(!Types.isBoots(itemKind)) {
      this.server.pushToPlayer(this, new Messages.Notify("부츠가 아닙니다.."));
      return;
    }
    var bootsLevel = Properties.getBootsLevel(itemKind);
    if((bootsLevel * 10) > this.level) {
      this.server.pushToPlayer(this, new Messages.Notify("" + bootsLevel + "레벨 부츠는 " + (bootsLevel * 10) + "레벨 이상만 착용할 수 있습니다."));
      return;
    }

    var enchantedPoint = this.inventory.rooms[inventoryNumber].itemNumber;
    var bootsSkillKind = this.inventory.rooms[inventoryNumber].itemSkillKind;
    var bootsSkillLevel = this.inventory.rooms[inventoryNumber].itemSkillLevel;

    if(this.boots) {
      this.inventory.setInventory(inventoryNumber, this.boots, this.bootsEnchantedPoint, this.bootsSkillKind, this.bootsSkillLevel);
    } else {
      this.inventory.makeEmptyInventory(inventoryNumber);
    }
    this.equipItem(itemKind, enchantedPoint, bootsSkillKind, bootsSkillLevel, false);
    this.server.pushToPlayer(this, this.equip(itemKind));
  },

  handleInventoryEmpty: function(itemKind, inventoryNumber, count){
    var item = this.server.addItem(this.server.createItem(itemKind, this.x, this.y));
    if(Types.isHealingItem(item.kind)){
      if(count < 0){
        count = 0;
      } else if(count > this.inventory.rooms[inventoryNumber].itemNumber){
        count = this.inventory.rooms[inventoryNumber].itemNumber;
      }
      item.count = count;
    } else if(Types.isWeapon(item.kind) || Types.isArcherWeapon(item.kind) ||
              Types.isPendant(item.kind) || Types.isRing(item.kind) || Types.isBoots(item.kind)){
      item.count = this.inventory.rooms[inventoryNumber].itemNumber;
      item.skillKind = this.inventory.rooms[inventoryNumber].itemSkillKind;
      item.skillLevel = this.inventory.rooms[inventoryNumber].itemSkillLevel;
    }

    if(item.count >= 0) {
      this.server.pushToAdjacentGroups(this.group, new Messages.Drop(this, item));
      this.server.handleItemDespawn(item);
                        
      if(Types.isHealingItem(item.kind)) {
        this.inventory.takeOutInventory(inventoryNumber, item.count);
      } else {
        this.inventory.makeEmptyInventory(inventoryNumber);
      }
    } else{
      this.server.removeEntity(item);
      this.inventory.makeEmptyInventory(inventoryNumber);
    }
    this.logHandler.addItemLog(this, "drop", item);
  },
  handleInventoryEat: function(itemKind, inventoryNumber){
    var self = this;
    if(itemKind === Types.Entities.ROYALAZALEA){
      this.broadcast(this.equip(Types.Entities.ROYALAZALEABENEF), false);
      if(this.royalAzaleaBenefTimeout){
        clearTimeout(this.royalAzaleaBenefTimeout);
      }
      this.royalAzaleaBenefTimeout = setTimeout(function(){
        self.royalAzaleaBenefTimeout = null;
      }, 15000);
    } else{
      var amount;
                            
      switch(itemKind) {
        case Types.Entities.FLASK: 
          amount = 80;
          break;
        case Types.Entities.BURGER: 
          amount = 200;
          break;
      }
                            
      if(!this.hasFullHealth()) {
        this.regenHealthBy(amount);
        this.server.pushToPlayer(this, this.health());
      }
    }

    this.inventory.takeOutInventory(inventoryNumber, 1);
  },
  handleInventoryEnchantWeapon: function(itemKind, inventoryNumber){
    if(itemKind !== Types.Entities.SNOWPOTION){
      this.server.pushToPlayer(this, new Messages.Notify("스노우포션이 아닙니다."));
      return;
    }
    if(this.weaponEnchantedPoint + this.weaponSkillLevel>= 30){
      this.server.pushToPlayer(this, new Messages.Notify("무기의 강화도와 무기 속성 레벨의 합은 30을 넘을 수 없습니다."));
      return;
    }
    this.inventory.makeEmptyInventory(inventoryNumber);
    if(Utils.ratioToBool(0.1)){
      this.server.pushToPlayer(this, new Messages.Notify("강화에 성공했습니다."));
      if(this.weaponEnchantedPoint){
        this.weaponEnchantedPoint += 1;
      } else{
        this.weaponEnchantedPoint = 1;
      }
      databaseHandler.enchantWeapon(this.name, this.weaponEnchantedPoint);
    } else{
      this.server.pushToPlayer(this, new Messages.Notify("강화에 실패했습니다."));
    }
  },
  handleInventoryEnchantBloodsucking: function(itemKind, inventoryNumber){
    if(itemKind !== Types.Entities.BLACKPOTION){
      this.server.pushToPlayer(this, new Messages.Notify("블랙포션이 아닙니다."));
      return;
    }
    if(this.weaponEnchantedPoint + this.weaponSkillLevel >= 30){
      this.server.pushToPlayer(this, new Messages.Notify("무기의 강화도와 흡혈률의 합은 30을 넘을 수 없습니다."));
      return;
    }
    if(this.weaponSkillLevel >= 7){
      this.server.pushToPlayer(this, new Messages.Notify("흡혈률이 7이상일 경우 더이상 흡혈률을 올릴 수 없습니다."));
      return;
    }
    if(this.weaponSkillKind !== Types.Skills.BLOODSUCKING){
      this.server.pushToPlayer(this, new Messages.Notify("무기의 속성이 흡혈인 경우에만 블랙포션을 사용할 수 있습니다."));
      return;
    }

    this.inventory.makeEmptyInventory(inventoryNumber);
    if(Utils.ratioToBool(0.1)){
      this.server.pushToPlayer(this, new Messages.Notify("흡혈률 강화에 성공했습니다."));
      this.weaponSkillKind = Types.Skills.BLOODSUCKING;
      if(this.weaponSkillLevel){
        this.weaponSkillLevel += 1;
      } else{
        this.weaponSkillLevel = 1;
      }
      databaseHandler.setWeaponSkill(this.name, this.weaponSkillKind, this.weaponSkillLevel);
    } else{
      this.server.pushToPlayer(this, new Messages.Notify("흡혈률 강화에 실패했습니다."));
    }
  },
  handleInventoryEnchantRing: function(itemKind, inventoryNumber){
    if(itemKind !== Types.Entities.SNOWPOTION){
      this.server.pushToPlayer(this, new Messages.Notify("스노우포션이 아닙니다."));
      return;
    }
    if(this.ringEnchantedPoint >= 9){
      this.server.pushToPlayer(this, new Messages.Notify("반지의 강화도는 9을 넘을 수 없습니다."));
      return;
    }
    this.inventory.makeEmptyInventory(inventoryNumber);
    if(Utils.ratioToBool(0.3)){
      this.server.pushToPlayer(this, new Messages.Notify("강화에 성공했습니다."));
      if(this.ringEnchantedPoint){
        this.ringEnchantedPoint += 1;
      } else{
        this.ringEnchantedPoint = 1;
      }
      databaseHandler.enchantRing(this.name, this.ringEnchantedPoint);
    } else if(this.ringEnchantedPoint && Utils.ratioToBool(0.3/0.7)){
      this.server.pushToPlayer(this, new Messages.Notify("반지가 약해졌습니다."));
      if(this.ringEnchantedPoint >= 1){
        this.ringEnchantedPoint -= 1;
      } else{
        this.ringEnchantedPoint = 0;
      }
      databaseHandler.enchantRing(this.name, this.ringEnchantedPoint);
    } else{
      this.server.pushToPlayer(this, new Messages.Notify("강화에 실패했습니다."));
    }
  },
  handleInventoryEnchantPendant: function(itemKind, inventoryNumber){
    if(itemKind !== Types.Entities.SNOWPOTION){
      this.server.pushToPlayer(this, new Messages.Notify("스노우포션이 아닙니다."));
      return;
    }
    if(this.pendantEnchantedPoint >= 9){
      this.server.pushToPlayer(this, new Messages.Notify("펜던트의 강화도는 9을 넘을 수 없습니다."));
      return;
    }
    this.inventory.makeEmptyInventory(inventoryNumber);
    if(Utils.ratioToBool(0.3)){
      this.server.pushToPlayer(this, new Messages.Notify("강화에 성공했습니다."));
      if(this.pendantEnchantedPoint){
        this.pendantEnchantedPoint += 1;
      } else{
        this.pendantEnchantedPoint = 1;
      }
      databaseHandler.enchantPendant(this.name, this.pendantEnchantedPoint);
    } else if(this.pendantEnchantedPoint && Utils.ratioToBool(0.3/0.7)){
      this.server.pushToPlayer(this, new Messages.Notify("펜던트가 약해졌습니다."));
      if(this.pendantEnchantedPoint >= 1){
        this.pendantEnchantedPoint -= 1;
      } else{
        this.pendantEnchantedPoint = 0;
      }
      databaseHandler.enchantPendant(this.name, this.pendantEnchantedPoint);
    } else{
      this.server.pushToPlayer(this, new Messages.Notify("강화에 실패했습니다."));
    }
  },
  handleQuest: function(message){ // 29
    if(message[2] === "found"){
      var questId = message[1];
      if(!this.achievement[questId].found){
        this.foundQuest(questId);
      }
    } else if(message[2] === "show"){
      var self = this;
      databaseHandler.loadQuest(this, function(){
        var i=0;
        var msg = [Types.Messages.QUEST, "show"];
        for(i=0; i<Types.Quest.TOTAL_QUEST_NUMBER; i++){
          msg.push(self.achievement[i+1].found);
          msg.push(self.achievement[i+1].progress);
        }
        for(i=0; i<4; i++){
          msg.push(self.achievement[i+101].found);
          msg.push(self.achievement[i+101].progress);
        }
        self.send(msg);
      });
    }
  },
  handleTalkToNPC: function(message){ // 30
    var self = this;
    var npcKind = message[1];

    if(npcKind === Types.Entities.CODER){
      this.getDailyQuest();
    } else if(npcKind === Types.Entities.VILLAGER){
      this.questAboutItem(npcKind, 3, Types.Entities.LEATHERARMOR, function(){ self.incExp(50); });
    } else if(npcKind === Types.Entities.AGENT){
      this.questAboutItem(npcKind, 5, Types.Entities.CAKE, function(){ self.incExp(50); });
    } else if(npcKind === Types.Entities.NYAN){
      this.questAboutItem(npcKind, 6, Types.Entities.CD, function(){ self.incExp(100); });
    } else if(npcKind === Types.Entities.DESERTNPC){
      this.questAboutItem(npcKind, 8, Types.Entities.AXE, function(){ self.incExp(200); });
    } else if(npcKind === Types.Entities.ODDEYECAT){
      this.questAboutItem(npcKind, 14, Types.Entities.RATARMOR, function(){ self.setAbility(); });
    } else if(npcKind === Types.Entities.OCTOCAT){
      this.questAboutItem(npcKind, 15, Types.Entities.HAMMER, function(){ self.setAbility(); });
    } else if(npcKind === Types.Entities.FAIRYNPC){
      this.questAboutItem(npcKind, 21, Types.Entities.REDLIGHTSABER, function(){ self.setAbility(); });
    } else if(npcKind === Types.Entities.ZOMBIEGF){
      this.questAboutItem(npcKind, 23, Types.Entities.BLUEWINGARMOR, function(){ self.setAbility(); });
    } else if(npcKind === Types.Entities.PIRATEGIRLNPC){
      this.questAboutItem(npcKind, 24, Types.Entities.BASTARDSWORD, function(){ self.setAbility(); });
    } else if(npcKind === Types.Entities.IAMVERYCOLDNPC){
      this.questAboutItem(npcKind, 25, Types.Entities.REDMETALSWORD, function(){ self.setAbility(); });
    } else if(npcKind === Types.Entities.ICEELFNPC){
      this.questAboutItem(npcKind, 26, Types.Entities.ICEROSE, function(){ self.setAbility(); });
    } else if(npcKind === Types.Entities.ELFNPC){
      this.questAboutItem(npcKind, 27, Types.Entities.FORESTGUARDIANSWORD, function(){ self.setAbility(); });
    } else if(npcKind === Types.Entities.MOMANGELNPC){
      this.questAboutItem(npcKind, 30, Types.Entities.FROSTARMOR, function(){ self.setAbility(); });
    } else if(npcKind === Types.Entities.SUPERIORANGELNPC){
      this.questAboutItem(npcKind, 31, Types.Entities.SHADOWREGIONARMOR, function(){ self.setAbility(); });
    } else if(npcKind === Types.Entities.FIRSTSONANGELNPC){
      this.questAboutItem(npcKind, 32, Types.Entities.BREAKER, function(){ self.setAbility(); });
    } else if(npcKind === Types.Entities.SECONDSONANGELNPC){
      this.questAboutItem(npcKind, 33, Types.Entities.DAMBOARMOR, function(){ self.setAbility(); });
    } else if(npcKind === Types.Entities.MOJOJOJONPC){
      this.questAboutItem2(npcKind, 34, Types.Entities.SQUIDARMOR, Types.Entities.TYPHOON, function(){ self.setAbility(); });
    } else if(npcKind === Types.Entities.ANCIENTMANUMENTNPC){
      this.questAboutItem(npcKind, 35, Types.Entities.MEMME, function(){ self.setAbility(); });
    } else{
      this.server.pushToPlayer(this, new Messages.TalkToNPC(npcKind, false));
    }
  },
  questAboutItem: function(npcKind, questNumber, itemKind, callback){
    if(this.achievement[questNumber].found === true
    && this.achievement[questNumber].progress !== 999){
      if(this.inventory.hasItem(itemKind)){
        this.inventory.makeEmptyInventory(this.inventory.getInventoryNumber(itemKind));
        this.send([Types.Messages.QUEST, "complete", questNumber]);
        this.achievement[questNumber].progress = 999;
        if(callback){
          callback();
          this.server.pushToPlayer(this, new Messages.TalkToNPC(npcKind, true));
        }
        databaseHandler.progressAchievement(this.name, questNumber, this.achievement[questNumber].progress);
      } else{
        this.server.pushToPlayer(this, new Messages.TalkToNPC(npcKind, false));
      }
    }
  },
  questAboutItem2: function(npcKind, questNumber, itemKind, item2Kind, callback){
    if(this.achievement[questNumber].found === true
    && this.achievement[questNumber].progress !== 999){
      if(this.inventory.hasItem(itemKind) && this.inventory.hasItem(item2Kind)){
        this.inventory.makeEmptyInventory(this.inventory.getInventoryNumber(itemKind));
        this.inventory.makeEmptyInventory(this.inventory.getInventoryNumber(item2Kind));
        this.send([Types.Messages.QUEST, "complete", questNumber]);
        this.achievement[questNumber].progress = 999;
        if(callback){
          callback();
          this.server.pushToPlayer(this, new Messages.TalkToNPC(npcKind, true));
        }
        databaseHandler.progressAchievement(this.name, questNumber, this.achievement[questNumber].progress);
      } else{
        this.server.pushToPlayer(this, new Messages.TalkToNPC(npcKind, false));
      }
    }
  },
  handleBoard: function(message){ // 32
    var command = message[1];
    var number = message[2];
    var replyNumber = message[3];

    if(command === 'view'){
      databaseHandler.viewBoard(this, number);
    } else if(command === 'reply'){
      databaseHandler.viewReply(this, number, replyNumber);
    } else if(command === 'up'){
      databaseHandler.contentUp(this, number);
    } else if(command === 'down'){
      databaseHandler.contentDown(this, number);
    } else if(command === 'replyUp'){
      databaseHandler.replyUp(this, number);
    } else if(command === 'replyDown'){
      databaseHandler.replyDown(this, number);
    } else if(command === 'list'){
      databaseHandler.viewList(this, number);
    } else if(command === 'vote'){
      databaseHandler.vote(this, number, replyNumber);
    } else if(command === 'voteResult'){
      databaseHandler.voteResult(this, number);
    }
  },
  handleState: function(message){ // 39
    var self = this;
    var type = message[1];

    if(type === 'get'){
      databaseHandler.getState(this);
    } else{
      databaseHandler.canUsePubPoint(this.name, function(isPubBlock){
        if(isPubBlock === false){
          if(self.pubPointBuyTimeout === null){
            self.pubPointBuyTimeout = setTimeout(function(){
              self.pubPointBuyTimeout = null;
            }, 5000);
            if(type === 'buyinventory'){
              databaseHandler.buyInventory(self);
            } else if(type === 'buysnowpotion'){
              databaseHandler.buySnowpotion(self);
            } else if(type === 'buyroyalazalea'){
              databaseHandler.buyRoyalazalea(self);
            } else if(type === 'buyrainbowapro'){
              databaseHandler.buyRainbowApro(self);
            } else if(type === 'buycokearmor'){
              databaseHandler.buyCokeArmor(self);
            } else if(type === 'buyfriedpotatoarmor'){
              databaseHandler.buyFriedPotatoArmor(self);
            } else if(type === 'buyburgerarmor'){
              databaseHandler.buyBurgerArmor(self);
            } else if(type === 'buyradisharmor'){
              databaseHandler.buyRadishArmor(self);
            } else if(type === 'buyhalloweenjkarmor'){
              databaseHandler.buyHalloweenJKArmor(self);
            } else if(type === 'buyfrankensteinarmor'){
              databaseHandler.buyFrankensteinArmor(self);
            }
          }
        } else{
          self.server.pushToPlayer(self, new Messages.Notify("홍보포인트 사용이 금지된 상태입니다."));
        }
      });
    }
  },
  handleRanking: function(message){ // 40
    var type = message[1];

    if(type === 'get'){
      databaseHandler.getRanking(this);
    }
  },
  handleSell: function(message){ // 41
    var inventoryNumber = message[1];
    var burgerCount = message[2];

    if(Types.isArmor(this.inventory.rooms[inventoryNumber].itemKind) && burgerCount > 0){
      databaseHandler.sell(this, inventoryNumber, burgerCount);
    }
  },
  handleShop: function(message){ // 42
    var command = message[1];
    var number = message[2];

    if(command === 'get'){
      databaseHandler.getShop(this, number);
    }
  },
  handleBuy: function(message){ // 43
    var id = message[1];
    var itemKind = message[2];
    var burgerCount = message[3];

    databaseHandler.buy(this, id, itemKind, burgerCount);
  },
  handleNewCharacter: function(message){ // 44
    var name = Utils.sanitize(message[1]);
    var pw = [];
    var email = Utils.sanitize(message[17]);

    var i=0;

    for(i=0; i<15; i++){
      pw.push(parseInt(Utils.sanitize(message[2+i])));
    }
    databaseHandler.newCharacter(this, name, pw, email);
  },
  handlePasswordChange: function(message){ // 45
    var curpw = [];
    var newpw = [];
    var email = message[31];

    var i=0;

    for(i=0; i<15; i++){
      curpw.push(parseInt(Utils.sanitize(message[1+i])));
      newpw.push(parseInt(Utils.sanitize(message[16+i])));
    }

    databaseHandler.changePassword(this, curpw, newpw, email);
  },
  handleSkill: function(message){
    var self = this;
    var type = message[1];
    var targetId = message[2];
    if(type === "heal"){
      if(this.party){
        var healLevel = this.skillHandler.getLevel("heal"),
            now = (new Date()).getTime();
        if((healLevel > 0) && ((now - this.healExecuted) > 30 * 1000) && this.mana >= 30) {
          var i = 0;
          var partyPlayers = this.party.players;
          var p = null;
          var amount = 0;
          switch(healLevel) {
          case 1: amount = this.level;
          case 2: amount = Math.floor(this.level * 1.5);
          case 3: amount = this.level * 2;
          case 4: amount = Math.floor(this.level * 2.5);
          }
          if(this.pendantSkillKind == Types.Skills.HEALANDHEAL) {
            amount += this.pendantSkillLevel * 10;
          }
          if(this.ringSkillKind == Types.Skills.HEALANDHEAL) {
            amount += this.ringSkillLevel * 10;
          }
          for(i=0; i < partyPlayers.length; i++){
            p = partyPlayers[i];
            if(p === this){
              continue;
            }
            if(!p.hasFullHealth()) {
              p.regenHealthBy(amount);
              p.server.pushToPlayer(p, p.health());
            }
          }
          this.healExecuted = now;
          this.broadcast(new Messages.Skill("heal", this.id, 0), false);
          this.mana -= 30;
          this.server.pushToPlayer(this, new Messages.Mana(this));
        }
      } else{
        this.server.pushToPlayer(this, new Messages.Notify("파티원이 없을 때는 힐링 스킬을 쓸 수 없습니다."));
      }
    } else if(type === "flareDance"){
      var flareDanceLevel = this.skillHandler.getLevel("flareDance"),
          now = (new Date).getTime();
      if((flareDanceLevel > 0) && ((now - this.flareDanceExecuted1) > 10 * 1000) && this.mana >= 100) {
        this.broadcast(new Messages.Skill("flareDance", this.id, 0), false);
        self.flareDanceCallback = setTimeout(function () {
          self.flareDanceCallback = null;
          self.broadcast(new Messages.Skill("flareDanceOff", self.id, 0), false);
        }, 5*1000);
        this.flareDanceExecuted1 = now;
        this.flareDanceExecuted2 = 0;
        this.flareDanceCount = 0;
        this.mana -= 100;
        this.server.pushToPlayer(this, new Messages.Mana(this));
      }
    } else if(type === "stun"){
      var target = this.server.getEntityById(targetId);
      var stunLevel = this.skillHandler.getLevel("stun");
      var now = (new Date).getTime();
      if(target
      && stunLevel > 0
      && (now - this.stunExecuted) > 30 * 1000
      && this.mana >= 150) {
        this.broadcast(new Messages.Skill("stun", targetId, stunLevel), false);
        this.stunExecuted = now;
        this.mana -= 150;
        this.server.pushToPlayer(this, new Messages.Mana(this));
      }
    } else if(type === "superCat"){
      var superCatLevel = this.skillHandler.getLevel("superCat");
      var now = (new Date).getTime();
      if(superCatLevel > 0 && (now - this.superCatExecuted) > 90 * 1000
      && this.mana >= 200 && this.superCatCallback == null){
        this.broadcast(new Messages.Skill("superCat", this.id, superCatLevel), false);
        this.superCatExecuted = now;
        this.mana -= 200;
        this.server.pushToPlayer(this, new Messages.Mana(this));
        this.superCatCallback = setTimeout(function () {
          self.superCatCallback = null;
          self.broadcast(new Messages.Skill("superCatOff", self.id, 0), false);
        }, 30*1000);
      }
    } else if(type === "provocation"){
      var target = this.server.getEntityById(targetId);
      var provocationLevel = this.skillHandler.getLevel("provocation");
      var now = (new Date).getTime();
      if(target
      && provocationLevel > 0
      && (now - this.provocationExecuted) > 15 * 1000
      && this.mana >= 50) {
        this.broadcast(new Messages.Skill("provocation", targetId, provocationLevel), false);
        this.provocationExecuted = now;
        this.mana -= 50;
        this.server.pushToPlayer(this, new Messages.Mana(this));
        this.server.provocateMob(this, target);
      }
    }
  },
  handleFlareDance: function(message){
    if(this.flareDanceCallback) {
      var flareDanceLevel = this.skillHandler.getLevel("flareDance"),
          now = (new Date).getTime();
      if((flareDanceLevel > 0) && ((now - this.flareDanceExecuted2) >= 720) && (this.flareDanceCount < 10)) {
        var i=1;
        var dmg = this.level;

        this.flareDanceExecuted2 = now;
        this.flareDanceCount++;

        if(flareDanceLevel == 2) {
          dmg = Math.floor(this.level * 1.4);
        } else if(flareDanceLevel == 3){
          dmg = Math.floor(this.level * 1.7);
        } else if(flareDanceLevel == 4){
          dmg = Math.floor(this.level * 2);
        }

        for(i=1; i<5; i++){
          var mob = this.server.getEntityById(message[i]);
          if(mob){
            mob.receiveDamage(dmg, this.id);
            if(mob.hitPoints <= 0){
              this.questAboutKill(mob);
            }
            this.server.handleMobHate(mob.id, this.id, dmg);
            this.server.handleHurtEntity(mob, this, dmg);
          }
        }
      }
    }
  },
  handleStoreSell: function(message) {
    var inventoryNumber1 = message[1],
        itemKind = null,
        price = 0,
        inventoryNumber2 = -1;

    if((inventoryNumber1 >= 0) && (inventoryNumber1 < this.inventory.number)) {
      itemKind = this.inventory.rooms[inventoryNumber1].itemKind;
      if(itemKind) {
        price = Types.Store.getSellPrice(Types.getKindAsString(itemKind));
        if(price > 0) {
          inventoryNumber2 = this.inventory.getInventoryNumber(Types.Entities.BURGER);
          if(inventoryNumber2 < 0) {
            inventoryNumber2 = this.inventory.getEmptyInventoryNumber();
          }
          if(inventoryNumber2 < 0) {
            this.server.pushToPlayer(this, new Messages.Notify("인벤토리에 공간이 부족 합니다."));
            return;
          }
          this.inventory.makeEmptyInventory(inventoryNumber1);
          this.inventory.putInventory(Types.Entities.BURGER, price, 0, 0);
        }
      }
    }
  },
  handleStoreBuy: function(message) {
    var itemType = message[1],
        itemKind = message[2],
        itemCount = message[3],
        itemName = null,
        price = 0,
        burgerCount = 0,
        inventoryNumber = -1,
        buyCount = 0;

    if(itemCount <= 0) {
      return;
    }
    if(itemKind) {
      itemName = Types.getKindAsString(itemKind);
    }
    if(itemName) {
      price = Types.Store.getBuyPrice(itemName);
      if(price > 0) {
        if(Types.Store.isBuyMultiple(itemName)) {
          price = price * itemCount;
        } else {
          itemCount = 1;
        }
        burgerCount = this.inventory.getItemNumber(Types.Entities.BURGER);
        if(burgerCount < price) {
          this.server.pushToPlayer(this, new Messages.Notify("버거가 부족 합니다."));
          return;
        }

        if(this.inventory.hasEmptyInventory()) {
          this.inventory.putInventory(itemKind, Types.Store.getBuyCount(itemName) * itemCount, 0, 0);
          this.inventory.putInventory(Types.Entities.BURGER, -1 * price, 0, 0);
        } else {
          this.server.pushToPlayer(this, new Messages.Notify("인벤토리에 빈 칸이 없습니다."));
        }
      }
    }
  },
  handleHoldingPubPoint: function(message){
    var command = message[1];
    var ref = message[2];

    databaseHandler.handleHoldingPubPoint(this, command, ref);
  },
  handleSkillInstall: function(message) {
    var index = message[1],
        name = message[2],
        self = this;

    if(((index >= 0) && (index < this.skillHandler.skillSlots.length)) && (name in Types.Player.Skills)) {
      databaseHandler.handleSkillInstall(this, index, name, function() {
        self.skillHandler.install(index, name);
        self.server.pushToPlayer(self, new Messages.SkillInstall(index, name));
      });
    }
  },
  getRanking: function() {
    databaseHandler.getPlayerRanking(this, function(ranking){
      log.debug("Ranking: " + ranking);
    });
  }
});
