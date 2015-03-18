
var AvatarCameraController = function()
{
    this.initialize = function(camera)
    {
        this.camera = camera;
        this.offset = new THREE.Vector3(0, 1, 0);
        this.last_x = 0;
        this.rel_x = 0;
        this.last_y = 0;
        this.rel_y = 0;
        this.totalz = 0;
        this.zoom = 3;
        this.mouseDown = false;
        this.shiftDown = false;
        this.ctrlDown = false;
        this.keysDown = {};
    }
    this.localTouchStart = function(event) {}
    this.localTouchEnd = function(event) {}
    this.localTouchMove = function(event) {}
    this.localpointerDown = function(e, pickInfo)
    {
        if (e.button == 2)
            this.mouseDown = true;
        this.last_x = e.clientX;
        this.last_y = e.clientY;
    }
    this.localpointerUp = function(e, pickInfo)
    {
        if (e.button == 2)
            this.mouseDown = false;
    }
    this.localKeyDown = function(e)
    {
       // if(e.keyCode !=87 && e.keyCode != 38 && this.keysDown[e.keyCode]) return;
        
        var id = _UserManager.GetAvatarForClientID(vwf.moniker()).id;
        if (e.keyCode == 16)
            this.shiftDown = true;
        if (e.keyCode == 17)
            this.ctrlDown = true;
        if (e.keyCode == 87 || e.keyCode == 38) //W
        {
            vwf_view.kernel.callMethod(id, 'lookat', [
                [-this.offset.x, -this.offset.y, -this.offset.z]
            ]);
            this.keysDown[e.keyCode] = true;
        }
        if (e.keyCode == 65 || e.keyCode == 37) //A
        {
            var up = new THREE.Vector3(0, 0, 1);
            var side = this.offset.clone().cross(up);
            vwf_view.kernel.callMethod(id, 'lookat', [
                [side.x, side.y, side.z]
            ]);
            this.keysDown[e.keyCode] = true;
        }
        if (e.keyCode == 68 || e.keyCode == 39) //D
        {
            var up = new THREE.Vector3(0, 0, 1);
            var side = this.offset.clone().cross(up);
            vwf_view.kernel.callMethod(id, 'lookat', [
                [-side.x, -side.y, -side.z]
            ]);
            this.keysDown[e.keyCode] = true;
        }
        if (e.keyCode == 83 || e.keyCode == 40) //S
        {
            vwf_view.kernel.callMethod(id, 'lookat', [
                [-this.offset.x, -this.offset.y, -this.offset.z]
            ]);
            this.keysDown[e.keyCode] = true;
        }
    }
    this.localKeyUp = function(e)
    {
        delete this.keysDown[e.keyCode];
        if (e.keyCode == 16)
            this.shiftDown = false;
        if (e.keyCode == 17)
            this.ctrlDown = false;
    }
    this.localpointerMove = function(e, pickInfo)
    {
        this.rel_x = e.clientX - this.last_x;
        this.last_x = e.clientX;
        if (this.mouseDown || this.shiftDown)
        {
            var rot_z = new THREE.Quaternion();
            rot_z.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -this.rel_x / 300);
            this.offset = this.offset.applyQuaternion(rot_z);
        }
        this.rel_y = e.clientY - this.last_y;
        this.last_y = e.clientY;
        if (this.mouseDown || this.shiftDown)
            this.totalz += this.rel_y;
        else if (this.ctrlDown)
        {
            this.zoom += this.rel_y / 100;
        }
    }
    this.orientationEvent = function(e) {}
    this.updateCamera = function()
    {
        if (Object.keys(this.keysDown).length > 0)
        {
            var transform = vwf.getProperty(_UserManager.GetAvatarForClientID(vwf.moniker()).id, 'transform');
            var charspaceforward = Mat4.multVec3NoTranslate(transform, [0, 1, 0], []);
            this.offset.x = this.offset.x * .97 + charspaceforward[0] * .03;
            this.offset.y = this.offset.y * .97 + charspaceforward[1] * .03;
        }
        var avatar = _UserManager.GetAvatarForClientID(vwf.moniker()).transformAPI.getPosition();
        var center = new THREE.Vector3(avatar[0], avatar[1], avatar[2] + 1.5);
        var pos = center.clone().add(this.offset.setLength(this.zoom));
        pos.z += this.totalz / 200 * this.zoom;
        this.camera.position.copy(pos);
        this.camera.lookAt(center);
    }
    this.setCameraMode = function(mode) {}
    this.pointerLeave = function(e) {
        this.keysDown = {};
    }
    this.localpointerWheel = function(e)
    {
        if (e.deltaY > 0)
            this.zoom *= 1.1;
        else
            this.zoom *= .9;
        if (this.zoom < .5)
            require("vwf/view/threejs/editorCameraController").setCameraMode('FirstPerson');
    }
    this.prerender = function()
    {
        this.updateCamera();
    }
}
define([], function()
{
    return new AvatarCameraController();
})