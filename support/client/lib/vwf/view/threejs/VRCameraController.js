function findviewnode(id)
{
    for (var i = 0; i < vwf.views.length; i++)
    {
        if (vwf.views[i].state.nodes[id].threeObject) return vwf.views[i].state.nodes[id].threeObject;
    }
    return null;
}
var VRCameraController = function()
{
    this.initialize = function(camera)
    {
        this.camera = camera;
        this.keysDown = {};
        this.movement = new THREE.Vector3(0,0,0);
        this.position = new THREE.Vector3(0,0,1.5);
        this.rot = new THREE.Quaternion();
        this.angle = 0;
        this.rot.setFromAxisAngle(new THREE.Vector3(0,0,1),this.angle);
    }
    this.localTouchStart = function(event) {}
    this.localTouchEnd = function(event) {}
    this.localTouchMove = function(event) {}
    this.localpointerDown = function(e, pickInfo)
    {
        if(e.button == 2)
             this.movement.z -= .1;
        if(e.button == 1)
             this.movement.z += .1; 
    }
    this.localpointerUp = function(e, pickInfo)
    {
        if(e.button == 2)
             this.movement.z += .1;
         if(e.button == 1)
             this.movement.z -= .1; 
    }
    this.localKeyDown = function(e)
    {
       if(this.keysDown[e.keyCode]) return;
       this.keysDown[e.keyCode] = true;
       if (e.keyCode == 87 || e.keyCode == 38) //W
       {
            this.movement.z -= .1;
       }
       if (e.keyCode == 83 || e.keyCode == 40) //S
       {
            this.movement.z += .1;
       }
    }
    this.localKeyUp = function(e)
    {
       delete this.keysDown[e.keyCode];
       if (e.keyCode == 87 || e.keyCode == 38) //W
       {
            this.movement.z += .1;
       }
       if (e.keyCode == 83 || e.keyCode == 40) //S
       {
            this.movement.z -= .1;
       }
    }
    this.localpointerMove = function(e, pickInfo)
    {
        
    }
    this.orientationEvent = function(e) {}
    this.updateCamera = function()
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
         
         var m = new THREE.Matrix4();
         m.makeRotationFromQuaternion(headQuat);
         var flip = new THREE.Matrix4();
         flip.set 
        (
            1,  0,  0,  0,
            0,  0,  -1,  0,
            0,  1,  0,  0,
            0,  0,  0,  1
        );
        this.rot.setFromAxisAngle(new THREE.Vector3(0,0,1),this.angle);
        headPos.applyMatrix4(flip);
        headPos.applyQuaternion(this.rot);
        headPos.x *=1.2;
        headPos.y *=1.2;
        headPos.z *=1.2;
        flip.multiply(m);
         headQuat.setFromRotationMatrix(flip);
         
         
         this.rot.multiply(headQuat)
         this.camera.quaternion.copy(this.rot);
         // headPos.applyQuaternion(q);
         this.position.add(this.movement.clone().applyQuaternion(this.camera.quaternion));
         this.camera.position.copy(this.position);
         this.camera.position.add(headPos);
    }
    this.setCameraMode = function(mode) {}
    this.pointerLeave = function(e) {}
    this.localpointerWheel = function(e)
    {
        if (e.deltaY > 0)
            this.angle += .05;
        else
            this.angle -= .05;
    }
    this.prerender = function()
    {
        this.updateCamera();
    }
}
define([], function()
{
    return new VRCameraController();
})