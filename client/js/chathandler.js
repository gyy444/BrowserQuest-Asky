
define(['jquery'], function() {
  var ChatHandler = Class.extend({
    init: function(game, kkhandler) {
      var self = this;
      this.game = game;
      this.kkhandler = kkhandler;
      this.chatLog = $('#chatLog');
      this.board = $('#board');
      setInterval(function(){
        var randNumber = Math.random();
        if(randNumber < 0.25){
          self.addNotification('지정 레벨 단위별로 소정의 상품이 있습니다. <a href="http://www.burgerburger.kr/index.php?mid=screenshot" target="_blank">커뮤니티 스크린샷 게시판</a>을 참고해주세요.');
        } else if(randNumber < 0.5){
          self.addNotification('지정 레벨 달성시 버거를 지급해드립니다. <a href="http://www.burgerburger.kr/index.php?mid=screenshot" target="_blank">커뮤니티 스크린샷 게시판</a>을 참고해주세요.');
        } else if(randNumber < 0.75){
          self.addNotification('운영진은 매달 커뮤니티에서 추천을 받아 투표로 선출됩니다.');
        } else{
          self.addNotification('버거버거온라인에 대한 게임 리뷰를 써주시면 인벤토리 확장, 스노우 포션 구매, 궁수 생성 등을 할 수 있는 <a href="http://www.burgerburger.kr/242567" target="_blank">리뷰포인트</a>를 드립니다.');
        }
      }, 1000*60*20);
    },
    show: function(){
      $('#chatLog').css('display', 'block');
      $('#kungLog').css('display', 'block');
      $('#gamebutton').css('display', 'block');
      $('#boardbutton').css('display', 'block');
      $('#partybutton').css('display', 'block');
      $('#kungbutton').css('display', 'block');
    },
    processSendMessage: function(message) {
      return this.processMessage(null, message, 'senders');
    },
    processReceiveMessage: function(entityId, message) {
      return this.processMessage(entityId, message, 'receivers');
    },
    processMessage: function(entityId, message, type) {
      var pattern = message.substring(0, 3),
          self = this,
          commandPatterns = {
            'senders': {
              "/1 ": function(message) {
                self.game.client.sendChat("/1 " + self.game.player.name + ": " + message);
                return true;
              },
              "/2 ": function(message){
                if(message.length !== 3){
                  self.game.showNotification(message+"란 단어는 쿵쿵따 규칙에 맞지 않습니다.");
                } else{
                  self.game.client.sendKung(message);
                }
                return true;
              },
              "// ": function(message) {
                self.game.client.sendChat("// " + self.game.player.name + ": " + message);
                return true;
              },
              "///": function(message) {
                self.game.client.sendChat("/// " + self.game.player.name + ": " + message);
                return true;
              },
            },
            'receivers': {
              // World chat
              "/1 ": function(entityId, message) {
                self.addToChatLog(message);
                return true;
              },
              "// ": function(entityId, message){
                self.addToChatLog('<font color="#00BFFF">' + message + '</font>');
                return true;
              },
              "///": function(entityId, message){
                var i=0;
                var splitMsg = message.split(' ');
                var msg = "";
                for(i=0; i<splitMsg.length; i++){
                  if(i !== 3){
                    msg += splitMsg[i] + " ";
                  }
                }
                self.addToChatLog('<font color="#FFA500">' + msg + '</font>');
                return true;
              },
            }
          };
      if (pattern in commandPatterns[type]) {
        if (typeof commandPatterns[type][pattern] == "function") {
          switch(type) {
            case 'senders':
              return commandPatterns[type][pattern](message.substring(3));
            case 'receivers':
              return commandPatterns[type][pattern](entityId, message.substring(3));
          }
        }
      }
      return false;
    },
    addToChatLog: function(message){
      var self = this;
      var el = $('<p style="color: white">' + message + '</p>');
      $(el).appendTo(this.chatLog);
      $(this.chatLog).scrollTop(999999);
    },
    addNotification: function(message){
      var self = this;
      var el = $('<p style="color: rgba(128, 255, 128, 1)">' + message + '</p>');
      $(el).appendTo(this.chatLog);
      $(this.chatLog).scrollTop(999999);
    },
    addNormalChat: function(name, message){
      var self = this;
      var el = $('<p style="color: rgba(255, 255, 0, 1)">' + name + ': ' + message + '</p>');
      $(el).appendTo(this.chatLog);
      $(this.chatLog).scrollTop(999999);
    },
  });

  return ChatHandler;
});
