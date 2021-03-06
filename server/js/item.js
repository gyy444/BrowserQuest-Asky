module.exports = Item = Entity.extend({
  init: function(id, kind, x, y) {
    this._super(id, "item", kind, x, y);
    this.isStatic = false;
    this.isFromChest = false; 
    this.skillKind = 0;
    this.skillLevel = 0;

    if(Types.isHealingItem(kind)){
      this.count = 1;
    } else{
      this.count = 0;
    }
  },
  handleDespawn: function(params) {
    var self = this;
        
    this.blinkTimeout = setTimeout(function() {
      params.blinkCallback();
      self.despawnTimeout = setTimeout(params.despawnCallback, params.blinkingDuration);
    }, params.beforeBlinkDelay);
  },
  destroy: function() {
    if(this.blinkTimeout) {
      clearTimeout(this.blinkTimeout);
    }
    if(this.despawnTimeout) {
      clearTimeout(this.despawnTimeout);
    }
    if(this.isStatic) {
      this.scheduleRespawn(30000);
    }
  },
  scheduleRespawn: function(delay) {
    var self = this;
    setTimeout(function() {
      if(self.respawn_callback) {
        self.respawn_callback();
      }
    }, delay);
  },
  onRespawn: function(callback) {
    this.respawn_callback = callback;
  },
  getState: function() {
    //this._super.getState().push(this.count);
    return [
      parseInt(this.id),
      this.kind,
      this.x,
      this.y,
      this.count
    ];
  },
  toString: function(){
    return Types.getKindAsString(this.kind) + " "
         + this.count + " "
         + Types.getItemSkillNameByKind(this.skillKind) + " "
         + this.skillLevel + " "
         + this.x + " "
         + this.y;
  },
});
