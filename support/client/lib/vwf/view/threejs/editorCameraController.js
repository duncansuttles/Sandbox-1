
 define(["vwf/view/threejs/oldCameraController","vwf/view/threejs/AvatarCameraController"], function(oldCameraController,avatarCameraController)
 {
     function editorCameraController()
     {}
     editorCameraController.prototype.initialize = function(camera)
     {
         this.camera = camera;
         this.cameraControllers = {};
         var _oldCameraController = oldCameraController;
         _oldCameraController.initialize(this.camera);
         avatarCameraController.initialize(this.camera);
         this.addController('Orbit', _oldCameraController);
         this.addController('Navigate', _oldCameraController);
         this.addController('Free', _oldCameraController);
         this.addController('Fly', _oldCameraController);
         this.addController('3RDPerson', avatarCameraController);
         this.addController('FirstPerson', _oldCameraController);
         this.addController('DeviceOrientation', _oldCameraController);
         this.cameramode = 'Orbit';
         $('#index-vwf').mousedown(function(e)
         {
             this.localpointerDown(e);
         }.bind(this));
         window.addEventListener("deviceorientation", this.orientationEvent.bind(this), true);
         $('#index-vwf').mousewheel(function(e)
         {
             e.deltaY *= -1;
             this.localpointerWheel(e);
         }.bind(this));
         $('#index-vwf').mouseup(function(e)
         {
             this.localpointerUp(e);
         }.bind(this));
         $('#index-vwf').mouseleave(function(e)
         {
             if ($(e.toElement).hasClass('glyph') || $(e.toElement).hasClass('nametag') || $(e.toElement).hasClass('ignoreMouseLeave'))
             {}
             else
             {
                 this.localpointerUp(e);
             }
         }.bind(this));
         $('#index-vwf').mousemove(function(e)
         {
             this.localpointerMove(e);
         }.bind(this));
         $('#index-vwf').keydown(function(e)
         {
             this.localKeyDown(e);
         }.bind(this));
         $('#index-vwf').keyup(function(e)
         {
             this.localKeyUp(e);
         }.bind(this));
         $('#index-vwf')[0].addEventListener("touchstart", this.localTouchStart.bind(this), true);
         $('#index-vwf')[0].addEventListener("touchend", this.localTouchEnd.bind(this), true);
         $('#index-vwf')[0].addEventListener("touchmove", this.localTouchMove.bind(this), true);
         this.prerendercallback = this.prerender.bind(this);
         _dView.bind('prerender', this.prerendercallback);
         this.updateCamera();
     }
     editorCameraController.prototype.addController = function(name, controller)
     {
         this.cameraControllers[name] = controller;
     }
     editorCameraController.prototype.getController = function(name)
     {
         return this.cameraControllers[name];
     }
     editorCameraController.prototype.prerender = function(e)
     {
         this.cameraControllers[this.cameramode].prerender(e)
     }
     editorCameraController.prototype.updateCamera = function(e)
     {
         this.cameraControllers[this.cameramode].updateCamera(e)
     }
     editorCameraController.prototype.orientationEvent = function(e)
     {
         this.cameraControllers[this.cameramode].orientationEvent(e);
     }
     editorCameraController.prototype.localpointerMove = function(e)
     {
        
         this.cameraControllers[this.cameramode].localpointerMove(e);
     }
     editorCameraController.prototype.localpointerUp = function(e)
     {
         this.cameraControllers[this.cameramode].localpointerUp(e);
     }
     editorCameraController.prototype.localpointerWheel = function(e)
     {
         this.cameraControllers[this.cameramode].localpointerWheel(e);
     }
     editorCameraController.prototype.localpointerDown = function(e)
     {
         this.cameraControllers[this.cameramode].localpointerDown(e);
     }
     editorCameraController.prototype.localKeyUp = function(e)
     {
         this.cameraControllers[this.cameramode].localKeyUp(e);
     }
     editorCameraController.prototype.localKeyDown = function(e)
     {
         this.cameraControllers[this.cameramode].localKeyDown(e);
     }
     editorCameraController.prototype.localTouchMove = function(e)
     {
         this.cameraControllers[this.cameramode].localTouchMove(e);
     }
     editorCameraController.prototype.localTouchEnd = function(e)
     {
         this.cameraControllers[this.cameramode].localTouchEnd(e);
     }
     editorCameraController.prototype.localTouchStart = function(e)
     {
         this.cameraControllers[this.cameramode].localTouchStart(e);
     }
     editorCameraController.prototype.setCameraMode = function(mode)
     {
         this.cameramode = mode;
         this.cameraControllers[this.cameramode].setCameraMode(mode);
     }
     return new editorCameraController()
 })