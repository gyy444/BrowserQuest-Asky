define(['character', 'mob', 'skillhandler'], function(Character, Mob, SkillHandler) {
  var Player = Character.extend({
    init: function(id, name, kind, game) {
      this._super(id, kind);
       
      this.name = name;
      this.game = game;

      if(game){
        this.skillHandler = new SkillHandler(game);
      }
        
      // Renderer
      this.nameOffsetY = -10;
        
      // sprites
      this.spriteName = "clotharmor";
      this.armorName = "clotharmor";
      this.weaponName = "sword1";

      // modes
      this.isLootMoving = false;
      this.isSwitchingWeapon = true;

      // PVP Flag
      this.pvpFlag = false;

      // Benef
      this.invincible = false;
      this.isRoyalAzaleaBenef = false;

      this.isWanted = false;

      this.healCooltimeCallback = null;
      this.healCooltimeCounter = 0;

      this.flareDanceCooltimeCallback = null;
      this.flareDanceCooltimeCounter = 0;
      this.flareDanceMsgCooltimeCounter = 0;
    },
    setSkill: function(level){
      this.skillHandler.add('evasion', level);
    },
    setBloodSuckingSkill: function(level){
      this.skillHandler.add('bloodSucking', level);
    },
    setCriticalStrikeSkill: function(level){
      this.skillHandler.add('criticalStrike', level);
    },
    setHealSkill: function(level){
      this.skillHandler.add('heal', level);
    },
    setFlareDanceSkill: function(level){
      this.skillHandler.add('flareDance', level);
    },
    setStunSkill: function(level){
      this.skillHandler.add('stun', level);
    },
    setSuperCatSkill: function(level){
      this.skillHandler.add('superCat', level);
    },
    setProvocationSkill: function(level){
      this.skillHandler.add('provocation', level);
    },
    flareDanceAttack: function(){
      var adjacentMobIds = [];
      var entity = null;
      var x = this.gridX-1;
      var y = this.gridY-1;
      for(x = this.gridX-1; x < this.gridX+2; x++){
        for(y = this.gridY-1; y < this.gridY+2; y++){
          entity = this.game.getMobAt(x, y);
          if(entity){
            adjacentMobIds.push(entity.id);
          }
        }
      }
      if(adjacentMobIds.length > 0){
        var i = 4;
        for(i = adjacentMobIds.length; i < 4; i++){
          adjacentMobIds.push(0);
        }
        if(adjacentMobIds.length > 4){
          adjacentMobIds = adjacentMobIds.slice(0,4);
        }
        this.game.client.sendFlareDance(adjacentMobIds);
      }
    },

    isMovingToLoot: function() {
      return this.isLootMoving;
    },
    getSpriteName: function() {
      return this.spriteName;
    },
    setSpriteName: function(name) {
      if(name){
        this.spriteName = name;
      } else{
        this.spriteName = this.armorName;
      }
    },
    getArmorName: function() {
      return this.armorName;
    },
    getArmorSprite: function() {
      return this.sprite;
    },
    setArmorName: function(name){
      this.armorName = name;
    },
    getWeaponName: function() {
      return this.weaponName;
    },
    setWeaponName: function(name) {
      this.weaponName = name;
    },
    hasWeapon: function() {
      return this.weaponName !== null;
    },
    setBenef: function(itemKind){
      switch(itemKind){
        case Types.Entities.FIREBENEF:
          this.startInvincibility();
          break;
        case Types.Entities.ROYALAZALEABENEF:
          this.startRoyalAzaleaBenef();
          break;
        case Types.Entities.DEBENEF:
          this.stopInvincibility();
          break;
      }
    },
    switchArmor: function(armorName, sprite){
      this.setSpriteName(armorName);
      this.setSprite(sprite);
      this.setArmorName(armorName);
      if(this.switch_callback) {
        this.switch_callback();
      }
    },
    switchWeapon: function(newWeaponName) {
      var count = 14, 
          value = false, 
          self = this;
        
      var toggle = function() {
          value = !value;
          return value;
      };
        
      if(newWeaponName !== this.getWeaponName()) {
        if(this.isSwitchingWeapon) {
          clearInterval(blanking);
        }
            
        this.switchingWeapon = true;
        var blanking = setInterval(function() {
          if(toggle()) {
            self.setWeaponName(newWeaponName);
          } else {
            self.setWeaponName(null);
          }

          count -= 1;
          if(count === 1) {
            clearInterval(blanking);
            self.switchingWeapon = false;
                    
            if(self.switch_callback) {
              self.switch_callback();
            }
          }
        }, 90);
      }
    },
    onArmorLoot: function(callback){
      this.armorloot_callback = callback;
    },
    startInvincibility: function() {
      var self = this;
        
      if(!this.invincible) {
        this.invincible = true;
      } else {
        if(this.invincibleTimeout) {
          clearTimeout(this.invincibleTimeout);
        }
      }
      this.invincibleTimeout = setTimeout(function() {
        self.stopInvincibility();
        self.idle();
      }, 15000);
    },
    stopInvincibility: function() {
      this.invincible = false;
        
      if(this.invincibleTimeout) {
        clearTimeout(this.invincibleTimeout);
      }
    },
    startRoyalAzaleaBenef: function() {
      var self = this;
        
      if(!this.isRoyalAzaleaBenef) {
        this.isRoyalAzaleaBenef = true;
      } else {
        if(this.royalAzaleaBenefTimeout) {
          clearTimeout(this.royalAzaleaBenefTimeout);
        }
      }
      this.royalAzaleaBenefTimeout = setTimeout(function() {
        self.stopRoyalAzaleaBenef();
        self.idle();
      }, 15000);
    },
    stopRoyalAzaleaBenef: function(){
      this.isRoyalAzaleaBenef = false;
        
      if(this.royalAzaleaBenefTimeout) {
        clearTimeout(this.royalAzaleaBenefTimeout);
      }
    },
    flagPVP: function(pvpFlag){
      this.pvpFlag = pvpFlag;
    },
  });

  return Player;
});
