//////////////////////////////////////////////
// TODO:
// put in CQ
// Mobile Events - test these
//////////////////////////////////////////////

if (typeof jQuery === "undefined") {
  throw "This widget requires jquery module to be loaded";
}
(function($){
  var widgetObj = {
      options: {
        viewportSel: '.viewport',
        slideSel: '.slide',
        slideContSel: '.photo-list',
        activeClass: 'active',
        prevClass: 'prev',
        prevAltClass: 'prev-alt',
        nextClass: 'next',
        nextAltClass: 'next-alt',
        useTouchEvents: true,
        useNav: true,
        navContSel: '.nav-bar',
        navNextSel: '.slide-nav-next',
        navPrevSel: '.slide-nav-prev',
        captionBarSel: '.caption-bar',
        automate: true, //have slider itterate on a timer
        pauseInterval: 10000, //time in millisecionds between slides
        slideSpeed: 800, //speed in milliseconds the slider moves
        toSandbag: true,
        height: 'max'    //set height of carousel - based on largest image ("max"), smallest ("min"), or a value
    },
    //**********************//
    //    PRIVATE METHODS    //
    //**********************//
    _create: function () {
    },
    _init: function() {
      // -- Local Vars -- //
      //get slides
      this.slideArr = this.element.find(this.options.slideSel);

      // -- Element Vars --//
      this.viewport = this.element.find(this.options.viewportSel);
      this.captionHolder = this.element.find(this.options.captionBarSel);
      this.slideCont = this.element.find(this.options.slideContSel); //store slide container for simple moving
      this.jqSlideArr = this._populateJQArr(this.slideArr); //populate a jquery array for faster classing
      this.slidePhotoTimer = null; //timer to move playhead
      this.isEnabled = true; //track if the slider is enabled
      this.isSliding = false; //track if the slider is actively sliding
      this.userStopped = false;
      this.activeSlide = 0;
      // -- Actions -- //
      this._populateCaptionArr(this.jqSlideArr);
      this.captionHolder.html(this.captionArr[this.activeSlide]);
      var slideLen = this.slideArr.length;
      if ( slideLen < 1 ) {
        return false; // no slides
      }
      else if( slideLen<2 ) {
        this._convertToImage();
      } else {
        // Set height of view panel
        if (this.options.toSandbag) { this._setSizing( this.slideArr, this.slideCont ); }
        //ensure we have enough slides for this to work (5)
        this._checkSlideCount();
        // set the first slide as active
        this._setActiveSlide(this.activeSlide);
        //bind buttons - next and back if enabled
        if (this.options.useNav) {
          this._bindNav();
        }
        //bind touch events if function is included and option is chosen
        if (Modernizr.touch){
          console.log('you have touch');
        }
        if (this.options.useTouchEvents ) {
          this._bindTouch();
        }
        //if set to automate start the loop
        if (this.options.automate ) {
          this._automate();
        }
      }
    },
    _setSizing : function($arr, $container){
      var self = this,
        baseSize = 0,
        $sandBagImg,
        $toAppend;

      switch (this.options.height) {
        case 'max':
        // find the tallest
          $arr.each( function ( i ) {
            var $this = $(this),
              tempH = $this.outerHeight();
            if ( tempH > baseSize ) {
              baseSize = tempH;
              $sandBagImg = $this;
            }
          } );
        break;
        case 'min':
        // find the shortest
          $arr.each( function ( i ) {
            var $this = $(this),
              tempH = $this.outerHeight();
            baseSize = ( i == 0 ) ? tempH : baseSize;
            if ( tempH <= baseSize && tempH != 0) {
              baseSize = tempH;
              $sandBagImg = $this;
            }
          } );
        break;
        default:
          if ( typeof self.height === 'number' ) {
            $sandBagImg = $($arr[0]).clone();
            $sandBagImg.find('img').height( self.height );
          } else {
            //if self.height is not a valid value set it to min, and then run it
            self.height = 'min';
            self._setSizing();
            return false;
          }
        break;
      }
      $toAppend = $sandBagImg.clone().addClass('sandbag');
      //$toAppend = "<img class='sandbag' height='" + baseSize + "px' alt='sandbag image' src=''/>"
      $container.after( $toAppend );
      //set image positions to absolute and rely on the sandbag for sizing
      $arr.each( function ( j ) {
        var $this = $( this );
        $this.find('img').css("position", "absolute");
        $this.append( $toAppend.clone() );
      } );
      return self;
    },
    _populateCaptionArr: function ($slideArr) {
      var i=0,
        len = $slideArr.length;
      this.captionArr = [];
      for (; i<len; i++) {
        this.captionArr.push( $slideArr[i].find(".caption").clone() );
      }
    },
    _checkSlideCount: function () {
      // if there are less than 5 items we need to dupliate the slide list
      if(this.jqSlideArr.length<5) {
        // go through each slide in the original slide array (the new array will gro expotentially otherwise)
        var i = 0, len = this.slideArr.length;
        for (; i<len; i++) {
          // make a clone of the slide - mine are simple so i don't need to add a more complex clone
          var clone = this.jqSlideArr[i].clone();
          // add the slide to the DOM
          this.slideCont.append(clone);
          // add the slide to the slide array
          this.jqSlideArr.push(clone);
        };
        // make the function recursive
        this._checkSlideCount();
      }
    },
    _bindNav: function () {
      var self = this;
      this.nextBtn = this.element.find(this.options.navNextSel);
      this.prevBtn = this.element.find(this.options.navPrevSel);
      this.nextBtn.on('click', function ( e ) {
        e.preventDefault();
        self.userStopped = true;
        self._advanceSlides(1);
      });
      this.prevBtn.on('click', function ( e ) {
        e.preventDefault();
        self.userStopped = true;
        self._advanceSlides(-1);
      });
    },
    _bindTouch: function () {
      var self = this;
      ontouch(this.viewport[0], function(evt, dir, phase, swipetype, distance){
        if (self.isSliding || !self.isEnabled) { return false }; // return if currently in a slide or disabled
        if (phase == 'start'){ // on touchstart
         self.isSliding = true; // set isSliding to preven other actions
         self.listLeft = parseInt(this.viewport.css('margin-left')) || 0; // initialize ulLeft var with left position of UL
         self.viewportWidth = this.viewport.width(); // store viewport width for faster processing
        }
        else if (phase == 'move' && (dir =='left' || dir =='right')){ //  on touchmove and if moving left or right
         var totaldist = distance + self.listLeft; // calculate new left position of UL based on movement of finger
         var newPos = Math.min(totaldist, self.viewportWidth) + 'px'; // set gallery to new left position
         this.viewport.css('margin-left', newPos); //adjust viewport width to new width
        }
        else if (phase == 'end'){ // on touchend
         self.isSliding = false; // set to false in order to move items

         if (swipetype == 'left'){ // if swipe left
          self._advanceSlides(-1);
         } else if (swipetype == 'right') { // if swipe right
          self._advanceSlides(1);
         } else { //not a swipe, reset to base position
          self._advanceSlides(0);
         }
        }
       }); // end ontouch
    },
    _automate: function () {
      var self = this;
      // set up timer
      self._slideStart();

      self.element.on( 'stop', function() {
          window.clearInterval( self.slideTimer );
      } );

      self.element.on( 'mouseenter', function(){
        $(this).trigger('stop');
      });

      self.element.on( 'mouseleave', function(){
        if (!self.userStopped) {
          self._slideStart();
        }
      });
      return self;
    },
    _setActiveSlide: function (v) {
      this._removeActiveClasses();
      var prev = this._normalizeNum( v - 1 ),
        prevalt = this._normalizeNum( v - 2 ),
        next = this._normalizeNum( v + 1 ),
        nextalt = this._normalizeNum( v + 2 );

      this.activeSlide = v;
      this.jqSlideArr[v].addClass(this.options.activeClass);
      this.jqSlideArr[prev].addClass(this.options.prevClass);
      this.jqSlideArr[prevalt].addClass(this.options.prevAltClass);
      this.jqSlideArr[next].addClass(this.options.nextClass);
      this.jqSlideArr[nextalt].addClass(this.options.nextAltClass);
    },
    _removeActiveClasses: function () {
      this.slideCont.find('.'+this.options.activeClass).removeClass(this.options.activeClass);
      this.slideCont.find('.'+this.options.prevClass).removeClass(this.options.prevClass);
      this.slideCont.find('.'+this.options.prevAltClass).removeClass(this.options.prevAltClass);
      this.slideCont.find('.'+this.options.nextClass).removeClass(this.options.nextClass);
      this.slideCont.find('.'+this.options.nextAltClass).removeClass(this.options.nextAltClass);

    },
    _slideStart: function () {
      var self = this;
      self.slideTimer = window.setInterval( function() {
        self._advanceSlides(1);
      }, self.options.pauseInterval );
      self.isEnabled = true;
    },
    _slideStop: function () {
      window.clearInterval( this.slidePhotoTimer );
      this.isEnabled = false;
    },
    _advanceSlides: function (v) {
      // only trigger if enabled and not sliding
      if (!this.isEnabled || this.isSliding) { return false; }
      this.isSliding = true;
      var self = this;
      this.captionHolder.transition({"opacity": 0}, 200, function () {
        self._transitionSlide(v);
      });
    },
    _transitionSlide: function (v) {
      var toMove = (-v * 100) + "%", //calc the move val in percent
        self = this; // create a reference to this for inside the function
      this.slideCont.transition({"margin-left": toMove}, this.options.slideSpeed, function () {
        //reset slider and slides
        self.slideCont.css("margin-left", 0);
        var newActive = self._normalizeNum(self.activeSlide+v);
        self._setActiveSlide(newActive);
        self._changeCaption(newActive);
      });
    },
    _changeCaption: function (v) {
      var self = this;
      this.captionHolder.html(this.captionArr[v]);
      this.captionHolder.transition({"opacity": 1}, 200, function () {
        self.isSliding = false;
      });
    },
    _convertToImage: function () {
      this.isEnabled = false;
      this.jqSlideArr[0].addClass(this.options.activeClass);
      this.captionHolder.html(this.captionArr[0]);
      if (this.options.useNav) {
        $(this.options.navContSel).hide();
      }
    },
    /* ===== HELPER METHODS ===== */
    _normalizeNum : function ( num ) {
      //ensure num is always a valid number
      var len = this.jqSlideArr.length,
        num = ( num < 0 ) ? len + num : num,
        num = ( num > len -1 ) ? num - len : num;
      return num;
    },
    _populateJQArr : function ( arr ) {
      var i=0, tempArr = [];
      //populate an array of Jquery objects
      for (; i<arr.length; i++) {
        var $temp = $( arr[i] );
        tempArr.push( $temp );
      }
      return tempArr;
    },
    //**********************//
    //    PUBLIC METHODS    //
    //**********************//
    moveSlides: function (v) {
      var toMove = (v) ? v : 1;
      this._advanceSlides(v);
    },
    pauseSlides : function(){
      this.element.trigger('stop');
      return this;
    },
    disableSlides : function () {
      this.element.trigger('stop');
      this.isEnabled = false;
      return this;
    },
    startSlides : function(){
      this._slideStart();
      this.isEnabled = true;
      return this;
    }
  };

  $.widget( 'ui.marqueeSlide', widgetObj );
  /**
  * Example
  * $( '#myID' ).marqueeSlide();
  **/
})(jQuery);
