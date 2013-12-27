var cls = require("./lib/class"),
    Messages = require("./message"),
    Utils = require("./utils"),
    Properties = require("./properties"),
    Types = require("../../shared/js/gametypes");

module.exports = Character = Entity.extend({
  init: function(id, type, kind, x, y) {
    this._super(id, type, kind, x, y);
        
    this.orientation = Utils.randomOrientation();
    this.attackers = {};
    this.target = null;
  },
  getState: function() {
    var basestate = this._getBaseState(),
        state = [];
        
    state.push(this.orientation);
    if(this.target) {
      state.push(this.target);
    }
        
    return basestate.concat(state);
  },
  resetHitPoints: function(maxHitPoints) {
    this.maxHitPoints = maxHitPoints;
    this.hitPoints = this.maxHitPoints;
  },
  resetMana: function(maxMana) {
    this.maxMana = maxMana;
    this.mana = this.maxMana;
  },
  regenHealthBy: function(value) {
    var hp = this.hitPoints,
        max = this.maxHitPoints;
            
    if(hp < max) {
      if(hp + value <= max) {
        this.hitPoints += value;
      } else {
        this.hitPoints = max;
      }
    }
  },
  regenManaBy: function(value) {
    var mana = this.mana,
        max = this.maxMana;
            
    if(mana < max) {
      if(mana + value <= max) {
        this.mana += value;
      } else {
        this.mana = max;
      }
    }
  },

  hasFullHealth: function() {
    return this.hitPoints === this.maxHitPoints;
  },
  hasFullMana: function() {
    return this.mana === this.maxMana;
  },
  setTarget: function(entity) {
    this.target = entity.id;
  },
  clearTarget: function() {
    this.target = null;
  },
  hasTarget: function() {
    return this.target !== null;
  },
  attack: function() {
    return new Messages.Attack(this.id, this.target);
  },
  health: function(attacker) {
    return new Messages.Health(this.hitPoints, attacker ? (attacker instanceof Mob ? 1 : 2) : 0, false);
  },
  regen: function() {
    return new Messages.Health(this.hitPoints, 0, true);
  },
  addAttacker: function(entity) {
    if(entity) {
      this.attackers[entity.id] = entity;
    }
  },
  removeAttacker: function(entity) {
    if(entity && entity.id in this.attackers) {
      delete this.attackers[entity.id];
      log.debug(this.id +" REMOVED ATTACKER "+ entity.id);
    }
  },
  forEachAttacker: function(callback) {
    for(var id in this.attackers) {
      callback(this.attackers[id]);
    }
  }
});
