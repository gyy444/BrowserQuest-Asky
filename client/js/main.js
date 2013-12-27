
define(['jquery', 'app', 'game', 'lib/class', 'lib/underscore.min',
        'lib/modernizr', 'lib/stacktrace', 'lib/astar', 'lib/log',
        'animation', 'area', 'audio', 'boardhandler', 'bubble', 'camera',
        'character', 'chathandler', 'chest', 'detect', 'entity',
        'entityfactory', 'exceptions', 'gameclient', 'infomanager', 'item',
        'items', 'jquery', 'kkhandler', 'map', 'menu', 'mob',
        'mobs', 'npc', 'npcs', 'partyhandler', 'pathfinder', 'player',
        'questhandler', 'rankinghandler', 'renderer', 'shophandler', 'sprite',
        'statehandler', 'text', 'tile', 'timer', 'transition',
        'updater', 'warrior', 'playerpopupmenu', 'iteminfodialog',
        'archer', 'button2', 'dialog', 'characterdialog'], function($, App) {

    var app, game;

    var onLoginEvent = function(event){
      var name = null;
      var pw = null;
      var pw2 = null;
      var email = '';
      var language = '';

      var tmp = $('#loginpage').css('display');
      var isJoinPage = false;

      if(tmp === 'none'){
        isJoinPage = true;
        name = $('#joinnameinput').attr('value');
        pw = $('#joinpwinput').attr('value');
        pw2 = $('#joinpwinput2').attr('value');
        email = $('#emailinput').attr('value');
        language = $(":input:radio[name=language]:checked").val();

        if(pw !== pw2){
          alert('입력하신 두 비밀번호가 서로 다릅니다.');
          return;
        }
      } else{
        isJoinPage = false;
        name = $('#loginnameinput').attr('value');
        pw = $('#loginpwinput').attr('value');
        language = $(":input:radio[name=language]:checked").val();
      }

      if(language === "english"){
        language = Types.Language.Type.ENGLISH;
      } else{
        language = Types.Language.Type.KOREAN;
      }

      if(name && pw){
        game.chathandler.addNotification(Types.Language.Translate.CONNECTING[language]);
        $('#loginscreen').fadeOut(3000);
        $('#loadingscreen').fadeIn(3000);
        app.tryStartingGame(name, pw, email, isJoinPage, language);
      } else{
        alert('닉네임 및 비밀번호를 입력해주시기 바랍니다.');
      }
    };

    var initApp = function() {
        $(document).ready(function() {
        	app = new App();

            if(Detect.isWindows()) {
                // Workaround for graphical glitches on text
                $('body').addClass('windows');
            }
            
            if(Detect.isOpera()) {
                // Fix for no pointer events
                $('body').addClass('opera');
            }

            $('#loginnameinput').focus();
        
            $('#loginbutton').click(onLoginEvent);
            $('#joinbutton').click(onLoginEvent);

            $('#pagetonewcharacterbutton').click(function(event){
              $('#loginpage').css('display', 'none');
              $('#joinpage').css('display', 'block');
              $('#loginscreen').css('background-image', "url('../client/img/2/newcharacter.jpg')");
            });
        
            $('#dropAccept').click(function(event) {
                try {
                    var count = parseInt($('#dropCount').val());
                    if(count > 0) {
                        if(count > game.inventoryHandler.inventoryCount[app.inventoryNumber])
                            count = game.inventoryHandler.inventoryCount[app.inventoryNumber];

                        game.client.sendInventory("empty", app.inventoryNumber, count);

                        game.inventoryHandler.inventoryCount[app.inventoryNumber] -= count;
                        if(game.inventoryHandler.inventoryCount[app.inventoryNumber] === 0)
                            game.inventoryHandler.inventory[app.inventoryNumber] = null;
                    }
                } catch(e) {
                }

                setTimeout(function () {
                    app.hideDropDialog();
                }, 100);
            });
            $('#languageselection').click(function(event){
              var language = $(":input:radio[name=language]:checked").val();
              if(language === "english"){
                language = Types.Language.Type.ENGLISH;
              } else{
                language = Types.Language.Type.KOREAN;
              }
              $('#gamebutton').html(Types.Language.Translate.CHAT[language]);
              $('#boardbutton').html(Types.Language.Translate.BOARD[language]);
              $('#questbutton').html(Types.Language.Translate.QUEST[language]);
              $('#statebutton').html(Types.Language.Translate.MY_INFO[language]);
              $('#rankingbutton').html(Types.Language.Translate.RANKING[language]);
              $('#partybutton').html(Types.Language.Translate.PARTY[language]);
              $('#kungbutton').html(Types.Language.Translate.KUNGKUNGDDA[language]);
              $('#loginnameinput').attr('placeholder', Types.Language.Translate.NICKNAME_PLACEHOLDER[language]);
              $('#loginpwinput').attr('placeholder', Types.Language.Translate.PASSWORD[language]);
              $('#joinnameinput').attr('placeholder', Types.Language.Translate.NICKNAME_PLACEHOLDER[language]);
              $('#joinpwinput').attr('placeholder', Types.Language.Translate.PASSWORD[language]);
              $('#joinpwinput2').attr('placeholder', Types.Language.Translate.CONFIRM_PASSWORD[language]);
              $('#emailinput').attr('placeholder', Types.Language.Translate.EMAIL_PLACEHOLDER[language]);
            });

            $('#dropCancel').click(function(event) {
                setTimeout(function () {
                    app.hideDropDialog();
                }, 100);
            });
        
            document.addEventListener("touchstart", function() {},false);
            
            initGame();
        });
    };
    
    var initGame = function() {
        require(['jquery', 'game', 'button2'], function($, Game, Button2) {
            
            var canvas = document.getElementById("entities"),
        	    background = document.getElementById("background"),
        	    foreground = document.getElementById("foreground"),
        	    input = document.getElementById("chatinput");

    		game = new Game(app);
    		game.setup('#bubbles', canvas, background, foreground, input);
    		app.setGame(game);
    		
//    		if(!!window.Worker) {
    		    game.loadMap();
//    		}

    		game.onNbPlayersChange(function(worldPlayers, totalPlayers){
              $('#users').html("" + worldPlayers);
    		});
	
    		game.onNotification(function(message) {
              app.hideAllSubwindow();
              game.chathandler.show();
              game.chathandler.addNotification(message);
    		});
	
    		$('#chatbox').attr('value', '');
    		
        	if(game.renderer.mobile || game.renderer.tablet) {
                $('#foreground').bind('touchstart', function(event) {
                    app.setMouseCoordinates(event.originalEvent.touches[0]);
                	game.click();
                });
            } else {
                $('#foreground').click(function(event) {
                    app.setMouseCoordinates(event);
                    if(game && !app.dropDialogPopuped) {
                	    game.pvpFlag = event.shiftKey;
                	    game.click();
                	}
                });
            }

            $('body').unbind('click');
            
            $('#revivebutton').click(function(event) {
                $('#revive').css('display', 'none');
                game.audioManager.playSound("revive");
                game.restart();
            });
            
            $(document).bind('mousemove', function(event) {
            	app.setMouseCoordinates(event);
            	if(game.started) {
            	    game.pvpFlag = event.shiftKey;
            	    game.movecursor();
            	}
            });
            
            $(document).bind('mousedown', function(event){ 
              if(event.button === 2){
                return false;
              }
            });
            $(document).bind('mouseup', function(event) { 
                if(event.button === 2) {
                    app.setMouseCoordinates(event);

                    game.rightClick();
                }
            });

            $(document).keydown(function(e) {
            	var key = e.which,
                    $chat = $('#chatinput');

                if(key === 13) {
                    if($('#chatbox').hasClass('active')) {
                        app.hideChat();
                    } else {
                        app.showChat();
                    }
                }
                else if(key === 16)
                    game.pvpFlag = true;
                else if(key === 27)
                    app.hideDropDialog();
            });

            $(document).bind('keyup', function(e) {
            	var key = e.which;

                if(key === 16)
                    game.pvpFlag = false;
            });
            
            $('#chatinput').keydown(function(e) {
                var key = e.which,
                    $chat = $('#chatinput');

                if(key === 13) {
                    if($chat.attr('value') !== '') {
                        if(game.player) {
                            game.say($chat.attr('value'));
                        }
                        $chat.attr('value', '');
                        app.hideChat();
                        $('#foreground').focus();
                        return false;
                    } else {
                        app.hideChat();
                        return false;
                    }
                }
                
                if(key === 27) {
                    app.hideChat();
                    return false;
                }
            });

            $(document).bind("keydown", function(e) {
            	var key = e.which,
            	    $chat = $('#chatinput');

                if(!game.ready
                && $("#loginnameinput").attr('value').length > 1
                && $("#loginpwinput").attr('value').length > 1){
                  if(key === 13){ // Enter
                    onLoginEvent(null);
                  }
                }

                if($('#chatinput:focus').size() == 0
                && $('#nameinput:focus').size() == 0
                && game.ready
                && !app.dropDialogPopuped
                && !game.statehandler.buyingArcher
                && !game.statehandler.changingPassword
                && !game.shopHandler.shown
                && !game.storeDialog.visible) {
                    if(key === 13) { // Enter
                        $chat.focus();
                        return false;
                    } else if(key === 8) { // BackSpace
                        return false;
                    } else if(key >= 49 && key <= 54){ // 1,2,3,4,5,6
                        game.keyDown(key);
                        return false;
                    } else if([81, 87, 69, 82, 84].indexOf(key) >= 0) { // q, w, e, r, t
                        game.player.skillHandler.execute(key);
                        return false;
                    }
                } else {
                    if(key === 13 && game.ready) {
                        $chat.focus();
                        return false;
                    }
                }
            });

            $('#healthbar').click(function (event) {
                if(event.layerX >= 20) {
                    var hpg = $('#hpguide');
    
                    if(game.ready) {
                        if(hpg.css('display') === 'none') {
                            hpg.css('display', 'block');
    
                            game.autoEattingHandler = setInterval(function () {
                              if(game && game.player){
                                if(((game.player.hitPoints / game.player.maxHitPoints) <= game.hpGuide) && 
                                   (game.healShortCut >= 0) && 
                                   Types.isHealingItem(game.inventoryHandler.inventory[game.healShortCut]) &&
                                   (game.inventoryHandler.inventoryCount[game.healShortCut] > 0) &&
                                   (game.attackerKind === 1)
                                  ) {
                                    game.eat(game.healShortCut);
                                }
                              }
                            }, 100);
                        }
                        hpg.css('left', event.layerX + 'px');
    
                        game.hpGuide = (event.layerX - 20) / 154;
                    }
                }

                return false;
            });

            $('#healthbar').bind('mousedown', function (event) {
                if(event.button === 2) {
                    return false;
                }
            });

            $('#healthbar').bind('mouseup', function (event) {
                if(event.button === 2) {
                    if(game.autoEattingHandler) {
                        clearInterval(game.autoEattingHandler);

                        $('#hpguide').css('display', 'none');
                    }
                    return false;
                }
            });

            $('#hpguide').bind('mousedown', function (event) {
                if(event.button === 2) {
                    return false;
                }
            });

            $('#hpguide').bind('mouseup', function (event) {
                if(event.button === 2) {
                    if(game.autoEattingHandler) {
                        clearInterval(game.autoEattingHandler);

                        $('#hpguide').css('display', 'none');
                    }
                    return false;
                }
            });

            $('#boardbutton').click(function(event){
              if(app.game && app.ready && app.game.ready){
                app.hideAllSubwindow();
                app.game.boardhandler.show();
              }
            });
            $('#gamebutton').click(function(event){
              if(app.game && app.ready && app.game.ready){
                app.hideAllSubwindow();
                app.game.chathandler.show();
              }
            });
            $('#questbutton').click(function(event){
              if(app.game && app.ready && app.game.ready){
                app.game.client.sendQuest(0, "show");
                app.hideAllSubwindow();
                app.game.questhandler.show();
              }
            });
            $('#statebutton').click(function(event){
              if(app.game && app.ready && app.game.ready){
                app.game.client.sendState('get');
                app.hideAllSubwindow();
                app.game.statehandler.show();
              }
            });
            $('#rankingbutton').click(function(event){
              if(app.game && app.ready && app.game.ready){
                app.game.client.sendRanking('get');
                app.hideAllSubwindow();
                app.game.rankingHandler.show();
              }
            });
            $('#partybutton').click(function(event){
              if(app.game && app.ready && app.game.ready){
                $('#kungLog').css('display', 'none');
                $('#partyWindow').css('display', 'block');
              }
            });
            $('#kungbutton').click(function(event){
              if(app.game && app.ready && app.game.ready){
                $('#partyWindow').css('display', 'none');
                $('#kungLog').css('display', 'block');
              }
            });

            Button2.configure = {background: {top: 628, width: 28}, kinds: [0, 3, 2]};

            this.characterButton = new Button2('#characterButton', {background: {left: 0}});
            this.characterButton.onClick(function(sender, event) {
              if(game && game.ready){
                if(game.characterDialog.visible){
                  game.characterDialog.hide();
                } else{
                  game.client.sendCharacterInfo();
                }
              }
            });
            game.characterDialog.button = this.characterButton;

            this.helpButton = new Button2('#helpbutton', {background: {left: 280}});
            this.helpButton.onClick(function(sender, event){
              if(game && game.ready){
                if(game.itemInfoDialog.visible){
                  game.itemInfoDialog.hide();
                } else{
                  game.itemInfoDialog.show();
                }
              }
            });
            game.itemInfoDialog.button = this.helpButton;

            this.soundButton = new Button2('#soundbutton', {background: {left: 196}, downed: true});
            this.soundButton.onClick(function(sender, event){
              if(game && game.ready){
                if(game.audioManager.toggle()){
                  sender.down();
                } else{
                  sender.up();
                }
              }
            });

            if(game.renderer.tablet) {
                $('body').addClass('tablet');
            }
        });
    };
    
    initApp();
});
