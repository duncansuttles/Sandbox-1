 function getViewProjection(cam)
 {
     cam.matrixWorldInverse.getInverse(cam.matrixWorld);
     var _viewProjectionMatrix = new THREE.Matrix4();
     _viewProjectionMatrix.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
     return MATH.transposeMat4(_viewProjectionMatrix.toArray([]));
 }

 function findviewnode(id)
 {
     for (var i = 0; i < vwf.views.length; i++)
     {
         if (vwf.views[i].state && vwf.views[i].state.nodes && vwf.views[i].state.nodes[id] && vwf.views[i].state.nodes[id].threeObject) return vwf.views[i].state.nodes[id].threeObject;
     }
     return null;
 }
 var oldCameraController = function()
 {
     this.initialize = function(camera)
     {
         this.active = false;
         this.camera = camera;
         this.camera.up.y = 0;
         this.camera.up.z = 1;
         this.camera.fov = 70;
         this.setCameraMode('Orbit');
         this.offset = [0, 0, 1];
         this.center = [0, 0, 0];
         this.flyspeed = 1;
         this.activeCameraComp = false;
         this.loaded = false;
         this.zoom = 4;
         this.x_rot = 0.15687500000000001;
         this.y_rot = 0.5839999999999994;
         //this.updateCamera();
         this.players = [];
         this.rel_x = 0;
         this.rel_y = 0;
         this.loaded = false;
         this.leftdown = false;
         this.middledown = false;
         this.rightdown = false;
         this.last_x = 0;
         this.last_y = 0;
         this.navmode = 'none';
         this.leftArrowDown = false;
         this.rightArrowDown = false;
         this.upArrowDown = false;
         this.downArrowDown = false;
         this.spaceDown = false;
         this.ctrlDown = false;
         this.shiftDown = false;
         this.updateCallbacks = [];
         //  this.PickOptions = new MATH.CPUPickOptions();
         //  this.PickOptions.UserRenderBatches = true;
     }
     this.activate = function()
     {
        this.active = true;
     }
     this.deactivate = function()
     {
        this.active = false;
     }
     this.broadcastCameraPosition = function(transform)
     {
         if (this.receivingCameraBroadcast)
         {
             this.camera.transform = transform;
         }
     }
     this.getBroadcasting = function()
     {
         return this.broadcastingCamera;
     }
     this.cameraBroadcastStart = function()
     {
         if (this.client == this.moniker)
         {
             this.broadcastingCamera = true;
             this.receivingCameraBroadcast = false;
             this.cameraShareTimerHandle = window.setInterval(function()
             {
                 vwf_view.kernel.callMethod('index-vwf', 'broadcastCameraPosition', [this.camera.transform]);
             }.bind(this))
         }
         else
         {
             alertify.confirm(_UserManager.GetPlayernameForClientID(this.client) + " would like to share the camera view with you. Accept?", function(ok)
             {
                 if (ok)
                 {
                     this.broadcastingCamera = false;
                     this.receivingCameraBroadcast = true;
                     this.preCameraShareMode = this.cameramode;
                     this.cameramode = 'None';
                 }
             }.bind(this));
         }
     }
     this.cameraBroadcastEnd = function()
     {
         if (this.client == this.moniker)
         {
             this.broadcastingCamera = false;
             this.receivingCameraBroadcast = false;
             window.clearInterval(this.cameraShareTimerHandle);
             this.cameraShareTimerHandle = null;
         }
         else
         {
             if (this.receivingCameraBroadcast)
             {
                 alertify.alert((_UserManager.GetPlayernameForClientID(this.client) || 'The user') + " has stopped sharing the camera view.");
                 this.broadcastingCamera = false;
                 this.receivingCameraBroadcast = false;
                 this.cameramode = this.preCameraShareMode;
             }
         }
     }
     this.cameraBroadcastPrompt = function() {}
     this.removeUpdateCallback = function(m)
     {
         this.updateCallbacks.splice(m, 1);
     }
     this.addUpdateCallback = function(val)
     {
         this.updateCallbacks.push(val);
         return this.updateCallbacks.length - 1;
     }
     this.callUpdateCallbacks = function()
     {
         for (var i = 0; i < this.updateCallbacks.length; i++)
             this.updateCallbacks[i](this);
     }
     this.followObject = function(value)
     {
         if (this.objectFollowed)
         {
             if (this.objectFollowed.updateCallbacks)
             {
                 this.objectFollowed.updateCallbacks.splice(this.followcallbacknum, 1);
             }
         }
         if (value)
         {
             if (value.updateCallbacks)
             {
                 value.updateCallbacks.push(this.updateCamera.bind(this));
                 this.followcallbacknum = value.updateCallbacks.length;
             }
         }
         this.objectFollowed = value;
         //if(this.objectFollowed)
         //this.oldRotZ = vwf.getProperty(this.objectFollowed.id,'rotZ');
     }
     this.targetUpdated = function(obj)
     {
         if (typeof(obj) == "string")
             obj = vwf_view.kernel.kernel.models[0].model.nodes[obj];
         if (obj && obj.transformAPI.getPosition())
         {
             this.center = obj.transformAPI.getPosition();
             if (obj.followOffset != null)
                 this.center = MATH.addVec3(this.center, obj.followOffset);
         }
     }
     this.lookat = function(posfrom, posto, pointfront)
     {
         var to = MATH.subVec3(posfrom, posto);
         to = MATH.scaleVec3(to, 1.0 / MATH.lengthVec3(to));
         var a = MATH.crossVec3(pointfront, to);
         var tofront = goog.vec.Quaternion.createFromValues(a[0], a[1], a[2], 1 + MATH.dotVec3(pointfront, to));
         var angle = 0;
         var axis = [0, 0, 1];
         var tofront_norm = [];
         goog.vec.Quaternion.normalize(tofront, tofront_norm);
         var currentrot = [];
         angle = goog.vec.Quaternion.toAngleAxis(tofront_norm, axis);
         return [axis[0], axis[1], axis[2], angle / 0.0174532925];
     }
     this.multTranslate = function(mat, translate, result)
         {
             if (mat == undefined) return;
             if (result === undefined)
             {
                 result = [];
             }
             if (result !== mat)
             {
                 for (var i = 0; i < mat.length; i++)
                     result.push(mat[i]);
             }
             var val;
             if (translate[0] !== 0.0)
             {
                 val = translate[0];
                 result[12] += val * mat[0];
                 result[13] += val * mat[1];
                 result[14] += val * mat[2];
                 result[15] += val * mat[3];
             }
             if (translate[1] !== 0.0)
             {
                 val = translate[1];
                 result[12] += val * mat[4];
                 result[13] += val * mat[5];
                 result[14] += val * mat[6];
                 result[15] += val * mat[7];
             }
             if (translate[2] !== 0.0)
             {
                 val = translate[2];
                 result[12] += val * mat[8];
                 result[13] += val * mat[9];
                 result[14] += val * mat[10];
                 result[15] += val * mat[11];
             }
             return result;
         },
         this.normalize = function(vec)
         {
             if (vec == undefined) return;
             return MATH.scaleVec3(vec, 1.0 / MATH.lengthVec3(vec));
         }
     this.makeLookAt = function(eye, center, up, result)
     {
         if (eye == undefined) return;
         if (result === undefined)
         {
             result = [];
         }
         var f = MATH.subVec3(center, eye);
         f = this.normalize(f);
         var s = MATH.subVec3(f, up);
         s = this.normalize(s);
         var u = MATH.crossVec3(s, f);
         u = this.normalize(u);
         // s[0], u[0], -f[0], 0.0,
         // s[1], u[1], -f[1], 0.0,
         // s[2], u[2], -f[2], 0.0,
         // 0,    0,    0,     1.0
         result[0] = s[0];
         result[1] = u[0];
         result[2] = -f[0];
         result[3] = 0.0;
         result[4] = s[1];
         result[5] = u[1];
         result[6] = -f[1];
         result[7] = 0.0;
         result[8] = s[2];
         result[9] = u[2];
         result[10] = -f[2];
         result[11] = 0.0;
         result[12] = 0;
         result[13] = 0;
         result[14] = 0;
         result[15] = 1.0;
         var tra = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
         tra[12] = -eye[0];
         tra[13] = -eye[1];
         tra[14] = -eye[2];
         var newresult = MATH.mulMat4(result, tra);
         return newresult;
     }
     this.GetWorldPickRay = function(e)
     {
         return _Editor.GetWorldPickRay(e);
     }
     this.intersectLinePlane = function(ray, raypoint, planepoint, planenormal)
     {
         var n = MATH.dotVec3(MATH.subVec3(planepoint, raypoint), planenormal);
         var d = MATH.dotVec3(ray, planenormal);
         if (d == 0)
             return null;
         var dist = n / d;
         return dist;
     }
     this.touchcount = 0;
     this.lastTouchDist = 0;
     this.localTouchStart = function(event)
     {
         this.touchcount++;
         this.rightdown = true;
         this.last_x = event.touches[0].clientX / window.screen.width;
         this.last_y = event.touches[0].clientY / window.screen.height;
         if (event.touches.length == 2)
         {
             var x = (event.touches[0].clientX - event.touches[1].clientX) / 2;
             var y = (event.touches[0].clientX - event.touches[1].clientX) / 2;
             x *= x;
             y *= y;
             this.lastTouchDist = Math.sqrt(x + y);
         }
     }
     this.localTouchEnd = function(event)
     {
         this.touchcount--;
         this.rightdown = false;
     }
     this.localTouchMove = function(event)
     {
         if (event.touches.length == 1)
             this.localpointerMove(event.touches[0]);
         if (event.touches.length == 2)
         {
             var x = (event.touches[0].clientX - event.touches[1].clientX) / 2;
             var y = (event.touches[0].clientX - event.touches[1].clientX) / 2;
             x *= x;
             y *= y;
             var dist = Math.sqrt(x + y);
             var relDist = this.lastTouchDist - dist;
             if (Math.abs(relDist) > 3)
             {
                 this.lastTouchDist = dist;
                 event.touches[0].deltaY = relDist;
                 this.localpointerWheel(event.touches[0]);
             }
             var x = (event.touches[0].clientX + event.touches[1].clientX) / 2;
             var y = (event.touches[0].clientX + event.touches[1].clientX) / 2;
             this.middledown = true;
             event.touches[0].clientX = x;
             event.touches[0].clientY = y;
             this.localpointerMove(event.touches[0]);
             this.middledown = false;
         }
     }
     this.localpointerDown = function(parms, pickInfo)
     {
         if (!_dView.inDefaultCamera()) return;
         parms.preventDefault();
         if (parms.which == 1) this.leftdown = true;
         if (parms.which == 2) this.middledown = true;
         if (parms.which == 3) this.rightdown = true;
         if (parms.which == 3 || parms.which == 2 && (this.cameramode == 'Orbit' || this.cameramode == 'Free'))
         {
             // Ask the browser to lock the pointer
             // $('#index-vwf')[0].requestPointerLock();
         }
         this.last_x = parms.clientX / window.screen.width;
         this.last_y = parms.clientY / window.screen.height;
         if (this.cameramode == 'Navigate' && parms.which == 2)
         {
             this.setNavCenter(parms);
         }
     }
     this.setNavCenter = function(parms)
     {
         var campos = [this.camera.position.x, this.camera.position.y, this.camera.position.z];
         var ray = this.GetWorldPickRay(parms);
         vwf.callMethod(vwf.application(), 'getGroundPlane', []).PickPriority = 0;
         var oldintersectxy = _Editor.ThreeJSPick(campos, ray, this.PickOptions);
         if (!oldintersectxy) return; //this is just better. 
         oldintersectxy = oldintersectxy ? oldintersectxy.point : [0, 0, 0];
         vwf.callMethod(vwf.application(), 'getGroundPlane', []).PickPriority = -1;
         var dxy2 = this.intersectLinePlane(ray, campos, [0, 0, 0], [0, 0, 1]);
         var oldintersectxy2 = MATH.addVec3(campos, MATH.scaleVec3(ray, dxy2));
         if (oldintersectxy2[2] > oldintersectxy[2]) oldintersectxy = oldintersectxy2;
         this.navpoint = oldintersectxy;
     }
     this.localpointerUp = function(parms, pickInfo)
     {
         if (!_dView.inDefaultCamera()) return;
         parms.preventDefault();
         if (parms.which == 1) this.leftdown = false;
         if (parms.which == 3) this.rightdown = false;
         if (parms.which == 2) this.middledown = false;
         if (parms.which == 2 || parms.which == 3)
         {
             // Ask the browser to lock the pointer
             //document.exitPointerLock();
         }
     }
     this.simulateMiddleDrag = function(x, y)
     {
         this.middledown = true;
         var mouse = {
             clientX: this.last_x * window.screen.width + x,
             clientY: this.last_y * window.screen.height + y
         }
         this.localpointerMove(mouse);
         this.middledown = false;
     }
     this.simulateRightDrag = function(x, y)
     {
         this.rightdown = true;
         var mouse = {
             clientX: this.last_x * window.screen.width + x,
             clientY: this.last_y * window.screen.height + y
         }
         this.localpointerMove(mouse);
         this.rightdown = false;
     }
     this.simulateWheel = function(z)
     {
         var mouse = {
             deltaY: z
         }
         this.localpointerWheel(mouse);
     }
     this.localKeyDown = function(e)
     {
         console.log(e.keyCode);
         if (e.keyCode == 37)
             this.leftArrowDown = true;
         if (e.keyCode == 38)
             this.upArrowDown = true;
         if (e.keyCode == 39)
             this.rightArrowDown = true;
         if (e.keyCode == 40)
             this.downArrowDown = true;
         if (e.keyCode == 32)
             this.spaceDown = true;
         if (e.keyCode == 17)
             this.ctrlDown = true;
         if (e.keyCode == 16)
             this.shiftDown = true;
         if (this.shiftDown == true && this.ctrlDown == true)
         {
             this.middledown = true;
             this.rightdown = false;
         }
         else if (this.shiftDown == true)
         {
             this.middledown = false;
             this.rightdown = true;
         }
         else
         {
             this.middledown = false;
             this.rightdown = false;
         }
     }
     this.localKeyUp = function(e)
     {
         if (e.keyCode == 32)
         {
             var mouse = {
                 clientX: this.last_x * window.screen.width,
                 clientY: this.last_y * window.screen.height
             }
             this.setNavCenter(mouse);
         }
         if (e.keyCode == 37)
             this.leftArrowDown = false;
         if (e.keyCode == 38)
             this.upArrowDown = false;
         if (e.keyCode == 39)
             this.rightArrowDown = false;
         if (e.keyCode == 40)
             this.downArrowDown = false;
         if (e.keyCode == 32)
             this.spaceDown = false;
         if (e.keyCode == 17)
             this.ctrlDown = false;
         if (e.keyCode == 16)
             this.shiftDown = false;
         if (this.shiftDown == true && this.ctrlDown == true)
         {
             this.middledown = true;
             this.rightdown = false;
         }
         else if (this.shiftDown == true)
         {
             this.middledown = false;
             this.rightdown = true;
         }
         else
         {
             this.middledown = false;
             this.rightdown = false;
         }
         if (this.shiftDown && e.keyCode == 32)
         {
             $('#MenuFocusSelected').click();
         }
     }
     this.keyboardControl = function()
     {
         if (this.ctrlDown)
         {
             if (this.downArrowDown)
                 this.simulateWheel(50);
             if (this.upArrowDown)
                 this.simulateWheel(-50);
         }
         else if (!this.spaceDown)
         {
             if (this.downArrowDown)
                 this.simulateRightDrag(0, -5);
             if (this.upArrowDown)
                 this.simulateRightDrag(0, 5);
             if (this.leftArrowDown)
                 this.simulateRightDrag(5, 0);
             if (this.rightArrowDown)
                 this.simulateRightDrag(-5, 0);
         }
         else if (this.spaceDown)
         {
             if (this.downArrowDown)
                 this.simulateMiddleDrag(0, -50);
             if (this.upArrowDown)
                 this.simulateMiddleDrag(0, 50);
             if (this.leftArrowDown)
                 this.simulateMiddleDrag(50, 0);
             if (this.rightArrowDown)
                 this.simulateMiddleDrag(-50, 0);
         }
     }
     this.localpointerMove = function(parms, pickInfo)
     {
         if (!_dView.inDefaultCamera()) return;
         if (document.AxisSelected != null)
             if (document.AxisSelected != -1)
                 return;
         if (this.rel_x == undefined) return;
         this.rel_x = this.last_x - parms.clientX / window.screen.width;
         this.rel_y = this.last_y - parms.clientY / window.screen.height;
         //only works with pointer lock
         if (parms.originalEvent && (this.rightdown == true || this.middledown == true))
         {
             this.rel_x = -(parms.originalEvent.webkitMovementX || parms.originalEvent.mozMovementX || parms.originalEvent.MovementX) / 1000 || this.rel_x;
             this.rel_y = -(parms.originalEvent.webkitMovementY || parms.originalEvent.mozMovementY || parms.originalEvent.MovementY) / 1000 || this.rel_y;
         }
         if ((this.rightdown == true && this.middledown == false))
         {
             if (this.objectFollowed)
             {
                 var rz = this.lastRotZ || 0;
                 this.lastRotZ = (rz + (this.rel_x * 5 || 0)) || 0;
                 vwf_view.kernel.setProperty(this.objectFollowed.id, 'rotZ', this.lastRotZ);
             }
             this.x_rot += this.rel_x;
             this.y_rot += this.rel_y;
         }
         if ((this.cameramode == 'Orbit' || this.cameramode == 'Free') && this.middledown == true)
         {
             var screenmousepos = [(parms.clientX - this.rel_x * 1000) / window.screen.width, (parms.clientY - this.rel_y * 1000) / window.screen.height, 0, 1];
             screenmousepos[0] *= 2;
             screenmousepos[1] *= 2;
             screenmousepos[0] -= 1;
             screenmousepos[1] -= 1;
             screenmousepos[1] *= -1;
             var worldmousepos = MATH.mulMat4Vec4(MATH.inverseMat4(getViewProjection(this.camera)), screenmousepos);
             worldmousepos[0] /= worldmousepos[3];
             worldmousepos[1] /= worldmousepos[3];
             worldmousepos[2] /= worldmousepos[3];
             screenmousepos = [this.last_x, this.last_y, 0, 1];
             screenmousepos[0] *= 2;
             screenmousepos[1] *= 2;
             screenmousepos[0] -= 1;
             screenmousepos[1] -= 1;
             screenmousepos[1] *= -1;
             var worldmousepos2 = MATH.mulMat4Vec4(MATH.inverseMat4(getViewProjection(this.camera)), screenmousepos);
             worldmousepos2[0] /= worldmousepos2[3];
             worldmousepos2[1] /= worldmousepos2[3];
             worldmousepos2[2] /= worldmousepos2[3];
             var panfactor = 10;
             if (this.cameramode == 'Free')
                 panfactor = 50;
             ////console.log(this.zoom);
             this.center = MATH.addVec3(this.center, MATH.scaleVec3(MATH.subVec3(worldmousepos2, worldmousepos), panfactor * this.zoom));
         }
         if (this.cameramode == 'Navigate' && this.middledown == true)
         {
             this.zoom += -this.rel_y * this.zoom * 3.0;
         }
         this.last_x = parms.clientX / window.screen.width;
         this.last_y = parms.clientY / window.screen.height;
     }
     var tempvec = new THREE.Vector3(0, 0, 0);
     var tside = [0, 0, 0];
     var tfinaloffset = [0, 0, 0];
     var tfinalpos = [0, 0, 0];
     var XAXIS = [1, 0, 0];
     var YAXIS = [0, 1, 0];
     var ZAXIS = [0, 0, 1];
     var toffset = [0, 0, 0];
     var tstage2offset = [0, 0, 0];
     var txmatrix = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
     var tcrossmatrix = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

     function TempVec3(arr)
     {
         tempvec.x = arr[0];
         tempvec.y = arr[1];
         tempvec.z = arr[2];
         return tempvec;
     }
     this.orientationEvent = function(e)
     {
         if (this.cameramode !== 'DeviceOrientation')
             return;
         var x = (e.alpha) * .0174532925;
         var y = e.beta * .0174532925;
         var z = e.gamma * .0174532925
         var zee = new THREE.Vector3(0, 0, 1);
         var orient = THREE.Math.degToRad(90);
         var euler = new THREE.Euler();
         var q0 = new THREE.Quaternion();
         var q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // - PI/2 around the x-axis
         var quaternion = new THREE.Quaternion();
         euler.set(y, x, -z, 'YXZ')
         quaternion.setFromEuler(euler);
         quaternion.multiply(q1)
         quaternion.multiply(q0.setFromAxisAngle(zee, -orient));
         this.camera.matrixAutoUpdate = false;
         var oldx = this.camera.matrix.elements[12];
         var oldy = this.camera.matrix.elements[13];
         var oldz = this.camera.matrix.elements[14];
         this.camera.matrix.makeRotationFromQuaternion(quaternion);
         var r = new THREE.Matrix4();
         r.elements[0] = 1;
         r.elements[1] = 0;
         r.elements[1] = 0;
         r.elements[4] = 0;
         r.elements[5] = 0;
         r.elements[6] = 1;
         r.elements[8] = 0;
         r.elements[9] = -1;
         r.elements[10] = 0;
         r.multiply(this.camera.matrix);
         this.camera.matrix = r;
         this.camera.matrix.elements[12] = oldx;
         this.camera.matrix.elements[13] = oldy;
         this.camera.matrix.elements[14] = oldz;
         // console.log(e.alpha,e.beta,e.gamma);
     }
     this.updateCamera = function()
     {
         if(!this.active) return
         if (!_dView.inDefaultCamera()) return;
         this.keyboardControl();
         try
         {
             if (this.objectFollowed != null)
                 this.targetUpdated(this.objectFollowed);
         }
         catch (e)
         {
             this.objectFollowed = null;
             console.error(e)
         }
         if (this.cameramode == 'None' || this.cameramode == 'DeviceOrientation')
         {
             return;
         }
         if (this.cameramode == 'Navigate' && this.navpoint)
         {
             var offset = MATH.subVec3(this.navpoint, this.center)
             var len = MATH.lengthVec3(offset);
             if (len > .01)
             {
                 offset = MATH.scaleVec3(offset, .02);
                 this.center = MATH.addVec3(this.center, offset);
             }
         }
         if (this.cameramode != '3RDPerson' && this.cameramode != 'FirstPerson')
         {
             if (this.x_rot == undefined) return;
             var xmatrix = MATH.angleAxis(this.x_rot * 10, ZAXIS, txmatrix);
             var offset = MATH.mulMat4Vec3(xmatrix, XAXIS, toffset);
             offset = Vec3.scale(offset, 1 / MATH.lengthVec3(offset), offset);
             tside = Vec3.cross([0, 0, 1], offset, tside);
             if (this.y_rot < .479) this.y_rot = .479;
             if (this.y_rot > .783 && (this.cameramode != 'Free' && this.cameramode != 'Fly')) this.y_rot = .783;
             if (this.y_rot > .783 && (this.cameramode == 'Free' || this.cameramode == 'Fly')) this.y_rot = .783;
             var crossmatrix = MATH.angleAxis(this.y_rot * 10, tside, tcrossmatrix);
             var stage2offset = MATH.mulMat4Vec3(crossmatrix, offset, tstage2offset);
             stage2offset = Vec3.scale(stage2offset, 1 / MATH.lengthVec3(stage2offset), stage2offset);
             tfinaloffset = Vec3.scale(stage2offset, this.zoom, tfinaloffset);
             if (this.center[2] < .05)
                 this.center[2] = .05;
             tfinalpos = Vec3.add(tfinaloffset, this.center, tfinalpos);
             this.camera.position.x = tfinalpos[0];
             this.camera.position.y = tfinalpos[1];
             this.camera.position.z = tfinalpos[2];
             this.camera.lookAt(TempVec3(this.center));
         }
         else if (this.cameramode == 'FirstPerson')
         {
             try
             {
                 //this.oldRotZ var xmatrix = MATH.angleAxis(this.x_rot*10,[0,0,1]);
                 var rotation = this.objectFollowed.rotation;
                 var offset = this.objectFollowed.transformAPI.localToGlobalRotation([0, 1.5, .5]);
                 offset = MATH.scaleVec3(offset, 1 / MATH.lengthVec3(offset));
                 var side = MATH.crossVec3([0, 0, 1], offset);
                 if (this.y_rot < .479) this.y_rot = .479;
                 if (this.y_rot > .783) this.y_rot = .783;
                 var crossmatrix = MATH.angleAxis(this.y_rot * 10, side);
                 var stage2offset = MATH.mulMat4Vec3(crossmatrix, offset);
                 stage2offset = MATH.scaleVec3(stage2offset, 1 / MATH.lengthVec3(stage2offset));
                 var finaloffset = MATH.scaleVec3(stage2offset, this.zoom);
                 if (this.center[2] < .05)
                     this.center[2] = .05;
                 var finalpos = MATH.addVec3(finaloffset, this.center);
                 //this.camera.translation = finalpos;
                 this.camera.position.x = finalpos[0];
                 this.camera.position.y = finalpos[1];
                 this.camera.position.z = finalpos[2];
                 this.camera.lookAt(TempVec3(this.center));
                 this.camera.updateProjectionMatrix(true);
                 this.zoom = .0001;
             }
             catch (e)
             {
                 console.error(e);
             }
         }
         else if (this.cameramode == '3RDPerson')
         {
             try
             {
                 var offset = this.objectFollowed.transformAPI.localToGlobalRotation([0, 1.5, .5]);
                 var finaldist = MATH.lengthVec3(offset);
                 offset = MATH.scaleVec3(offset, 1 / finaldist);
                 var start = MATH.addVec3(this.center, MATH.scaleVec3(offset, .3));
                 var oldpickstate = findviewnode(this.objectFollowed.id).PickPriority;
                 var hit = _Editor.ThreeJSPick(start, MATH.scaleVec3(offset, 1),
                 {
                     filter: function(o)
                     {
                         if (o instanceof THREE.Line) return false;
                         return !(o.isAvatar === true || o.passable === true)
                     }
                 });
                 if (hit)
                 {
                     finaldist = Math.min(finaldist, hit.distance - .2);
                 }
                 findviewnode(this.objectFollowed.id).PickPriority = oldpickstate;
                 offset = MATH.scaleVec3(offset, finaldist);
                 var finalpos = MATH.addVec3(offset, start);
                 this.camera.position.x = finalpos[0];
                 this.camera.position.y = finalpos[1];
                 this.camera.position.z = finalpos[2];
                 this.camera.lookAt(TempVec3(this.center));
             }
             catch (e)
             {
                 console.error(e)
             }
         }
         this.callUpdateCallbacks();
         this.camera.updateMatrixWorld();
         this.camera.updateMatrix();
         //this really belongs in the view 
         if (this.oculusActive && _dView.vrHMDSensor)
         {
             var state = _dView.vrHMDSensor.getState();
             //console.log(state.timeStamp);
             var headPos = new THREE.Vector3(state.position.x, state.position.y, state.position.z);
             var headPosVel = new THREE.Vector3(state.linearVelocity.x, state.linearVelocity.y, state.linearVelocity.z);
             var headQuatVel = new THREE.Vector3(state.angularVelocity.x, state.angularVelocity.y, state.angularVelocity.z);
             var headQuatAcc = new THREE.Vector3(state.angularAcceleration.x, state.angularAcceleration.y, state.angularAcceleration.z);
             var headQuatEuler = new THREE.Euler(0, 0, 0, 'XYZ');
             var headQuat = new THREE.Quaternion(state.orientation.x, state.orientation.y, state.orientation.z, state.orientation.w);
             headQuatEuler.setFromQuaternion(headQuat);
             var t = window.fpt || .2; //20ms
             var x = headQuatEuler.x + headQuatVel.x * t + .5 * headQuatAcc.x * t * t;
             var y = headQuatEuler.y + headQuatVel.y * t + .5 * headQuatAcc.y * t * t;
             var z = headQuatEuler.z + headQuatVel.z * t + .5 * headQuatAcc.z * t * t;
             headQuatEuler.x = x;
             headQuatEuler.y = y;
             headQuatEuler.z = z;
             if (window.fpt > 0)
                 headQuat.setFromEuler(headQuatEuler);
             //
             //forward predict rotation 10ms
             var q = new THREE.Quaternion(0, 0.7570626871303509, 0.6533422439694011, 0);
             headPos.applyQuaternion(q.clone().inverse());
             this.camera.quaternion.copy(q);
             this.camera.quaternion.multiply(headQuat);
             // headPos.applyQuaternion(q);
             this.camera.position.add(headPos);
         }
         this.camera.updateMatrixWorld();
         this.camera.updateMatrix();
     }
     this.setCameraMode = function(mode)
     {
         this.cameramode = mode;
         if (this.cameramode == 'Orbit')
             this.followObject(null);
         if (this.cameramode == 'Navigate')
             this.navpoint = this.center;
         if (this.cameramode == 'Free' || this.cameramode == 'Fly')
         {
             this.ReprojectCameraCenter();
             this.followObject(null);
         }
     }
     this.orbitPoint = function(point)
     {
         this.setCameraMode('Orbit');
         var campos = [this.camera.position.x, this.camera.position.y, this.camera.position.z];
         var diff = MATH.subVec3(campos, point);
         var length = MATH.lengthVec3(diff);
         diff = MATH.scaleVec3(diff, 1.0 / length);
         //this.offset = diff;
         this.zoom = length;
         this.center = point;
         this.objectFollowed = null;
     }
     this.ReprojectCameraCenter = function()
     {
         var campos = [this.camera.position.x, this.camera.position.y, this.camera.position.z];
         var worldmousepos = this.GetCameraCenterRay();
         worldmousepos = MATH.scaleVec3(worldmousepos, .4);
         this.center = MATH.addVec3(worldmousepos, campos);
         this.zoom = .4;
     }
     this.GetCameraCenterRay = function()
     {
         var screenmousepos = [0, 0, 0, 1];
         var worldmousepos = MATH.mulMat4Vec4(MATH.inverseMat4(getViewProjection(this.camera)), screenmousepos);
         worldmousepos[0] /= worldmousepos[3];
         worldmousepos[1] /= worldmousepos[3];
         worldmousepos[2] /= worldmousepos[3];
         var campos = [this.camera.position.x, this.camera.position.y, this.camera.position.z];
         var ray = MATH.subVec3(worldmousepos, campos);
         var dist = MATH.lengthVec3(ray);
         ray = MATH.scaleVec3(ray, 1.0 / MATH.lengthVec3(ray));
         return ray;
     }
     this.pointerLeave = function(parms) {}
     this.localpointerWheel = function(pickInfo)
     {
         if (this.cameramode != 'Free' && this.cameramode != 'Fly' && this.cameramode != 'Navigate' && this.cameramode != 'FirstPerson')
         {
             if (this.zoom < .4 && pickInfo.deltaY < 0)
             {
                 var campos = [this.camera.position.x, this.camera.position.y, this.camera.position.z];
                 var worldmousepos = this.GetCameraCenterRay();
                 worldmousepos = MATH.scaleVec3(worldmousepos, 1);
                 this.center = MATH.addVec3(worldmousepos, campos);
                 this.zoom = 1;
             }
             else
             {
                 if (pickInfo.deltaY < 0)
                     this.zoom *= .9;
                 else
                     this.zoom *= 1.1;
             }
         }
         if (this.cameramode == 'Free')
         {
             if (pickInfo.deltaY > 0)
                 this.center = MATH.subVec3(this.center, this.GetCameraCenterRay());
             else
                 this.center = MATH.addVec3(this.GetCameraCenterRay(), this.center);
         }
         if (this.cameramode == 'Fly')
         {
             if (pickInfo.deltaY > 0)
                 this.flyspeed *= 1.1;
             else
                 this.flyspeed *= .9;
         }
         if (this.cameramode == 'FirstPerson' && pickInfo.deltaY > 0)
         {
             require("vwf/view/threejs/editorCameraController").setCameraMode('3RDPerson');
             require("vwf/view/threejs/editorCameraController").getController('3RDPerson').zoom = 1;
         }
         else if (this.cameramode == '3RDPerson' && pickInfo.deltaY < 0)
         {
             this.y_rot = .6245;
             this.cameramode = 'FirstPerson';
         }
     }
     this.prerender = function()
     {
         if (this.cameramode == 'Fly')
         {
             var dist = window.deltaTime / (this.flyspeed * 30.0);
             var forward = new THREE.Vector3(0, 0, -1);
             var center = new THREE.Vector3(0, 0, 0);
             var cam = this.camera;
             forward.applyMatrix4(cam.matrixWorld);
             center.applyMatrix4(cam.matrixWorld);
             var offset = forward.sub(center);
             offset.setLength(.400 + dist);
             center.add(offset);
             this.center = [center.x, center.y, center.z];
             this.camera.position.copy(center);
         }
         this.updateCamera();
     }
 }
 define([],function()
 {
    return new oldCameraController();
 })