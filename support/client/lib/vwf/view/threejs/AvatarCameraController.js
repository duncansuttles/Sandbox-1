function findviewnode(id)
{
    for (var i = 0; i < vwf.views.length; i++)
    {
        if (vwf.views[i].state.nodes[id].threeObject) return vwf.views[i].state.nodes[id].threeObject;
    }
    return null;
}
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
    }
    this.localTouchStart = function(event) {}
    this.localTouchEnd = function(event) {}
    this.localTouchMove = function(event) {}
    this.localpointerDown = function(e, pickInfo)
    {
        this.mouseDown = true;
        this.last_x = e.clientX;
        this.last_y = e.clientY;
    }
    this.localpointerUp = function(e, pickInfo)
    {
        this.mouseDown = false;
    }
    this.localKeyDown = function(e) {

        console.log(e)

    }
    this.localKeyUp = function(e) {}
    this.localpointerMove = function(e, pickInfo)
    {
        if (!this.mouseDown) return;
        this.rel_x = e.clientX - this.last_x;
        this.last_x = e.clientX;
        var rot_z = new THREE.Quaternion();
        rot_z.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -this.rel_x/300);
        this.offset = this.offset.applyQuaternion(rot_z);
        this.rel_y = e.clientY - this.last_y;
        this.last_y = e.clientY;
        this.totalz += this.rel_y;
    }
    this.orientationEvent = function(e) {}
    this.updateCamera = function()
    {
        var avatar = _UserManager.GetAvatarForClientID(vwf.moniker()).transformAPI.getPosition();
        var center = new THREE.Vector3(avatar[0],avatar[1],avatar[2]+1.5);
        var pos = center.clone().add(this.offset.setLength(this.zoom));
        pos.z += this.totalz/200 * this.zoom;
        this.camera.position.copy(pos);
        this.camera.lookAt(center);
    }
    this.setCameraMode = function(mode) {}
    this.pointerLeave = function(e) {}
    this.localpointerWheel = function(e) {
        if(e.deltaY > 0)
            this.zoom *= 1.1;
        else
            this.zoom *= .9;
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