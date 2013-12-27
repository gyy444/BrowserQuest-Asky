define(['jquery', 'player', 'mob', 'item'], function($, Player, Mob, Item) {
  var App = Class.extend({
    init: function() {
      this.ready = false;
      this.inventoryNumber = 0;
      this.dropDialogPopuped = false;
    },
    setGame: function(game) {
      this.game = game;
      this.ready = true;
    },
    canStartGame: function() {
      return (this.game && this.game.map && this.game.map.isLoaded);
    },
    tryStartingGame: function(username, userpw, email, isJoin, language) {
      var self = this;
            
      if(username !== '') {
        if(!this.ready || !this.canStartGame()) {
          var watchCanStart = setInterval(function() {
            log.debug("waiting...");
            if(self.canStartGame()) {
              clearInterval(watchCanStart);
              self.startGame(username, userpw, email, isJoin, language);
            }
          }, 100);
        } else {
          this.startGame(username, userpw, email, isJoin, language);
        }      
      }
    },
    startGame: function(username, userpw, email, isJoin, language) {
      if(username && !this.game.started) {
        this.game.setServerOptions(username, this.game.cry(userpw), email, isJoin, language);
        this.game.run();
      }
    },
    setMouseCoordinates: function(event) {
      var gamePos = $('#foreground').offset(),
          scale = this.game.renderer.getScaleFactor(),
          width = this.game.renderer.getWidth(),
          height = this.game.renderer.getHeight(),
          mouse = this.game.mouse;

      mouse.x = event.pageX - gamePos.left;
      mouse.y = event.pageY - gamePos.top;

      if(mouse.x <= 0) {
        mouse.x = 0;
      } else if(mouse.x >= width) {
        mouse.x = width - 1;
      }

      if(mouse.y <= 0) {
        mouse.y = 0;
      } else if(mouse.y >= height) {
        mouse.y = height - 1;
      }
    },
    initTargetHud: function(){
      var self = this;
      var scale = self.game.renderer.getScaleFactor(),
          healthMaxWidth = $("#target .health").width() - (12 * scale),
          timeout;

      this.game.player.onSetTarget(function(target, name, mouseover){
        var el = '#target';
        if(mouseover) el = '#inspector';
        var sprite = target.sprite;
        var x, y;
        if(Types.isItem(target.kind)){
          x = ((sprite.animationData['idle'].length-1)*sprite.width),
          y = ((sprite.animationData['idle'].row)*sprite.height);
        } else if(Types.isMob(target.kind)){
          x = ((sprite.animationData['idle_down'].length-1)*sprite.width),
          y = ((sprite.animationData['idle_down'].row)*sprite.height);
        } else{
          return;
        }

        $(el+' .name').text(name);
        $(el+' .name').css('text-transform', 'capitalize');
                
        if(el === '#inspector'){
          $(el + ' .details').text((target instanceof Mob ? "Level." + Types.getMobLevel(Types.getKindFromString(name)) : (target instanceof Item ? target.getInfoMsg(self.game.language): "1")));
        }
        $(el+' .headshot div').height(sprite.height).width(sprite.width);
        $(el+' .headshot div').css('margin-left', -sprite.width/2).css('margin-top', -sprite.height/2);
        $(el+' .headshot div').css('background', 'url(img/1/'+(target instanceof Item ? 'item-'+name : name)+'.png) no-repeat -'+x+'px -'+y+'px');

        if(target.healthPoints){
          $(el+" .health").css('width', Math.round(target.healthPoints/target.maxHp*100)+'%');
        } else{
          $(el+" .health").css('width', '100%');
        }

        $(el).fadeIn('fast');
        if(mouseover){
          clearTimeout(timeout);
          timeout = null;
          timeout = setTimeout(function(){
            $('#inspector').fadeOut('fast');
            self.game.player.inspecting = null;
          }, 2000);
        }
      });

      this.game.onUpdateTarget(function(target){
        $("#target .health").css('width', Math.round(target.healthPoints/target.maxHp*100) + "%");
        if(self.game.player.inspecting && self.game.player.inspecting.id === target.id){
          $("#inspector .health").css('width', Math.round(target.healthPoints/target.maxHp*100) + "%");
        }
      });

      this.game.player.onRemoveTarget(function(targetId){
        $('#target').fadeOut('fast');
        if(self.game.player.inspecting && self.game.player.inspecting.id === targetId){
          $('#inspector').fadeOut('fast');
          self.game.player.inspecting = null;
        }
      });
    },
    initExpBar: function(){
//      var maxWidth = $("#expbar").width();
      var maxWidth = 376;

      this.game.onPlayerExpChange(function(expInThisLevel, expForLevelUp){
        var rate = expInThisLevel/expForLevelUp;
        if(rate > 1){
          rate = 1;
        } else if(rate < 0){
          rate = 0;
        }
        $('#exp').css('width', (rate*maxWidth).toFixed(0) + "px");
        $('#expbar').attr("title", "Exp: " + (rate*100).toFixed(3) + "%");
      });
    },
    initHealthBar: function() {
//      var maxWidth = $('#healthbar').width();
      var maxWidth = 154;

      this.game.onPlayerHealthChange(function(hp, maxHp) {
        var barWidth = Math.round((maxWidth / maxHp) * (hp > 0 ? hp : 0));
        $('#health').css('width', barWidth + "px");
        $('#healthbar').html("<p>HP: " + hp + "/" + maxHp + "</p>");
      });

      this.game.onPlayerHurt(this.blinkHealthBar.bind(this));
    },
    initManaBar: function() {
//      var maxWidth = $('#manabar').width();
      var maxWidth = 154;

      this.game.onPlayerManaChange(function(mana, maxMana) {
        var barWidth = Math.round((maxWidth / maxMana) * (mana > 0 ? mana : 0));
        $('#mana').css('width', barWidth + "px");
        $('#manabar').html("<p>MP: " + mana + "/" + maxMana + "</p>");
      });
    },

    blinkHealthBar: function() {
      var $hitpoints = $('#health');

      $('#health').css('background', 'rgba(255, 0, 0, 0.8)');
      setTimeout(function() {
        $('#health').css('background', '-webkit-linear-gradient(top, #FF8888, #FF0000)');
        $('#health').css('background', '-moz-linear-gradient(top, #FF8888, #FF0000)');
      }, 500)
    },
    showChat: function() {
      if(this.game.started) {
        $('#chatbox').addClass('active');
        $('#chatbox .legend').fadeIn('fast');
        $('#chatinput').focus();
        $('#chatbutton').addClass('active');
      }
    },
    hideChat: function() {
      if(this.game.started) {
        $('#chatbox').removeClass('active');
        $('#chatbox .legend').fadeOut('fast');
        $('#chatinput').blur();
        $('#chatbutton').removeClass('active');
      }
    },
    showDropDialog: function(inventoryNumber) {
      if(this.game.started) {
        $('#dropDialog').addClass('active');
        $('#dropCount').focus();
        $('#dropCount').select();
                
        this.inventoryNumber = inventoryNumber;
        this.dropDialogPopuped = true;
      }
    },
    hideDropDialog: function() {
      if(this.game.started) {
        $('#dropDialog').removeClass('active');
        $('#dropCount').blur();

        this.dropDialogPopuped = false;
      }
    },
    hideAllSubwindow: function(){
      $('#chatLog').css('display', 'none');
      $('#board').css('display', 'none');
      $('#quest').css('display', 'none');
      if(this.game.statehandler){ this.game.statehandler.hide(); }
      $('#ranking').css('display', 'none');

      $('#kungLog').css('display', 'none');
      $('#partyWindow').css('display', 'none');

      $('#partybutton').css('display', 'none');
      $('#kungbutton').css('display', 'none');
    }
  });

  return App;
});
