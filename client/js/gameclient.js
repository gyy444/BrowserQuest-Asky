
define(['player', 'entityfactory'], function(Player, EntityFactory) {

    var GameClient = Class.extend({
        init: function(host, port, game) {
            this.connection = null;
            this.host = host;
            this.port = port;
            this.game = game;
    
            this.connected_callback = null;
            this.spawn_callback = null;
            this.movement_callback = null;

            this.wrongpw_callback = null;
            this.ban_callback = null;

            this.notify_callback = null;
            this.wanted_callback = null;
            this.levelup_callback = null;
        
            this.handlers = [];
            this.handlers[Types.Messages.WELCOME] = this.receiveWelcome;
            this.handlers[Types.Messages.MOVE] = this.receiveMove;
            this.handlers[Types.Messages.LOOTMOVE] = this.receiveLootMove;
            this.handlers[Types.Messages.ATTACK] = this.receiveAttack;
            this.handlers[Types.Messages.SPAWN] = this.receiveSpawn;
            this.handlers[Types.Messages.DESPAWN] = this.receiveDespawn;
            this.handlers[Types.Messages.SPAWN_BATCH] = this.receiveSpawnBatch;
            this.handlers[Types.Messages.HEALTH] = this.receiveHealth;
            this.handlers[Types.Messages.CHAT] = this.receiveChat;
            this.handlers[Types.Messages.EQUIP] = this.receiveEquipItem;
            this.handlers[Types.Messages.DROP] = this.receiveDrop;
            this.handlers[Types.Messages.TELEPORT] = this.receiveTeleport;
            this.handlers[Types.Messages.DAMAGE] = this.receiveDamage;
            this.handlers[Types.Messages.POPULATION] = this.receivePopulation;
            this.handlers[Types.Messages.LIST] = this.receiveList;
            this.handlers[Types.Messages.DESTROY] = this.receiveDestroy;
            this.handlers[Types.Messages.KILL] = this.receiveKill;
            this.handlers[Types.Messages.HP] = this.receiveHitPoints;
            this.handlers[Types.Messages.BLINK] = this.receiveBlink;
            this.handlers[Types.Messages.PVP] = this.receivePVP;
            this.handlers[Types.Messages.INVENTORY] = this.receiveInventory;
            this.handlers[Types.Messages.QUEST] = this.receiveQuest;
            this.handlers[Types.Messages.TALKTONPC] = this.receiveTalkToNPC;
            this.handlers[Types.Messages.BOARD] = this.receiveBoard;
            this.handlers[Types.Messages.NOTIFY] = this.receiveNotify;
            this.handlers[Types.Messages.KUNG] = this.receiveKung;
            this.handlers[Types.Messages.WANTED] = this.receiveWanted;
            this.handlers[Types.Messages.LEVELUP] = this.receiveLevelUp;
            this.handlers[Types.Messages.PARTY] = this.receiveParty;
            this.handlers[Types.Messages.STATE] = this.receiveState;
            this.handlers[Types.Messages.RANKING] = this.receiveRanking;
            this.handlers[Types.Messages.SHOP] = this.receiveShop;
            this.handlers[Types.Messages.LOG] = this.receiveLog;
            this.handlers[Types.Messages.SKILL] = this.receiveSkill;
            this.handlers[Types.Messages.CHARACTERINFO] = this.receiveCharacterInfo;
            this.handlers[Types.Messages.CHARACTERBYIP] = this.receiveCharacterByIp;
            this.handlers[Types.Messages.STOREOPEN] = this.receiveStoreOpen;
            this.handlers[Types.Messages.SKILLINSTALL] = this.receiveSkillInstall;
            this.handlers[Types.Messages.MANA] = this.receiveMana;
        
            this.enable();
        },
    
        enable: function() {
            this.isListening = true;
        },
    
        disable: function() {
            this.isListening = false;
        },
        
        connect: function(dispatcherMode) {
            var url = "ws://"+ this.host +":"+ this.port +"/",
                self = this;
            
            log.info("Trying to connect to server : "+url);

            if(window.MozWebSocket) {
                this.connection = new MozWebSocket(url);
            } else {
                this.connection = new WebSocket(url);
            }
            
            if(dispatcherMode) {
                this.connection.onmessage = function(e) {
                    var reply = JSON.parse(e.data);

                    if(reply.status === 'OK') {
                        self.dispatched_callback(reply.host, reply.port);
                    } else if(reply.status === 'FULL') {
                        alert("BBO is currently at maximum player population. Please retry later.");
                    } else {
                        alert("Unknown error while connecting to BBO.");
                    }
                };
            } else {
                this.connection.onopen = function(e) {
                    log.info("Connected to server "+self.host+":"+self.port);
                };

                this.connection.onmessage = function(e) {
                    if(e.data === "go") {
                        if(self.connected_callback) {
                            self.connected_callback();
                        }
                        return;
                    }
                    if(e.data === 'timeout') {
                        self.isTimeout = true;
                        return;
                    }
                    if(e.data === 'wrongpw'){
                        if(self.wrongpw_callback){
                            self.wrongpw_callback();
                        }
                        return;
                    }
                    if(e.data === 'ban'){
                        if(self.ban_callback){
                            self.ban_callback();
                        }
                        return;
                    }
                    if(e.data === 'alreadyExist'){
                        if(self.alreadyExist_callback){
                            self.alreadyExist_callback();
                        }
                        return;
                    }

                    
                    self.receiveMessage(e.data);
                };

                this.connection.onerror = function(e) {
                    log.error(e, true);
                };

                this.connection.onclose = function() {
                    log.debug("Connection closed");
                    $('#container').addClass('error');

                    if(self.disconnected_callback) {
                        if(self.isTimeout) {
                            self.disconnected_callback("You have been disconnected for being inactive for too long");
                        } else{
                            self.disconnected_callback("The connection to ASKY has been lost");
                        }
                    }
                };
            }
        },

        sendMessage: function(json) {
            var data;
            if(this.connection.readyState === 1) {
                data = JSON.stringify(json);
                this.connection.send(data);
            }
        },

        receiveMessage: function(message) {
            var data, action;
        
            if(this.isListening) {
                data = JSON.parse(message);

                log.debug("data: " + message);

                if(data instanceof Array) {
                    if(data[0] instanceof Array) {
                        // Multiple actions received
                        this.receiveActionBatch(data);
                    } else {
                        // Only one action received
                        this.receiveAction(data);
                    }
                }
            }
        },
    
        receiveAction: function(data) {
            var action = data[0];
            if(this.handlers[action] && _.isFunction(this.handlers[action])) {
                this.handlers[action].call(this, data);
            }
            else {
                log.error("Unknown action : " + action);
            }
        },
    
        receiveActionBatch: function(actions) {
            var self = this;

            _.each(actions, function(action) {
                self.receiveAction(action);
            });
        },
    
        receiveWelcome: function(data) {
            data.shift();
            var id = data.shift(),
                name = data.shift(),
                x = data.shift(),
                y = data.shift(),
                hp = data.shift(),
                mana = data.shift(),
                armor = Types.getKindAsString(data.shift()),
                weapon = Types.getKindAsString(data.shift()),
                avatar = Types.getKindAsString(data.shift()),
                weaponAvatar = Types.getKindAsString(data.shift()),
                experience = data.shift(),
                admin = data.shift();
                rank = data.shift();
            var i=0;
            var questFound = [];
            var questProgress = [];
            for(i=0; i < Types.Quest.TOTAL_QUEST_NUMBER + 4; i++){
              questFound.push(data.shift());
              questProgress.push(data.shift());
            }
            var kind = data.shift();
            var maxInventoryNumber = data.shift();
            var inventory = [];
            var inventoryNumber = [];
            var inventorySkillKind = [];
            var inventorySkillLevel = [];
            while(data.length > 0){
              inventory.push(data.shift());
              inventoryNumber.push(data.shift());
              inventorySkillKind.push(data.shift());
              inventorySkillLevel.push(data.shift());
            }
            if(this.game.ready){
                this.welcome_callback(
                     id, name, x, y, hp, mana, armor, weapon,
                     avatar, weaponAvatar,
                     experience, admin, rank, inventory, inventoryNumber,
                     questFound, questProgress,
                     maxInventoryNumber, kind,
                     inventorySkillKind, inventorySkillLevel);
            }
        },
    
        receiveMove: function(data) {
            var id = data[1],
                x = data[2],
                y = data[3];
        
            if(this.move_callback) {
                this.move_callback(id, x, y);
            }
        },
    
        receiveLootMove: function(data) {
            var id = data[1], 
                item = data[2];
        
            if(this.lootmove_callback) {
                this.lootmove_callback(id, item);
            }
        },
    
        receiveAttack: function(data) {
            var attacker = data[1], 
                target = data[2];
        
            if(this.attack_callback) {
                this.attack_callback(attacker, target);
            }
        },
    
        receiveSpawn: function(data) {
            var id = data[1],
                kind = data[2],
                x = data[3],
                y = data[4],
                count = data[5];
        
            if(Types.isItem(kind)) {
                var item = EntityFactory.createEntity(kind, id);
                item.count = count;
                
                if(this.spawn_item_callback) {
                    this.spawn_item_callback(item, x, y);
                }
            } else if(Types.isChest(kind)) {
                var item = EntityFactory.createEntity(kind, id);
            
                if(this.spawn_chest_callback) {
                    this.spawn_chest_callback(item, x, y);
                }
            } else {
                var name, orientation, target, weapon, armor, level, rank;

                if(Types.isPlayer(kind)) {
                    name = data[5];
                    orientation = data[6];
                    armor = data[7];
                    weapon = data[8];
                    level = data[9];
                    admin = data[10];
                    rank = data[11];
                    if(data.length > 12) {
                        target = data[12];
                    }
                }
                else if(Types.isMob(kind)) {
                    orientation = data[5];
                    if(data.length > 6) {
                        target = data[6];
                    }
                }

                var character = EntityFactory.createEntity(kind, id, name);

                if(character instanceof Player) {
                    character.weaponName = Types.getKindAsString(weapon);
                    character.spriteName = Types.getKindAsString(armor);
                    character.level = level;
                    character.admin = admin;
                    character.rank = rank;
                }

                if(this.spawn_character_callback) {
                    this.spawn_character_callback(character, x, y, orientation, target);
                }
            }
        },

        receiveDespawn: function(data) {
            var id = data[1];
        
            if(this.despawn_callback) {
                this.despawn_callback(id);
            }
        },
    
        receiveHealth: function(data) {
            var points = data[1],
                attackerKind = data[2],
                isRegen = false;
        
            if(data[3]) {
                isRegen = true;
            }
        
            if(this.health_callback) {
                this.health_callback(points, attackerKind, isRegen);
            }
        },
    
        receiveChat: function(data) {
            var id = data[1],
                text = data[2];
        
            if(this.chat_callback) {
                this.chat_callback(id, text);
            }
        },
    
        receiveEquipItem: function(data) {
            var id = data[1],
                itemKind = data[2];
        
            if(this.equip_callback) {
                this.equip_callback(id, itemKind);
            }
        },
    
        receiveDrop: function(data) {
            var mobId = data[1],
                id = data[2],
                kind = data[3],
                count = data[4],
                skillKind = data[5],
                skillLevel = data[6];
        
            var item = EntityFactory.createEntity(kind, id, '', skillKind, skillLevel);
            item.count = count;
            item.wasDropped = true;
        
            if(this.drop_callback) {
                this.drop_callback(item, mobId);
            }
        },
    
        receiveTeleport: function(data) {
            var id = data[1],
                x = data[2],
                y = data[3];
        
            if(this.teleport_callback) {
                this.teleport_callback(id, x, y);
            }
        },
    
        receiveDamage: function(data) {
            var id = data[1],
                dmg = data[2],
                hp = parseInt(data[3]),
                maxHp = parseInt(data[4]);
        
            if(this.dmg_callback) {
                this.dmg_callback(id, dmg, hp, maxHp);
            }
        },
    
        receivePopulation: function(data) {
            var worldPlayers = data[1],
                totalPlayers = data[2];
        
            if(this.population_callback) {
                this.population_callback(worldPlayers, totalPlayers);
            }
        },
    
        receiveKill: function(data) {
            var level = data[1];
            var exp = data[2];
        
            if(this.kill_callback) {
                this.kill_callback(level, exp);
            }
        },
    
        receiveList: function(data) {
            data.shift();
        
            if(this.list_callback) {
                this.list_callback(data);
            }
        },
    
        receiveDestroy: function(data) {
            var id = data[1];
        
            if(this.destroy_callback) {
                this.destroy_callback(id);
            }
        },
    
        receiveHitPoints: function(data) {
            var maxHp = data[1];
            var maxMana = data[2];
        
            if(this.hp_callback) {
                this.hp_callback(maxHp, maxMana);
            }
        },
    
        receiveBlink: function(data) {
            var id = data[1];
        
            if(this.blink_callback) {
                this.blink_callback(id);
            }
        },
        receivePVP: function(data){
            var pvp = data[1];
            if(this.pvp_callback){
                this.pvp_callback(pvp);
            }
        },
        receiveInventory: function(data){
            var inventoryNumber = data[1];
            var itemKind = data[2];
            var itemCount = data[3];
            var itemSkillKind = data[4];
            var itemSkillLevel = data[5];
            if(this.inventory_callback){
                this.inventory_callback(inventoryNumber, itemKind, itemCount, itemSkillKind, itemSkillLevel);
            }
        },
        receiveQuest: function(data){
            data.shift();
            if(this.quest_callback){
                this.quest_callback(data);
            }
        },
        receiveTalkToNPC: function(data){
            data.shift();
            var npcKind = data.shift();
            var isCompleted = data.shift();
            if(this.talkToNPC_callback){
                this.talkToNPC_callback(npcKind, isCompleted);
            }
        },
        receiveBoard: function(data){
            if(this.board_callback){
                this.board_callback(data);
            }
        },

        receiveNotify: function(data){
            var msg = data[1];
            if(this.notify_callback){
                this.notify_callback(msg);
            }
        },
        receiveKung: function(data){
            var msg = data[1];
            if(this.kung_callback){
                this.kung_callback(msg);
            }
        },
        receiveWanted: function (data) {
            var id = data[1],
                isWanted = data[2];
            if(this.wanted_callback) {
                this.wanted_callback(id, isWanted);
            }
        },
        receiveLevelUp: function (data) {
            var id = data[1],
                level = data[2];
            if(this.levelup_callback) {
                this.levelup_callback(id, level);
            }
        },
        receiveParty: function (data) {
            data.shift();
            if(this.party_callback) {
                this.party_callback(data);
            }
        },
        receiveState: function(data){
            data.shift();
            if(this.state_callback){
                this.state_callback(data);
            }
        },
        receiveRanking: function(data){
            data.shift();
            if(this.ranking_callback){
                this.ranking_callback(data);
            }
        },
        receiveShop: function(data){
            data.shift();
            if(this.shop_callback){
                this.shop_callback(data);
            }
        },
        receiveLog: function(data){
            data.shift();
            if(this.log_callback){
                this.log_callback(data);
            }
        },
        receiveSkill: function(data){
            data.shift();
            if(this.skill_callback){
                this.skill_callback(data);
            }
        },
        receiveCharacterInfo: function(data) {
          if(this.characterInfo_callback) {
            data.shift();
            this.characterInfo_callback(data);
          }
        },
        receiveCharacterByIp: function(data) {
          if(this.characterByIp_callback) {
            data.shift();
            this.characterByIp_callback(data);
          }
        },
        receiveStoreOpen: function(data) {
          if(this.storeOpen_callback) {
            data.shift();
            this.storeOpen_callback(data);
          }
        },
        receiveSkillInstall: function(data) {
          if(this.skillInstall_callback) {
            data.shift();
            this.skillInstall_callback(data);
          }
        },
        receiveMana: function(data) {
          if(this.mana_callback) {
            var mana = data[1];
            var maxMana = data[2];
            this.mana_callback(mana, maxMana);
          }
        },

        
        onDispatched: function(callback) { this.dispatched_callback = callback; },
        onConnected: function(callback) { this.connected_callback = callback; },
        onDisconnected: function(callback) { this.disconnected_callback = callback; },
        onWelcome: function(callback) { this.welcome_callback = callback; },
        onSpawnCharacter: function(callback) { this.spawn_character_callback = callback; },
        onSpawnItem: function(callback) { this.spawn_item_callback = callback; },
        onSpawnChest: function(callback) { this.spawn_chest_callback = callback; },
        onDespawnEntity: function(callback) { this.despawn_callback = callback; },
        onEntityMove: function(callback) { this.move_callback = callback; },
        onEntityAttack: function(callback) { this.attack_callback = callback; },
        onPlayerChangeHealth: function(callback) { this.health_callback = callback; },
        onPlayerEquipItem: function(callback) { this.equip_callback = callback; },
        onPlayerMoveToItem: function(callback) { this.lootmove_callback = callback; },
        onPlayerTeleport: function(callback) { this.teleport_callback = callback; },
        onChatMessage: function(callback) { this.chat_callback = callback; },
        onDropItem: function(callback) { this.drop_callback = callback; },
        onPlayerDamageMob: function(callback) { this.dmg_callback = callback; },
        onPlayerKillMob: function(callback) { this.kill_callback = callback; },
        onPopulationChange: function(callback) { this.population_callback = callback; },
        onEntityList: function(callback) { this.list_callback = callback; },
        onEntityDestroy: function(callback) { this.destroy_callback = callback; },
        onPlayerChangeMaxHitPoints: function(callback) { this.hp_callback = callback; },
        onItemBlink: function(callback) { this.blink_callback = callback; },
        onPVPChange: function(callback){ this.pvp_callback = callback; },
        onInventory: function(callback){ this.inventory_callback = callback; },
        onQuest: function(callback){ this.quest_callback = callback; },
        onTalkToNPC: function(callback){ this.talkToNPC_callback = callback; },
        onBoard: function(callback){ this.board_callback = callback; },
        onNotify: function(callback){ this.notify_callback = callback; },
        onKung: function(callback){ this.kung_callback = callback; },
        onWanted: function (callback) { this.wanted_callback = callback; },
        onLevelUp: function (callback) { this.levelup_callback = callback; },
        onParty: function (callback) { this.party_callback = callback; },
        onState: function (callback) { this.state_callback = callback; },
        onRanking: function (callback) { this.ranking_callback = callback; },
        onShop: function (callback) { this.shop_callback = callback; },
        onLog: function (callback) { this.log_callback = callback; },
        onSkill: function (callback) { this.skill_callback = callback; },
        onCharacterInfo: function(callback) {this.characterInfo_callback = callback; },
        onCharacterByIp: function(callback) {this.characterByIp_callback = callback; },
        onStoreOpen: function(callback) {this.storeOpen_callback = callback; },
        onSkillInstall: function(callback) {this.skillInstall_callback = callback; },
        onMana: function(callback) {this.mana_callback = callback; },

        sendHello: function(name, pw, email, isJoin, language) {
            this.sendMessage([Types.Messages.HELLO,
                              name,
                              pw[0], pw[1], pw[2], pw[3], pw[4], pw[5], pw[6],
                              pw[7], pw[8], pw[9], pw[10], pw[11], pw[12],
                              pw[13], pw[14],
                              email, isJoin, language]);
        },

        sendMove: function(x, y) {
            this.sendMessage([Types.Messages.MOVE,
                              x,
                              y]);
        },
    
        sendLootMove: function(item, x, y) {
            this.sendMessage([Types.Messages.LOOTMOVE,
                              x,
                              y,
                              item.id]);
        },
    
        sendAggro: function(mob) {
            this.sendMessage([Types.Messages.AGGRO,
                              mob.id]);
        },
    
        sendAttack: function(mob) {
            this.sendMessage([Types.Messages.ATTACK,
                              mob.id]);
        },
    
        sendHit: function(mob) {
            this.sendMessage([Types.Messages.HIT,
                              mob.id]);
        },
    
        sendHurt: function(mob) {
            this.sendMessage([Types.Messages.HURT,
                              mob.id]);
        },
    
        sendChat: function(text) {
            this.sendMessage([Types.Messages.CHAT,
                              text]);
        },
    
        sendLoot: function(item) {
            this.sendMessage([Types.Messages.LOOT,
                              item.id]);
        },
    
        sendTeleport: function(x, y) {
            this.sendMessage([Types.Messages.TELEPORT,
                              x,
                              y]);
        },
    
        sendWho: function(ids) {
            ids.unshift(Types.Messages.WHO);
            this.sendMessage(ids);
        },
    
        sendZone: function() {
            this.sendMessage([Types.Messages.ZONE]);
        },
    
        sendOpen: function(chest) {
            this.sendMessage([Types.Messages.OPEN,
                              chest.id]);
        },
    
        sendCheck: function(id) {
            this.sendMessage([Types.Messages.CHECK,
                              id]);
        },
        sendInventory: function(type, inventoryNumber, count){
            this.sendMessage([Types.Messages.INVENTORY,
                              type, inventoryNumber, count]);
        },
        sendQuest: function(id, type){
            this.sendMessage([Types.Messages.QUEST,
                              id, type]);
        },
        sendTalkToNPC: function(kind){
            this.sendMessage([Types.Messages.TALKTONPC,
                              kind]);
        },
        sendMagic: function(magicName, target){
            this.sendMessage([Types.Messages.MAGIC,
                              magicName, target]);
        },
        sendBoard: function(command, number, replynumber){
          this.sendMessage([Types.Messages.BOARD,
                            command,
                            number,
                            replynumber]);
        },
        sendBoardWrite: function(command, title, content){
          this.sendMessage([Types.Messages.BOARDWRITE,
                            command,
                            title,
                            content]);
        },
        sendKung: function(word) {
            this.sendMessage([Types.Messages.KUNG,
                              word]);
        },
        sendState: function(command){
            this.sendMessage([Types.Messages.STATE,
                              command]);
        },
        sendRanking: function(command){
            this.sendMessage([Types.Messages.RANKING,
                              command]);
        },
        sendSell: function(inventoryNumber, count){
            this.sendMessage([Types.Messages.SELL,
                              inventoryNumber,
                              count]);
        },
        sendShop: function(command, number){
            this.sendMessage([Types.Messages.SHOP,
                              command,
                              number]);
        },
        sendBuy: function(number, itemKind, burgerCount){
            this.sendMessage([Types.Messages.BUY,
                              number,
                              itemKind,
                              burgerCount]);
        },
        sendNewCharacter: function(name, pw, email){
            this.sendMessage([Types.Messages.NEWCHARACTER,
                              name,
                              pw[0], pw[1], pw[2], pw[3], pw[4], pw[5], pw[6],
                              pw[7], pw[8], pw[9], pw[10], pw[11], pw[12],
                              pw[13], pw[14],
                              email]);
        },
        sendPasswordChange: function(curpw, newpw, email){
            this.sendMessage([Types.Messages.PWCHANGE,
                              curpw[0], curpw[1], curpw[2], curpw[3], curpw[4],
                              curpw[5], curpw[6], curpw[7], curpw[8], curpw[9],
                              curpw[10], curpw[11], curpw[12], curpw[13],
                              curpw[14],
                              newpw[0], newpw[1], newpw[2], newpw[3], newpw[4],
                              newpw[5], newpw[6], newpw[7], newpw[8], newpw[9],
                              newpw[10], newpw[11], newpw[12], newpw[13],
                              newpw[14],
                              email]);
        },
        sendLog: function(name, startTime, endTime){
            this.sendMessage([Types.Messages.LOG,
                              name,
                              startTime,
                              endTime]);
        },
        sendSkill: function(type, targetId){
            this.sendMessage([Types.Messages.SKILL,
                              type, targetId]);
        },
        sendFlareDance: function(mobIds){
            mobIds.unshift(Types.Messages.FLAREDANCE);
            this.sendMessage(mobIds);
        },
        sendCharacterInfo: function() {
          this.sendMessage([Types.Messages.CHARACTERINFO]);
        },
        sendStoreSell: function(inventoryNumber) {
          this.sendMessage([Types.Messages.STORESELL, inventoryNumber]);
        },
        sendStoreBuy: function(itemType, itemKind, itemCount) {
          this.sendMessage([Types.Messages.STOREBUY, itemType, itemKind, itemCount]);
        },
        sendHoldingPubPoint: function(command, ref) {
          this.sendMessage([Types.Messages.HOLDINGPUBPOINT, command, ref]);
        },
        sendSkillInstall: function(index, name) {
          this.sendMessage([Types.Messages.SKILLINSTALL, index, name]);
        },
    });
    
    return GameClient;
});
