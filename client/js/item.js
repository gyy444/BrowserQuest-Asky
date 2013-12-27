define(['entity'], function(Entity) {
  var Item = Entity.extend({
    init: function(id, kind, type, skillKind, skillLevel) {
      this._super(id, kind);
      this.itemKind = Types.getKindAsString(kind);
      this.type = type;
      this.wasDropped = false;
      this.skillKind = skillKind;
      this.skillLevel = skillLevel;

      if(Types.isHealingItem(kind)){    	    
        this.count = 1;
      } else{
        this.count = 0;
      }
    },
    hasShadow: function() {
      return true;
    },
    onLoot: function(player) {
      if(this.type === "weapon") {
        player.switchWeapon(this.itemKind);
      } else if(this.type === "armor"){
        if(player.level < 100){
          player.armorloot_callback(this.itemKind);
        }
      }
    },
    getSpriteName: function() {
      return "item-"+ this.itemKind;
    },
    getInfoMsg: function(language){
      return this.getInfoMsgEx(this.kind, this.count, this.skillKind, this.skillLevel, language);
    },
    getInfoMsgEx: function(itemKind, enchantedPoint, skillKind, skillLevel, language) {
      var msg = '';
      if(Types.isWeapon(itemKind) || Types.isArcherWeapon(itemKind)){
        msg = Types.getName(itemKind, language) + ": Attack +" + (Types.getWeaponRank(itemKind)+1)+ (enchantedPoint ? "(" + enchantedPoint + ")" : "");
        if(skillKind === Types.Skills.BLOODSUCKING){
          msg += " " + Types.getItemSkillNameByKind(skillKind, language) + " " + "+" + skillLevel*2 + "%";
        } else if(skillKind === Types.Skills.CRITICALRATIO){
          msg += " " + Types.getItemSkillNameByKind(skillKind, language) + " " + "+" + skillLevel + "%";
        }
        return msg;
      } else if(Types.isArmor(itemKind) || Types.isArcherArmor(itemKind)){
        return Types.getName(itemKind, language) + ": Armor +" + (Types.getArmorRank(itemKind)+1)+(enchantedPoint ? "(" + enchantedPoint + ")" : "");
      } else if(Types.isPendant(itemKind)) {
        msg = Types.getName(itemKind, language) + ": Armor +" + ((Types.getPendantRank(itemKind) + 1) * 0.5).toFixed(2) + "%" + (enchantedPoint ? "(" + enchantedPoint + ")" : "");
        msg += " " + Types.getItemSkillNameByKind(skillKind, language) + " +" + skillLevel;
        return msg;
      } else if(Types.isRing(itemKind)) {
        msg = Types.getName(itemKind, language) + ": Attack +" + ((Types.getRingRank(itemKind) + 1) * 0.5).toFixed(2) + "%" + (enchantedPoint ? "(" + enchantedPoint + ")" : "");
        msg += " " + Types.getItemSkillNameByKind(skillKind, language) + " +" + skillLevel;
        return msg;
      } else if(Types.isBoots(itemKind)) {
        msg = Types.getName(itemKind, language);
        return msg;
      }
      switch(itemKind){
        case Types.Entities.FLASK: return Types.getName(itemKind, language) + ": HP +80";
        case Types.Entities.BURGER: return Types.getName(itemKind, language) + ": HP +200";
        case Types.Entities.ROYALAZALEA: return Types.getName(itemKind, language) + ": Demage x0.66";
        case Types.Entities.SNOWPOTION: return Types.getName(itemKind, language);
        case Types.Entities.BLACKPOTION: return Types.getName(itemKind, language);
      }
      return '';
    }
  });
  Item.getInfoMsgEx = Item.prototype.getInfoMsgEx;
  return Item;
});
