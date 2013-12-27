
define(['animation'], function(Animation) {
  var Entity = Class.extend({
    init: function(id, kind) {
      var self = this;
	    
      this.id = id;
      this.kind = kind;

      // Renderer
      this.sprite = null;
      this.flipSpriteX = false;
      this.flipSpriteY = false;
      this.animations = null;
      this.currentAnimation = null;
      this.criticalAnimation = new Animation("atk_down", 10, 0, 48, 48);
      this.criticalAnimation.setSpeed(30);
      this.criticalAnimation.setCount(1, function(){
        self.isCritical = false;
        self.criticalAnimation.reset();
        self.criticalAnimation.count = 1;
      });
      this.isCritical = false;
      this.healAnimation = new Animation("atk_down", 10, 0, 32, 32);
      this.healAnimation.setSpeed(120);
      this.healAnimation.setCount(1, function(){
        self.isHeal = false;
        self.healAnimation.reset();
        self.healAnimation.count = 1;
      });
      this.stunAnimation = new Animation("atk_down", 6, 0, 48, 48);
      this.stunAnimation.setSpeed(30);

      this.isHeal = false;
      this.shadowOffsetY = 0;
		
      // Position
      this.setGridPosition(0, 0);
		
      // Modes
      this.isLoaded = false;
      this.isHighlighted = false;
      this.visible = true;
      this.isFading = false;
      this.setDirty();
	},
	setName: function(name) {
      this.name = name;
	},
	setPosition: function(x, y) {
      this.x = x;
      this.y = y;
	},
	setGridPosition: function(x, y) {
      this.gridX = x;
      this.gridY = y;
		
      this.setPosition(x * 16, y * 16);
	},
	setSprite: function(sprite) {
      if(!sprite) {
        log.error(this.id + " : sprite is null", true);
        throw "Error";
      }

      if(this.sprite && this.sprite.name === sprite.name) {
        return;
      }

      this.sprite = sprite;
      this.normalSprite = this.sprite;
        
      if(Types.isMob(this.kind) || Types.isPlayer(this.kind)) {
    	this.hurtSprite = sprite.getHurtSprite();
      }
		
      this.animations = sprite.createAnimations();
		
      this.isLoaded = true;
      if(this.ready_func) {
        this.ready_func();
      }
	},
	getSprite: function() {
      return this.sprite;
	},
	getSpriteName: function() {
      return Types.getKindAsString(this.kind);
	},
	getAnimationByName: function(name) {
      var animation = null;
        
      if(name in this.animations) {
        animation = this.animations[name];
      } else {
        log.error("No animation called "+ name);
      }
      return animation;
    },
	setAnimation: function(name, speed, count, onEndCount) {
      var self = this;
	    
      if(this.isLoaded) {
        if(this.currentAnimation && this.currentAnimation.name === name) {
          return;
        }
		    
        var s = this.sprite,
            a = this.getAnimationByName(name);
		
        if(a) {
          this.currentAnimation = a;
          if(name.substr(0, 3) === "atk") {
            this.currentAnimation.reset();
          }
          this.currentAnimation.setSpeed(speed);
          this.currentAnimation.setCount(count ? count : 0, onEndCount || function() {
            self.idle();
          });
        }
      } else {
        this.log_error("Not ready for animation");
      }
    },
	hasShadow: function() {
      return false;
	},
	ready: function(f) {
      this.ready_func = f;
	},
	clean: function() {
      this.stopBlinking();
	},
    log_info: function(message) {
      log.info("["+this.id+"] " + message);
    },
    log_error: function(message) {
      log.error("["+this.id+"] " + message);
    },
    setHighlight: function(value) {
      if(value === true) {
        this.sprite = this.sprite.silhouetteSprite;
        this.isHighlighted = true;
      } else {
        this.sprite = this.normalSprite;
        this.isHighlighted = false;
      }
    },
    setVisible: function(value) {
      this.visible = value;
    },
    isVisible: function() {
      return this.visible;
    },
    toggleVisibility: function() {
      if(this.visible) {
        this.setVisible(false);
      } else {
        this.setVisible(true);
      }
    },
    
    /**
     * 
     */
    getDistanceToEntity: function(entity) {
      var distX = Math.abs(entity.gridX - this.gridX);
      var distY = Math.abs(entity.gridY - this.gridY);

      return (distX > distY) ? distX : distY;
    },
    isCloseTo: function(entity) {
      var dx, dy, d, close = false;
      if(entity) {
        dx = Math.abs(entity.gridX - this.gridX);
        dy = Math.abs(entity.gridY - this.gridY);
            
        if(dx < 30 && dy < 14) {
          close = true;
        }
      }
      return close;
    },
    /**
     * Returns true if the entity is adjacent to the given one.
     * @returns {Boolean} Whether these two entities are adjacent.
     */
    isAdjacent: function(entity) {
      var adjacent = false;
        
      if(entity) {
        adjacent = this.getDistanceToEntity(entity) > 1 ? false : true;
      }
      return adjacent;
    },
    /**
     * 
     */
    isAdjacentNonDiagonal: function(entity) {
      var result = false;

      if(this.isAdjacent(entity) && !(this.gridX !== entity.gridX && this.gridY !== entity.gridY)) {
        result = true;
      }
        
      return result;
    },
    isDiagonallyAdjacent: function(entity) {
      return this.isAdjacent(entity) && !this.isAdjacentNonDiagonal(entity);
    },
    forEachAdjacentNonDiagonalPosition: function(callback) {
      callback(this.gridX - 1, this.gridY, Types.Orientations.LEFT);
      callback(this.gridX, this.gridY - 1, Types.Orientations.UP);
      callback(this.gridX + 1, this.gridY, Types.Orientations.RIGHT);
      callback(this.gridX, this.gridY + 1, Types.Orientations.DOWN);
    },
    fadeIn: function(currentTime) {
      this.isFading = true;
      this.startFadingTime = currentTime;
    },
    blink: function(speed, callback) {
      var self = this;
        
      this.blinking = setInterval(function() {
        self.toggleVisibility();
      }, speed);
    },
    stopBlinking: function() {
      if(this.blinking) {
        clearInterval(this.blinking);
      }
      this.setVisible(true);
    },
    setDirty: function() {
      this.isDirty = true;
      if(this.dirty_callback) {
        this.dirty_callback(this);
      }
    },
    onDirty: function(dirty_callback) {
      this.dirty_callback = dirty_callback;
    },
    stun: function(level){
      var self = this;
      if(!this.isStun){
        this.isStun = true;
        if(this.attackCooldown){
          this.attackCooldown.lastTime += 500*level;
        }
        this.stunTimeout = setTimeout(function(){
          self.isStun = false;
          self.stunTimeout = null;
        }, 500*level);
      }
    },
    provocation: function(level){
      var self = this;
      if(!this.isProvocation){
        this.isProvocation = true;
        this.stunTimeout = setTimeout(function(){
          self.isProvocation = false;
          self.provocationTimeout = null;
        }, 1000*level);
      }
    },
  });
    
  return Entity;
});
