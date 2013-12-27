define(function(){
  var Window = Class.extend({
    init: function(x, y, w, h, bgimageurl){
      var self = this;

      this.x = x;
      this.y = y;
      this.w = w;
      this.h = h;
      this.visible = false;

      this.isLoaded = false;
      this.image = new Image();
      this.image.src = bgiageurl;
      this.image.onload = function(){
        self.isLoaded = true;
        if(self.onload_func){
          self.onload_func();
        }
      };
    },
    isVisible: function(){
      return this.visible;
    },
  });
  return Window;
});
