function to3Vec(vec,two,three)
      {
        if(vec.length)
            return new THREE.Vector3(vec[0],vec[1],vec[2]);
        else
            return new THREE.Vector3(vec,two,three);
      }
function pointInFrustrum(point,frustrum)
{
//checks if cube points are within the frustum planes
	
	
	var x, y, z;
	
		x=point[0];
		y=point[1];
		z=point[2];
	
	for(var i = 0; i < frustrum.planes.length; i++)
	{
		var vec = GLGE.subVec3(point,frustrum.planes[i].point);
		vec = GLGE.toUnitVec3(vec);
		if(GLGE.dotVec3(vec,frustrum.planes[i].normal) < 0)
			return false;
	}
	return true;

}



// a quick structure to test bounding boxes
function BoundingBoxRTAS(min,max)
{
	this.max = [-Infinity,-Infinity,-Infinity];
	this.min = [Infinity,Infinity,Infinity];
	if(min)
		this.min = min;
	if(max)	
		this.max = max;
}
// copy
BoundingBoxRTAS.prototype.clone = function()
{
	return new BoundingBoxRTAS([this.min[0],this.min[1],this.min[2]],[this.max[0],this.max[1],this.max[2]]);
}
//sort of like add for two boxes. expand this box to include the new one was well as itself
BoundingBoxRTAS.prototype.expandBy = function(bb)
{
	if(bb.min[0] < this.min[0]) this.min[0] = bb.min[0];
	if(bb.min[1] < this.min[1]) this.min[1] = bb.min[1];
	if(bb.min[2] < this.min[2]) this.min[2] = bb.min[2];
	if(bb.max[0] > this.max[0]) this.max[0] = bb.max[0];
	if(bb.max[1] > this.max[1]) this.max[1] = bb.max[1];
	if(bb.max[2] > this.max[2]) this.max[2] = bb.max[2];
}
//transform the boundging box by a matrix, then re-axis align.
BoundingBoxRTAS.prototype.transformBy = function(matrix)
{
	var mat = [];
	for(var i = 0; i < matrix.length; i++)
	 mat.push(matrix[i]);
	//mat = GLGE.inverseMat4(mat); 
	
	var points = [];
	var allpoints = [];
	var min = this.min;
	var max = this.max;
	//list of all corners
	points.push([min[0],min[1],min[2]]);
	points.push([min[0],min[1],max[2]]);
	points.push([min[0],max[1],min[2]]);
	points.push([min[0],max[1],max[2]]);
	points.push([max[0],min[1],min[2]]);
	points.push([max[0],min[1],max[2]]);
	points.push([max[0],max[1],min[2]]);
	points.push([max[0],max[1],max[2]]);
	for(var i = 0; i < points.length; i++)
	{
		//transform all points
		allpoints = allpoints.concat(GLGE.mulMat4Vec3(mat,points[i]));
	}
	//find new axis aligned bounds
	var bounds = FindMaxMin(allpoints);
	var min2 = bounds[0];
	var max2 = bounds[1];
	return new  BoundingBoxRTAS(min2,max2);
}

BoundingBoxRTAS.prototype.intersectFrustrum = function(frustrum)
{
	var p0 = [this.min[0],this.min[1],this.min[2]];
	var p1 = [this.min[0],this.min[1],this.max[2]];
	var p2 = [this.min[0],this.max[1],this.min[2]];
	var p3 = [this.min[0],this.max[1],this.max[2]];
	var p4 = [this.max[0],this.min[1],this.min[2]];
	var p5 = [this.max[0],this.min[1],this.max[2]];
	var p6 = [this.max[0],this.max[1],this.min[2]];
	var p7 = [this.max[0],this.max[1],this.max[2]];
	
	var points = [p0,p1,p2,p3,p4,p5,p6,p7];
	for(var i =0; i < 8; i++)
	{
		if(pointInFrustrum(points[i],frustrum))
			return true;
	}
	for(var i=0; i < 4; i ++)
	{
		if(this.intersect(frustrum.cornerRays[i].o,frustrum.cornerRays[i].d).length > 0)
			return true;
	}
	return false;
}
//intersect ray and bounding box
BoundingBoxRTAS.prototype.intersect = function(o,d)
{	
		//TODO: are these loose bounds necessary?
		var min = [this.min[0]-.01,this.min[1]-.01,this.min[2]-.01];
		var max = [this.max[0]+.01,this.max[1]+.01,this.max[2]+.01];
 		var dirfrac = [0,0,0];
		var t;
		// d is unit direction vector of ray
		dirfrac[0] = 1.0 / d[0];
		dirfrac[1] = 1.0 / d[1];
		dirfrac[2] = 1.0 / d[2];
		// this.min is the corner of AABB with Math.minimal coordinates - left bottom, this.max is Math.maximal corner
		// o is origin of ray
		var t1 = (min[0] - o[0])*dirfrac[0];
		var t2 = (max[0] - o[0])*dirfrac[0];
		var t3 = (min[1] - o[1])*dirfrac[1];
		var t4 = (max[1] - o[1])*dirfrac[1];
		var t5 = (min[2] - o[2])*dirfrac[2];
		var t6 = (max[2] - o[2])*dirfrac[2];

		var tMathmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
		var tMathmax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));

		// if tMath.max < 0, ray (line) is intersecting AABB, but whole AABB is behing us
		if (tMathmax < 0)
		{
			t = tMathmax;
			return [];
		}

		// if tMath.min > tMath.max, ray doesn't intersect AABB
		if (tMathmin > tMathmax)
		{
			t = tMathmax;
			return [];
		}

		t = tMathmin;
		return [true]; 
    
   
    return [true]; // if we made it here, there was an intersection - YAY

}



	  
function Frustrum(ntl,ntr,nbl,nbr,ftl,ftr,fbl,fbr)
{
	this.ntl = ntl;
	this.ntr = ntr;
	this.nbl = nbl;
	this.nbr = nbr;
					
	this.ftl = ftl;
	this.ftr = ftr;
	this.fbl = fbl;
	this.fbr = fbr;
					

	this.nearnorm=GLGE.toUnitVec3(GLGE.crossVec3(GLGE.subVec3(this.ntr,this.nbr),GLGE.subVec3(this.nbl,this.nbr)));
	this.farnorm=GLGE.toUnitVec3(GLGE.crossVec3(GLGE.subVec3(this.ftl,this.fbl),GLGE.subVec3(this.ftr,this.fbl)));
	this.leftnorm=GLGE.toUnitVec3(GLGE.crossVec3(GLGE.subVec3(this.nbl,this.fbl),GLGE.subVec3(this.ftl,this.fbl)));
	this.rightnorm=GLGE.toUnitVec3(GLGE.crossVec3(GLGE.subVec3(this.ftr,this.ntr),GLGE.subVec3(this.ntr,this.nbr)));
	this.topnorm=GLGE.toUnitVec3(GLGE.crossVec3(GLGE.subVec3(this.ftl,this.ntr),GLGE.subVec3(this.ntr,this.ftr)));
	this.bottomnorm=GLGE.toUnitVec3(GLGE.crossVec3(GLGE.subVec3(this.nbl,this.nbr),GLGE.subVec3(this.fbl,this.nbl)));
	
	this.nearplane = {point:this.ntl,normal:GLGE.scaleVec3(this.nearnorm,-1)};
	this.farplane = {point:this.ftl,normal:GLGE.scaleVec3(this.farnorm,-1)};
	this.leftplane = {point:this.ftl,normal:GLGE.scaleVec3(this.leftnorm,-1)};
	this.rightplane = {point:this.ntr,normal:GLGE.scaleVec3(this.rightnorm,-1)};
	this.topplane = {point:this.ftl,normal:GLGE.scaleVec3(this.topnorm,-1)};
	this.bottomplane = {point:this.fbl,normal:GLGE.scaleVec3(this.bottomnorm,-1)};
	this.planes = [this.nearplane,this.farplane,this.leftplane,this.rightplane,this.topplane,this.bottomplane];
	
	this.cornerRays = [];
	var rayTL = GLGE.toUnitVec3(GLGE.subVec3(this.ftl,this.ntl));
	var rayTR = GLGE.toUnitVec3(GLGE.subVec3(this.ftr,this.ntr));
	var rayBL = GLGE.toUnitVec3(GLGE.subVec3(this.fbl,this.nbl));
	var rayBR = GLGE.toUnitVec3(GLGE.subVec3(this.fbr,this.nbr));
	
	this.cornerRays.push({o:this.ntl,d:rayTL});
	this.cornerRays.push({o:this.ntr,d:rayTR});
	this.cornerRays.push({o:this.nbl,d:rayBL});
	this.cornerRays.push({o:this.nbr,d:rayBR});
	
	this.to3Frust = function()
	{
		var nearplane = new THREE.Plane(to3Vec(this.nearplane.normal),to3Vec(this.nearplane.point));
		var farplane = new THREE.Plane(to3Vec(this.farplane.normal),to3Vec(this.farplane.point));
		var leftplane = new THREE.Plane(to3Vec(this.leftplane.normal),to3Vec(this.leftplane.point));
		var rightplane = new THREE.Plane(to3Vec(this.rightplane.normal),to3Vec(this.rightplane.point));
		var topplane = new THREE.Plane(to3Vec(this.topplane.normal),to3Vec(this.topplane.point));
		var bottomplane = new THREE.Plane(to3Vec(this.bottomplane.normal),to3Vec(this.bottomplane.point));
		return new THREE.Frustum(nearplane,farplane,leftplane,rightplane,topplane,bottomplane);
	}
	this.transformBy = function(matrix)
	{
		var ntl = GLGE.mulMat4Vec3(matrix,this.ntl);
		var ntr = GLGE.mulMat4Vec3(matrix,this.ntr);
		var nbl = GLGE.mulMat4Vec3(matrix,this.nbl);
		var nbr = GLGE.mulMat4Vec3(matrix,this.nbr);
		
		var ftl = GLGE.mulMat4Vec3(matrix,this.ftl);
		var ftr = GLGE.mulMat4Vec3(matrix,this.ftr);
		var fbl = GLGE.mulMat4Vec3(matrix,this.fbl);
		var fbr = GLGE.mulMat4Vec3(matrix,this.fbr);
		
		return new Frustrum(ntl,ntr,nbl,nbr,ftl,ftr,fbl,fbr);	
	}
	this.intersectsObject = function(geo)
	{
		
		var bb = geo.boundingBox;
		if(!bb)
			geo.computeBoundingBox();
		bb = geo.boundingBox;
		
		var box = new BoundingBoxRTAS([bb.min.x,bb.min.y,bb.min.z],[bb.max.x,bb.max.y,bb.max.z]);
		return box.intersectFrustrum(this)
		
	}
}

function Editor()
{
	var SelectedVWFNodes = [];
	var MoveGizmo = null;
	var WorldMouseDownPoint = null;
	var SelectMode = 'None';
	var ClickOffset = null;
	var Move = 0; var Rotate = 1; var Scale = 2; var Multi = 3;
	var GizmoMode = Move;
	var oldintersectxy = [];
	var oldintersectxz = [];
	var oldintersectyz = [];
	
	this.mouseDownScreenPoint = [0,0];
	this.mouseUpScreenPoint = [0,0];
	this.selectionMarquee = null; 
	
	var WorldCoords = 0;
	var LocalCoords = 1;
	var CoordSystem = WorldCoords;
	
	var NewSelect = 0;
	var Add = 2;
	var Subtract = 3;
	this.PickMod = NewSelect;
	
	var WorldZ = [0,0,1];
	var WorldY = [0,1,0];
	var WorldX = [1,0,0];
	
	var CurrentZ = [0,0,1];
	var CurrentY = [0,1,0];
	var CurrentX = [1,0,0];
	
	var RotateSnap = 5 * 0.0174532925;
	var MoveSnap = .2;
	var ScaleSnap = .15;
	
	var oldxrot = 0;
	var oldyrot = 0;
	var oldzrot = 0;
	
	var SelectionBounds = [];
	
	var lastscale = [1,1,1];
	var lastpos = [1,1,1];
	var OldX = 0;
	var OldY = 0;
	var MouseMoved = false;
	document.AxisSelected = -1;

	this.TempPickCallback = null;
	
	$(document.body).append('<div id="statusbar" class="statusbar" />');
	$('#statusbar').css('top',(document.height - 25) + 'px');
	
	$(window).resize(function(){
	
	});
	
	$('#statusbar').append('<div id="SceneName" class="statusbarElement" />');
	$('#SceneName').html('Not Saved');	
	$('#statusbar').append('<div id="StatusSelectedID" class="statusbarElement" />');
	$('#StatusSelectedID').html('No Selection');
	$('#statusbar').append('<div id="StatusPickMode" class="statusbarElement" />');
	$('#StatusPickMode').html('Pick: None');
	$('#statusbar').append('<div id="StatusSnaps" class="statusbarElement" />');
	$('#StatusSnaps').html('Snaps: 15deg, .5m, .1%');
	$('#statusbar').append('<div id="StatusAxis" class="statusbarElement" />');
	$('#StatusAxis').html('Axis: -1');
	$('#statusbar').append('<div id="StatusCoords" class="statusbarElement" />');
	$('#StatusCoords').html('World Coords');
	$('#statusbar').append('<div id="StatusTransform" class="statusbarElement" />');
	$('#StatusTransform').html('Move');
	$('#statusbar').append('<div id="StatusGizmoLocation" class="statusbarElement" />');
	$('#StatusGizmoLocation').html('[0,0,0]');
	$('#statusbar').append('<div id="StatusCameraLocation" class="statusbarElement" />');
	$('#StatusCameraLocation').html('[0,0,0]');		
	var _CoppiedNodes = [];
	//	$('#vwf-root').mousedown(function(e){
	var mousedown = function(e)
	{	
		
		$('#index-vwf').focus();
			$('#ContextMenu').hide();
			$('#ContextMenu').css('z-index','-1');
		
		
		MouseMoved = false;
		if(MoveGizmo && e.button == 0)
		{
			
			//console.log(vwf.views[0].lastPick.object.uid);
			var axis = -1;
			for(var i =0; i < MoveGizmo.children.length;i++)
			{
				if(vwf.views[0].lastPick)
				if(vwf.views[0].lastPick.object)
				if(vwf.views[0].lastPick.object == MoveGizmo.children[i])
				
				axis = i;
			}			
			
			document.AxisSelected = axis;
			
			OldX = e.clientX;
			OldY = e.clientY;
			updateGizmoOrientation(true);
			var t = 	new THREE.Vector3();
			t.getPositionFromMatrix(MoveGizmo.parent.matrixWorld);
			var gizpos = [t.x,t.y,t.z];
			var campos = [findcamera().position.x,findcamera().position.y,findcamera().position.z];
			var ray = GetWorldPickRay(e);
			
			var dxy = intersectLinePlaneTEST(ray,campos,gizpos,WorldZ);
			oldintersectxy = dxy;//GLGE.addVec3(campos,GLGE.scaleVec3(ray,dxy));
			
			var dxz = intersectLinePlaneTEST(ray,campos,gizpos,WorldY);
			oldintersectxz = dxz;//GLGE.addVec3(campos,GLGE.scaleVec3(ray,dxz));
			
			var dyz = intersectLinePlaneTEST(ray,campos,gizpos,WorldX);
			oldintersectyz = dyz;//GLGE.addVec3(campos,GLGE.scaleVec3(ray,dyz));
			
			
			if(document.AxisSelected == 3 || document.AxisSelected == 16 ||document.AxisSelected == 4 || document.AxisSelected == 17 || document.AxisSelected == 5 || document.AxisSelected == 18)
			{
				dxy = intersectLinePlane(ray,campos,gizpos,CurrentZ);
				oldintersectxy = GLGE.addVec3(campos,GLGE.scaleVec3(ray,dxy));
				
				dxz = intersectLinePlane(ray,campos,gizpos,CurrentY);
				oldintersectxz = GLGE.addVec3(campos,GLGE.scaleVec3(ray,dxz));
				
				dyz = intersectLinePlane(ray,campos,gizpos,CurrentX);
				oldintersectyz = GLGE.addVec3(campos,GLGE.scaleVec3(ray,dyz));
			}
			
			var relgizxy = GLGE.subVec3(gizpos,oldintersectxy);
			relgizxy = GLGE.scaleVec3(relgizxy,1.0/GLGE.lengthVec3(relgizxy));
			oldzrot = Math.acos(GLGE.dotVec3(CurrentX,relgizxy));
			if(GLGE.dotVec3(CurrentY,relgizxy) > -.01)
			oldzrot *= -1;
			
			
			var relgizxz = GLGE.subVec3(gizpos,oldintersectxz);
			relgizxz = GLGE.scaleVec3(relgizxz,1.0/GLGE.lengthVec3(relgizxz));
			oldyrot = -Math.acos(GLGE.dotVec3(CurrentX,relgizxz));
			if(GLGE.dotVec3(CurrentZ,relgizxz) > -.01)
			oldyrot *= -1;
			
			var relgizyz = GLGE.subVec3(gizpos,oldintersectyz);
			relgizyz = GLGE.scaleVec3(relgizyz,1.0/GLGE.lengthVec3(relgizyz));
			oldxrot = -Math.acos(GLGE.dotVec3(CurrentZ,relgizyz));
			if(GLGE.dotVec3(CurrentY,relgizyz) > -.01)
			oldxrot *= -1;
			
			
			
			
			if(document.AxisSelected == -1 && SelectMode == 'Pick')
			{
				this.MouseLeftDown = true;
				this.mouseDownScreenPoint = [e.clientX,e.clientY];
				this.selectionMarquee.css('left',this.mouseDownScreenPoint[0]);
				this.selectionMarquee.css('top',this.mouseDownScreenPoint[1]);
				this.selectionMarquee.css('width','0');
				this.selectionMarquee.css('height','0');
				this.selectionMarquee.show();
				this.selectionMarquee.css('z-index','100');
			}
			
			$('#StatusAxis').html('Axis: '+axis);
			for(var i =0; i < MoveGizmo.children.length;i++)
			{
				if(MoveGizmo.children[i].material)
				{
					var c = MoveGizmo.children[i].material.originalColor;
					MoveGizmo.children[i].material.color.setRGB(c.r,c.g,c.b);
					MoveGizmo.children[i].material.emissive.setRGB(c.r,c.g,c.b);
				}
			}
			if(axis >= 0)
			{
				if(MoveGizmo.children[axis].material)
				{
					MoveGizmo.children[axis].material.color.setRGB(1,1,1);
					MoveGizmo.children[axis].material.emissive.setRGB(1,1,1);
				}
			}
		}
	}.bind(this);
	//$('#vwf-root').mousewheel(function(event, delta, deltaX, deltaY) {
	var mousewheel = 	function(event, delta, deltaX, deltaY){
		//if(MoveGizmo)
		//updateGizmoSize();	
	}.bind(this);
	
	this.GetUniqueName = function(newname)
	{	
		if(!newname) newname = 'Object';
		newname = newname.replace(/[0-9]*$/g,"");
		var nodes = vwf.models[3].model.objects;
		var count = 1;
		for(var i in nodes)
		{
			var thisname = nodes[i].properties.DisplayName || '';
			thisname = thisname.replace(/[0-9]*$/g,"");
			if(thisname == newname)
				count++;
		}
		return newname+count;
	}
	var click=function(e)
	{
		
	}.bind(this);
	this.ThreeJSPick = function(campos,ray)
    {
       
       // ray[0] *=-1;
	//	ray[2] *=-1;
	//	ray[1] *=-1;
        var threeCam = this.findcamera();
        if(!this.ray) this.ray = new THREE.Ray();
        if(!this.projector) this.projector = new THREE.Projector();
        
        
        var pos = to3Vec(campos);
        this.ray.set(pos, to3Vec(ray));
		var caster = new THREE.Raycaster(pos, to3Vec(ray));
        var intersects = caster.intersectObjects(this.findscene().children, true);
        if (intersects.length) {
            var found =  intersects[0];
			var priority = -1;
			var dist = 0;
			for(var i =0; i < intersects.length; i++)
			{
				if(intersects[i].object.visible == true)
				{
				
					if(intersects[i].object.PickPriority === undefined)
						intersects[i].object.PickPriority = 0;
					if(intersects[i].object.PickPriority > priority)
					{
						found = intersects[i];
						priority = intersects[i].object.PickPriority;
					}
				
				}
			}
			
			return found;
        }
		
        return null;
    }
	this.ShowContextMenu = function(e)
	{
			e.preventDefault();
			e.stopPropagation();
			var ray = GetWorldPickRay(e);
			var campos = [findcamera().position.x,findcamera().position.y,findcamera().position.z];
			
			MoveGizmo.InvisibleToCPUPick = true;
			var pick = this.ThreeJSPick(campos,ray);
			MoveGizmo.InvisibleToCPUPick = false;
			
			var vwfnode;
			while(pick && pick.object && !pick.object.vwfID)
				pick.object = pick.object.parent;
			if(pick && pick.object)
				vwfnode = pick.object.vwfID;
			if(_Editor.isSelected(vwfnode))
			{
				$('#ContextMenuCopy').show();
				$('#ContextMenuDelete').show();
				$('#ContextMenuFocus').show();
				$('#ContextMenuDuplicate').show();
				$('#ContextMenuSelect').hide();
				$('#ContextMenuSelectNone').show();
			}
			else
			{
				$('#ContextMenuCopy').hide();
				$('#ContextMenuDelete').hide();
				$('#ContextMenuFocus').hide();
				$('#ContextMenuDuplicate').hide();
				$('#ContextMenuSelectNone').hide();
				if(vwfnode)
				{
					$('#ContextMenuSelect').show();
				}
			}
			var dispName;
			if(vwfnode)
				dispName = vwf.getProperty(vwfnode,'DisplayName');
			if(!dispName)
				dispName = vwfnode;
			$('#ContextMenuName').html(dispName || "{none selected}");
			$('#ContextMenuName').attr('VWFID',vwfnode);
			
			$('#ContextMenu').show();
			$('#ContextMenu').css('z-index','1000000');
			$('#ContextMenu').css('left',e.clientX + 'px');
			$('#ContextMenu').css('top',e.clientY + 'px');
			this.ContextShowEvent = e;
			$('#ContextMenuActions').empty();
			
			if(vwfnode)
			{
			var actions = vwf.getEvents(vwfnode);
			
			for(var i in actions)
			{
				if(actions[i].parameters.length == 1 && $.trim(actions[i].parameters[0]) == '')
				{
					$('#ContextMenuActions').append('<div id="Action'+i+'" class="ContextMenuAction">'+i+'</div>');
					
					$('#Action'+i).attr('EventName',i);
					$('#Action'+i).click(function(){
						$('#ContextMenu').hide();
						$('#ContextMenu').css('z-index','-1');
						$(".ddsmoothmenu").find('li').trigger('mouseleave');
						$('#index-vwf').focus();
						
						vwf_view.kernel.dispatchEvent(vwfnode,$(this).attr('EventName'));
					});
				}
			}
	}
	}
	this.mouseleave = function(e)
	{
		if(e.toElement != $('#ContextMenu')[0] && $(e.toElement).parent()[0] != $('#ContextMenu')[0] && !$(e.toElement).hasClass('glyph'))
		{	
			$('#ContextMenu').hide();
			$('#ContextMenu').css('z-index','-1');
		}
	}
	var mouseup = function(e){ 		
		
		
		if(e.button == 2 && !MouseMoved)
		{
			_Editor.ShowContextMenu(e);
			
			
			return false;
		}
		if(e.mouseleave)
		{
			return;
		}
		
		this.MouseLeftDown = false;
		this.selectionMarquee.hide();
		this.selectionMarquee.css('z-index','-1');
		
		this.mouseUpScreenPoint = [e.clientX,e.clientY];
		
		var w = this.mouseUpScreenPoint[0]-this.mouseDownScreenPoint[0];
		var h = this.mouseUpScreenPoint[1]-this.mouseDownScreenPoint[1];
		var picksize = Math.sqrt(w*w+h*h);
		
	
		if( document.AxisSelected == -1 && e.button == 0)
		{	
			
			if(SelectMode=='Pick')
			{
				if(picksize < 10)
				{
					if(vwf.views[0].lastPickId)
						SelectObject(vwf.getNode(vwf.views[0].lastPickId),this.PickMod);	
				}
				else
				{
					
						var top = this.mouseDownScreenPoint[1];
						var left = this.mouseDownScreenPoint[0]
						var bottom = this.mouseUpScreenPoint[1];
						var right = this.mouseUpScreenPoint[0];
						if(h < 0)
						{
							top = top + h;
							bottom = top + -h;
						}		
						if(w < 0)
						{
							left = left + w;
							right = left + -w;
						}	
		
					var TopLeftRay = GetWorldPickRay({clientX:left,clientY:top});
					var TopRightRay = GetWorldPickRay({clientX:right,clientY:top});
					var BottomLeftRay = GetWorldPickRay({clientX:left,clientY:bottom});
					var BottomRighttRay = GetWorldPickRay({clientX:right,clientY:bottom});
					var campos = [findcamera().position.x,findcamera().position.y,findcamera().position.z];
					
					var ntl = GLGE.addVec3(campos,TopLeftRay);
					var ntr = GLGE.addVec3(campos,TopRightRay);
					var nbl = GLGE.addVec3(campos,BottomLeftRay);
					var nbr = GLGE.addVec3(campos,BottomRighttRay);
					
					var ftl = GLGE.addVec3(campos,GLGE.scaleVec3(TopLeftRay,10000));
					var ftr = GLGE.addVec3(campos,GLGE.scaleVec3(TopRightRay,10000));
					var fbl = GLGE.addVec3(campos,GLGE.scaleVec3(BottomLeftRay,10000));
					var fbr = GLGE.addVec3(campos,GLGE.scaleVec3(BottomRighttRay,10000));
					
					var frustrum = new Frustrum(ntl,ntr,nbl,nbr,ftl,ftr,fbl,fbr);	
					
					var hits = this.FrustrumCast(frustrum);
					var vwfhits = [];
					for(var i = 0; i < hits.length; i++)
					{
						var vwfnode;
						while(hits[i] && hits[i].object && !hits[i].object.vwfID)
							hits[i].object = hits[i].object.parent;
						if(hits[i] && hits[i].object)
							vwfnode = hits[i].object.vwfID;
						if(vwfhits.indexOf(vwfnode) == -1)
							vwfhits.push(vwfnode);	
					}
					SelectObject(vwfhits,this.PickMod);
				}				
				e.stopPropagation();
			}
			if(SelectMode=='TempPick')
			{
				if(this.TempPickCallback)
					this.TempPickCallback(vwf.getNode(vwf.views[0].lastPickId));
				e.stopPropagation();	
			}
		}
		//else if(document.AxisSelected == -1)
		//	SelectObject(null);
		if(document.AxisSelected == 15)
		{
			
			SetCoordSystem(CoordSystem == WorldCoords? LocalCoords : WorldCoords);
			updateGizmoOrientation(true);
		}
		if(MoveGizmo)
		{
			for(var i =0; i < MoveGizmo.children.length;i++)
			{
				if(MoveGizmo.children[i].material)
				{
					var c = MoveGizmo.children[i].material.originalColor;
					MoveGizmo.children[i].material.color.setRGB(c.r,c.g,c.b);
					MoveGizmo.children[i].material.emissive.setRGB(c.r,c.g,c.b);
				}
			}
			document.AxisSelected = -1;
			$('#StatusAxis').html('Axis: -1');
			updateGizmoOrientation(true);
		}
		
		
	}.bind(this);
	this.GetAllLeafMeshes = function(threeObject,list)
	{
		if(threeObject instanceof THREE.Mesh)
		{
			list.push(threeObject);
		}
		if(threeObject.children)
        {
            for(var i=0; i < threeObject.children.length; i++)
			{
                this.GetAllLeafMeshes(threeObject.children[i],list);
            }               
			}
	}
	this.FrustrumCast = function(frustrum)
			{
		
		var scene = this.findscene();
		var meshes = [];
		var hits = [];
		this.GetAllLeafMeshes(scene,meshes);
		
		for(var i =0; i < meshes.length; i++)
		{
			var mat = GLGE.inverseMat4(GLGE.transposeMat4(meshes[i].matrixWorld.elements));
			var tfrustrum = frustrum.transformBy(mat);
			if(tfrustrum.intersectsObject(meshes[i].geometry))
				hits.push({object:meshes[i]});
			}
		return hits;
	}
	var DeleteSelection = function()
	{
		for(var s =0; s<SelectedVWFNodes.length; s++)
		{
			// if(document.PlayerNumber == null)
			// {
				// _Notifier.notify('You must log in to participate');
				// return;
			// }
			// var owner = vwf.getProperty(SelectedVWFNodes[s].id,'owner');
			// if(!_Editor.isOwner(SelectedVWFNodes[s].id,document.PlayerNumber))
			// {
				// _Notifier.notify('You do not have permission to delete this object');
				// return;
			// }
			if(SelectedVWFNodes[s])
			{
				vwf_view.kernel.deleteNode(SelectedVWFNodes[s].id);
				$('#StatusSelectedID').html('No Selection');
				$('#StatusPickMode').html('Pick: None');
				if(_PrimitiveEditor.isOpen())
					_PrimitiveEditor.hide();
				if(_MaterialEditor.isOpen())
					_MaterialEditor.hide();
				if(_ScriptEditor.isOpen())
					_ScriptEditor.hide();
			}
		}
		SelectObject(null);
		
	}.bind(this);
	//	$('#vwf-root').keyup(function(e){
	var keyup = function(e)
	{
		if(e.keyCode == 17)
		{
			this.PickMod = NewSelect;
			$('#index-vwf').css('cursor','default');
		}
		if(e.keyCode == 18)
		{
			this.PickMod = NewSelect;
			$('#index-vwf').css('cursor','default');
		}
	}.bind(this);
	var keydown = function(e)
	{
		//console.log(e);

		if(e.keyCode == 17)
		{
			this.PickMod = Add;
			$('#index-vwf').css('cursor','all-scroll');
		}
		if(e.keyCode == 18)
		{
			this.PickMod = Subtract;
			$('#index-vwf').css('cursor','not-allowed');
		}

		if(e.keyCode == 87)
		{
			SetGizmoMode(Move);
		}
		if(e.keyCode == 69)
		{
			SetGizmoMode(Rotate);
		}
		if(e.keyCode == 82)
		{
			SetGizmoMode(Scale);
		}
		if(e.keyCode == 84)
		{
			SetGizmoMode(Multi);
		}
		if(e.keyCode == 81)
		{
			SetSelectMode('Pick');
		}
		if(e.keyCode == 46)
		{
			DeleteSelection();
		}
		if(e.keyCode == 68 && e.shiftKey)
		{
			Duplicate();
		}
		if(e.keyCode == 67 && e.ctrlKey)
		{
			Copy();
		}
		if(e.keyCode == 86 && e.ctrlKey)
		{
			Paste();
		}
	}.bind(this);
	this.SelectParent = function()
	{
		if(_Editor.GetSelectedVWFNode())
			_Editor.SelectObject(vwf.parent(_Editor.GetSelectedVWFNode().id));
	}
	var intersectLinePlane = function(ray,raypoint,planepoint,planenormal)
	{
		var n = GLGE.dotVec3(GLGE.subVec3(planepoint,raypoint),planenormal);
		var d = GLGE.dotVec3(ray,planenormal);
		if(d == 0)
		return null;
		
		var dist = n/d;
		
		return dist;
		//var alongray = GLGE.scaleVec3(ray,dist);
		//var intersect = GLGE.addVec3(alongray,	raypoint);
		//return intersect;
	}.bind(this);
	
	var intersectLinePlaneTEST = function(ray,raypoint,planepoint,planenormal)
	{
		var tmatrix = [CurrentX[0],CurrentY[0],CurrentZ[0],0,
					   CurrentX[1],CurrentY[1],CurrentZ[1],0,
					   CurrentX[2],CurrentY[2],CurrentZ[2],0,
					   0,0,0,1];
		tmatrix = GLGE.transposeMat4(tmatrix);			   
		var tplanepoint = GLGE.mulMat4Vec3(tmatrix ,planepoint);
		var tplanenormal = GLGE.mulMat4Vec3(tmatrix ,planenormal);
		var traypoint = GLGE.mulMat4Vec3(tmatrix ,raypoint);
		var tray = GLGE.mulMat4Vec3(tmatrix ,ray);
		
		var n = GLGE.dotVec3(GLGE.subVec3(tplanepoint,traypoint),tplanenormal);
		var d = GLGE.dotVec3(tray,tplanenormal);
		if(d == 0)
		return null;
		
		var dist = n/d;
		
		var tpoint = GLGE.addVec3(raypoint,GLGE.scaleVec3(tray,dist));
		return tpoint;
		//var alongray = GLGE.scaleVec3(ray,dist);
		//var intersect = GLGE.addVec3(alongray,	raypoint);
		//return intersect;
	}.bind(this);
	
	var GetCameraCenterRay = function(e)
	{
		screenmousepos = [0,0,0,1];
		var worldmousepos = GLGE.mulMat4Vec4(GLGE.inverseMat4(_Editor.getViewProjection()),screenmousepos);
		worldmousepos[0] /= worldmousepos[3];
		worldmousepos[1] /= worldmousepos[3];
		worldmousepos[2] /= worldmousepos[3];
		
		
		var campos = [findcamera().position.x,findcamera().position.y,findcamera().position.z];
		var ray = GLGE.subVec3(worldmousepos,campos);
		var dist = GLGE.lengthVec3(ray);
		ray = GLGE.scaleVec3(ray,1.0/GLGE.lengthVec3(ray));
		return ray;
	}.bind(this);
	var GetWorldPickRay = function(e)
	{
		
		
		var OldX = e.clientX - $('#index-vwf').offset().left;
		var OldY = e.clientY - $('#index-vwf').offset().top;
		
		var screenmousepos = [OldX/document.getElementById('index-vwf').clientWidth,OldY/document.getElementById('index-vwf').clientHeight,0,1];
		screenmousepos[0] *= 2;
		screenmousepos[1] *= 2;
		screenmousepos[0] -= 1;
		screenmousepos[1] -= 1;
		screenmousepos[1] *= -1;
		var worldmousepos = GLGE.mulMat4Vec4(GLGE.inverseMat4(_Editor.getViewProjection()),screenmousepos);
		worldmousepos[0] /= worldmousepos[3];
		worldmousepos[1] /= worldmousepos[3];
		worldmousepos[2] /= worldmousepos[3];
		
		
		var campos = [findcamera().position.x,findcamera().position.y,findcamera().position.z];
		var ray = GLGE.subVec3(worldmousepos,campos);
		var dist = GLGE.lengthVec3(ray);
		ray = GLGE.scaleVec3(ray,1.0/GLGE.lengthVec3(ray));
		return ray;
	}.bind(this);
	//quick function to initialize a blank matrix array
	var Matrix = function()
	{
		var mat = [];
		for(var i=0; i < 16; i++)
		{
			mat.push(0);
		}
		return mat;
	}.bind(this);
	//quick function to initialize a blank vector array
	var Vec3 = function()
	{
		var vec = [];
		for(var i=0; i < 3; i++)
		{
			vec.push(0);
		}
		return vec;
	}.bind(this);
	var Quat = function()
	{
		var quat = [];
		for(var i=0; i < 4; i++)
		{
			quat.push(0);
		}
		return quat;
	}.bind(this);
	var SnapTo = function(value,nearist)
	{
		value = value/nearist;
		if(value > 0)
		value = Math.floor(value);
		else
		value = Math.ceil(value);
		value *= nearist;
		return value;
	}.bind(this);
	//input rotation matrix, axis, angle in radians, return rotation matrix
	var RotateAroundAxis = function(RotationMatrix, Axis, Radians,rotationMatrix)
	{
		
		if(CoordSystem == WorldCoords)
		{	
		
			var childmat = GetRotationMatrix(toGMat(_Editor.findviewnode(_Editor.GetSelectedVWFNode().id).matrixWorld));
			var parentmat = GetRotationMatrix(toGMat(_Editor.findviewnode(_Editor.GetSelectedVWFNode().id).parent.matrixWorld));
			Axis = GLGE.mulMat4Vec3(GLGE.inverseMat4(parentmat),Axis);
			
		}
		if(CoordSystem == LocalCoords)
		{	
			var childmat = GetRotationMatrix(toGMat(_Editor.findviewnode(_Editor.GetSelectedVWFNode().id).matrixWorld));
			Axis = GLGE.mulMat4Vec3(GLGE.inverseMat4(childmat),Axis);
		}
		//Get a quaternion for the input matrix
		var OriginalQuat = goog.vec.Quaternion.fromRotationMatrix4( RotationMatrix,Quat());
		var RotationQuat = goog.vec.Quaternion.fromAngleAxis(Radians, Axis, Quat());
		var RotatedQuat = goog.vec.Quaternion.concat(RotationQuat,OriginalQuat, Quat());
		var NewMatrix = goog.vec.Quaternion.toRotationMatrix4(RotatedQuat, Matrix());
		return NewMatrix;
		
		
	}.bind(this);
	var TransformOffset =function(gizoffset,id)
	{
			
			//_Editor.findviewnode(id).parent.updateMatrix();
			var parentmat = toGMat(_Editor.findviewnode(id).parent.matrixWorld);
			parentmat = GLGE.inverseMat4(parentmat);
			parentmat[3] = 0;
			parentmat[7] = 0;
			parentmat[11] = 0;
		//return gizoffset;
		return GLGE.mulMat4Vec3(parentmat,gizoffset);
	}.bind(this)
	var GetRotationTransform = function(Axis, Radians)
	{
			
		
		if(CoordSystem == WorldCoords)
		{	
		
				//_Editor.findviewnode(_Editor.GetSelectedVWFNode().id).parent.updateMatrix();
				var parentmat = GetRotationMatrix(toGMat(_Editor.findviewnode(_Editor.GetSelectedVWFNode().id).parent.matrixWorld));
			Axis = GLGE.mulMat4Vec3(parentmat,Axis);
			
		}
		if(CoordSystem == LocalCoords)
		{	
				//_Editor.findviewnode(_Editor.GetSelectedVWFNode().id).updateMatrix();
				var childmat = GetRotationMatrix(toGMat(_Editor.findviewnode(_Editor.GetSelectedVWFNode().id).matrix));
			Axis = GLGE.mulMat4Vec3(GLGE.inverseMat4(childmat),Axis);
		}
		//Get a quaternion for the input matrix
		var RotationQuat = goog.vec.Quaternion.fromAngleAxis(Radians, Axis, Quat());
		
		var NewMatrix = goog.vec.Quaternion.toRotationMatrix4(RotationQuat, Matrix());
		return NewMatrix;
			
		
	}.bind(this);
	//takes a normal 4x4 rotation matrix and returns a VWF style angle axis
	//in the format {angle:0,axis:[0,1,0]} with the angle in degrees
	var RotationToVWFAngleAxis = function(RotationMatrix)
	{
		
		var OriginalQuat = goog.vec.Quaternion.fromRotationMatrix4( RotationMatrix,Quat() );
		//convert to angle axis with angle in Radians
		var NewAxis = [0,0,0];
		var NewAngle = goog.vec.Quaternion.toAngleAxis(OriginalQuat,NewAxis);
		return {angle: 57.2957795 * NewAngle,axis:NewAxis};
	}.bind(this);
	var isMove = function(axis)
	{
		if(axis == 0 || axis == 1 || axis == 2 || axis == 12 || axis == 13 || axis == 14)
		return true;
		return false;	
	}.bind(this);
	var isRotate = function(axis)
	{
		if(axis == 3 || axis == 4 || axis == 5 || axis == 16 || axis == 17 || axis == 18)
		return true;
		return false;	
	}.bind(this);
	var SetLocation = function(object,vector)
	{
		object.position.x = vector[0];
		object.position.y = vector[1];
		object.position.z = vector[2];
	}.bind(this);
	var MoveTransformGizmo = function(axis,amount)
	{
		return GLGE.scaleVec3(axis,amount);
		var pos = GetLocation(MoveGizmo);
		pos = GLGE.addVec3(pos,GLGE.scaleVec3(axis,amount));
		SetLocation(MoveGizmo,pos);
	
	}
	
	var GetLocation = function(object)
	{
		var vector =[0,0,0];
		vector[0]=object.position.x;
		vector[1]=object.position.y;
		vector[2]=object.position.z;
		return vector;
	}.bind(this);
	var isScale = function(axis)
	{
		if(axis == 6 || axis == 7 || axis == 8 || axis == 9 || axis == 10 || axis == 11 ||(axis >=19 && axis <=25) )
		return true;
		return false;	
	}.bind(this);
	//input rotation matrix, axis, angle in radians, return rotation matrix
	var RotateVecAroundAxis = function(Vector, Axis, Radians)
	{
		
		//Get a quaternion for the input matrix
		
		var RotationQuat = goog.vec.Quaternion.fromAngleAxis(Radians, Axis, Quat());
		var NewMatrix = goog.vec.Quaternion.toRotationMatrix4(RotationQuat, Matrix());
		return GLGE.mulMat4Vec3(NewMatrix,Vector);
		
		
	}.bind(this);
	//$('#vwf-root').mousemove(function(e){
	var displayVec = function(e)
	{
		for(var i =0; i<e.length;i++)
		{
		e[i] *= 100;
		e[i] = Math.floor(e[i]);
		e[i] /= 100;
		}
		return JSON.stringify(e);
	}
	function tI(x,y)
	{
		x = x-1;
		y=y-1;
		return x*4+y;
	}
	function GetRotationMatrix(mat)
	{
		
		var rmat = Matrix();
		for(var i = 0; i < mat.length; i++)
		rmat[i] = mat[i];
		
		
		
		rmat[3] = 0;
		rmat[7] = 0;
		rmat[11] = 0;
		rmat = GLGE.transposeMat4(rmat)
		
		var sx = Math.sqrt(mat[tI(1,1)]*mat[tI(1,1)]     + mat[tI(1,2)]*mat[tI(1,2)]    +       mat[tI(1,3)]*mat[tI(1,3)] );
		var sy = Math.sqrt(mat[tI(2,1)]*mat[tI(2,1)]     + mat[tI(2,2)]*mat[tI(2,2)]    +       mat[tI(2,3)]*mat[tI(2,3)] );
		var sz = Math.sqrt(mat[tI(3,1)]*mat[tI(3,1)]     + mat[tI(3,2)]*mat[tI(3,2)]    +       mat[tI(3,3)]*mat[tI(3,3)] );

		rmat[tI(1,1)] = mat[tI(1,1)]/sx; rmat[tI(1,2)] = mat[tI(1,2)]/sx; rmat[tI(1,3)] = mat[tI(1,3)]/sx;	
		rmat[tI(2,1)] = mat[tI(2,1)]/sy; rmat[tI(2,2)] = mat[tI(2,2)]/sy; rmat[tI(2,3)] = mat[tI(2,3)]/sy;
		rmat[tI(3,1)] = mat[tI(3,1)]/sz; rmat[tI(3,2)] = mat[tI(3,2)]/sz; rmat[tI(3,3)] = mat[tI(3,3)]/sz;			
	
		
		return GLGE.transposeMat4(rmat);
	}
	this.waitingForSet = [];
	var mousemove = function(e)
	{
		if(this.waitingForSet.length > 0) return; 
		MouseMoved = true;
		
		if(!MoveGizmo || MoveGizmo==null)
		{
			return;
		}
		var tpos = new THREE.Vector3();
		tpos.getPositionFromMatrix(MoveGizmo.parent.matrixWorld);
		var originalGizmoPos = [tpos.x,tpos.y,tpos.z];
		//updateGizmoSize();
		updateGizmoOrientation(false);
		
		if(this.MouseLeftDown)
		{
			this.mouseLastScreenPoint = [e.clientX,e.clientY];
			var w = this.mouseLastScreenPoint[0] - this.mouseDownScreenPoint[0];
			var h = this.mouseLastScreenPoint[1] - this.mouseDownScreenPoint[1];
			if(w > 0)
				this.selectionMarquee.css('width',w);
			else
			  {
				this.selectionMarquee.css('width',-w);
				this.selectionMarquee.css('left',this.mouseLastScreenPoint[0]);
			  }			  
			if(h > 0)  
				this.selectionMarquee.css('height',h);
			else
			{
				this.selectionMarquee.css('height',-h);
				this.selectionMarquee.css('top',this.mouseLastScreenPoint[1]);
			}
		}
		
		if(document.AxisSelected != -1)
		{
			var t = new	THREE.Vector3();
			t.getPositionFromMatrix(MoveGizmo.parent.matrixWorld);
			var gizpos = [t.x,t.y,t.z];
			$('#StatusGizmoLocation').html(displayVec(gizpos));	
			var campos = [findcamera().position.x,findcamera().position.y,findcamera().position.z];
			$('#StatusCameraLocation').html(displayVec(campos));	
			var ray = GetWorldPickRay(e);

			
			var IntersectPlaneNormalX = CurrentX;
			var IntersectPlaneNormalY = CurrentY;
			var IntersectPlaneNormalZ = CurrentZ;
			
			var rotmat2 = GetRotationMatrix(toGMat(findviewnode(SelectedVWFNodes[0].id).matrix));//GLGE.angleAxis(aa[3] * 0.0174532925,[aa[0],aa[1],aa[2]]);
			var invRot2 = GLGE.inverseMat4(rotmat2);
			
			var MoveAxisX = CurrentX;
			var MoveAxisY = CurrentY;
			var MoveAxisZ = CurrentZ;
			
			
			var dxy = intersectLinePlaneTEST(ray,campos,gizpos,CurrentZ);
			var newintersectxy = dxy;//GLGE.addVec3(campos,GLGE.scaleVec3(ray,dxy));
			
			var dxz = intersectLinePlaneTEST(ray,campos,gizpos,CurrentY);
			var newintersectxz = dxz;//GLGE.addVec3(campos,GLGE.scaleVec3(ray,dxz));
			
			var dyz = intersectLinePlaneTEST(ray,campos,gizpos,CurrentX);
			var newintersectyz = dyz;//GLGE.addVec3(campos,GLGE.scaleVec3(ray,dyz));
			
			if(document.AxisSelected == 3 || document.AxisSelected == 16 ||document.AxisSelected == 4 || document.AxisSelected == 17 || document.AxisSelected == 5 || document.AxisSelected == 18)
			{
				dxy = intersectLinePlane(ray,campos,gizpos,CurrentZ);
				newintersectxy = GLGE.addVec3(campos,GLGE.scaleVec3(ray,dxy));
				
				dxz = intersectLinePlane(ray,campos,gizpos,CurrentY);
				newintersectxz = GLGE.addVec3(campos,GLGE.scaleVec3(ray,dxz));
				
				dyz = intersectLinePlane(ray,campos,gizpos,CurrentX);
				newintersectyz = GLGE.addVec3(campos,GLGE.scaleVec3(ray,dyz));
			}
			
			
			
			
			var relintersectxy = GLGE.subVec3(newintersectxy,oldintersectxy);
			var relintersectxz = GLGE.subVec3(newintersectxz,oldintersectxz);
			var relintersectyz = GLGE.subVec3(newintersectyz,oldintersectyz);
			
			
			
			var relgizxy = GLGE.subVec3(gizpos,newintersectxy);
			var newrotz;
			relgizxy = GLGE.scaleVec3(relgizxy,1.0/GLGE.lengthVec3(relgizxy));
			newrotz = Math.acos(GLGE.dotVec3(CurrentX,relgizxy));
			
			if(GLGE.dotVec3(CurrentY,relgizxy) > -.01)
			newrotz *= -1;
			
			
			var relgizxz = GLGE.subVec3(gizpos,newintersectxz);
			var newroty;
			relgizxz = GLGE.scaleVec3(relgizxz,1.0/GLGE.lengthVec3(relgizxz));
			newroty = -Math.acos(GLGE.dotVec3(CurrentX,relgizxz));
			if(GLGE.dotVec3(CurrentZ,relgizxz) > -.01)
			newroty *= -1;
			
			var relgizyz = GLGE.subVec3(gizpos,newintersectyz);
			var newrotx;
			relgizyz = GLGE.scaleVec3(relgizyz,1.0/GLGE.lengthVec3(relgizyz));
			newrotx = -Math.acos(GLGE.dotVec3(CurrentZ,relgizyz));
			if(GLGE.dotVec3(CurrentY,relgizyz) > -.01)
			newrotx *= -1;
			
			var relrotz = oldzrot - newrotz;
			var relroty = oldyrot - newroty;
			var relrotx = oldxrot - newrotx;
			
			if(Math.abs(relrotz) < 6)
			relrotz *= 1.33;
			if(Math.abs(relroty) < 6)
			relroty *= 1.33;
			if(Math.abs(relrotx) < 6)
			relrotx *= 1.33;
			
			relrotz = SnapTo(relrotz,RotateSnap);
			relroty = SnapTo(relroty,RotateSnap);
			relrotx = SnapTo(relrotx,RotateSnap);
			
			var SnapType = null;
			if(isMove(document.AxisSelected )) SnapType = MoveSnap;
			if(isScale(document.AxisSelected )) SnapType = ScaleSnap;
			if(SnapType != null)
			{
				relintersectxy[0] = SnapTo(relintersectxy[0],SnapType);
				relintersectxy[1] = SnapTo(relintersectxy[1],SnapType);
				relintersectxy[2] = SnapTo(relintersectxy[2],SnapType);
				
				relintersectxz[0] = SnapTo(relintersectxz[0],SnapType);
				relintersectxz[1] = SnapTo(relintersectxz[1],SnapType);
				relintersectxz[2] = SnapTo(relintersectxz[2],SnapType);
				
				relintersectyz[0] = SnapTo(relintersectyz[0],SnapType);
				relintersectyz[1] = SnapTo(relintersectyz[1],SnapType);
				relintersectyz[2] = SnapTo(relintersectyz[2],SnapType);			
			}
			
			if(relrotz != 0)
			oldzrot = newrotz;
			if(relroty != 0)
			oldyrot = newroty;
			if(relrotx != 0)
			oldxrot = newrotx;
			
		  
			   
				
			if(GLGE.lengthVec3(relintersectxy) != 0)
			oldintersectxy = GLGE.addVec3(oldintersectxy , relintersectxy);
			if(GLGE.lengthVec3(relintersectxz) != 0)
			oldintersectxz = GLGE.addVec3(oldintersectxz , relintersectxz);;
			if(GLGE.lengthVec3(relintersectyz) != 0)
			oldintersectyz = GLGE.addVec3(oldintersectyz , relintersectyz);;
			
			//save some time and bail is nothing is changing
			if(GLGE.lengthVec3(relintersectxy) == 0 && GLGE.lengthVec3(relintersectxz) == 0 && GLGE.lengthVec3(relintersectyz) == 0)
			return;
		   
			
			
			  var ScaleXY = [0,0,0];
				ScaleXY[0] = relintersectxy[0] /1;
				ScaleXY[1] = relintersectxy[1] /1;
				ScaleXY[2] = relintersectxy[2] /1;
			  
				var ScaleXZ = [0,0,0];
				ScaleXZ[0] = relintersectxz[0] /1;
				ScaleXZ[1] = relintersectxz[1] /1;
				ScaleXZ[2] = relintersectxz[2] /1;
				var ScaleYZ = [0,0,0];
				ScaleYZ[0] = relintersectyz[0] /1;
				ScaleYZ[1] = relintersectyz[1] /1;
				ScaleYZ[2] = relintersectyz[2] /1;
				
			var scalemult = .5;
			var wasMoved = false;
			var wasRotated = false;
			var wasScaled = false;
			
			
					var PickDist = 10000/vwf.views[0].lastPick.distance;
					//var tempscale = vwf.getProperty(SelectedVWFNode.id,'scale');
					//var s = findviewnode(SelectedVWFNode.id).getScale();
			var gizposoffset = null;		
					if(document.AxisSelected == 0)
					{
						wasMoved = true;
						if(Math.abs(GLGE.dotVec3(ray,CurrentZ)) > .8)
						gizposoffset = MoveTransformGizmo(CurrentX,relintersectxy[0]);
						else
						gizposoffset = MoveTransformGizmo(CurrentX,relintersectxz[0]);
					}
					if(document.AxisSelected == 1)
					{
						wasMoved = true;
						if(Math.abs(GLGE.dotVec3(ray,CurrentZ)) > .8)
						gizposoffset = MoveTransformGizmo(CurrentY,relintersectxy[1]);
						else
						gizposoffset = MoveTransformGizmo(CurrentY,relintersectyz[1]);
					}
					if(document.AxisSelected == 2)
					{
						wasMoved = true;
						if(Math.abs(GLGE.dotVec3(ray,CurrentX)) > .8)
						gizposoffset = MoveTransformGizmo(MoveAxisZ,relintersectyz[2]);
						else	
						gizposoffset = MoveTransformGizmo(MoveAxisZ,relintersectxz[2]);
					}
					if(document.AxisSelected == 12)
					{
						wasMoved = true;
						gizposoffset = MoveTransformGizmo(MoveAxisX,relintersectxy[0]);
						gizposoffset = GLGE.addVec3(gizposoffset,MoveTransformGizmo(MoveAxisY,relintersectxy[1]));
					}
					if(document.AxisSelected == 13)
					{
						wasMoved = true;
						gizposoffset = MoveTransformGizmo(MoveAxisX,relintersectxz[0]);
						gizposoffset = GLGE.addVec3(gizposoffset,MoveTransformGizmo(MoveAxisZ,relintersectxz[2]));
					}
					if(document.AxisSelected == 14)
					{
						wasMoved = true;
						gizposoffset = MoveTransformGizmo(MoveAxisY,relintersectyz[1]);
						gizposoffset = GLGE.addVec3(gizposoffset,MoveTransformGizmo(MoveAxisZ,relintersectyz[2]));
					}
					
					
			for(var s = 0; s < SelectedVWFNodes.length;s++)
			{
				if(SelectedVWFNodes[s])
				{	
				
					var tempscale =  [lastscale[s][0],lastscale[s][1],lastscale[s][2]];//[s.x,s.y,s.z];
					if(document.AxisSelected == 6 || document.AxisSelected == 20  )
					{
						wasScaled = true;
						tempscale[0] += scalemult * ScaleXY[0];	
					}
					if(document.AxisSelected == 7 || document.AxisSelected == 21)
					{
						 wasScaled = true;
						tempscale[1] += scalemult * ScaleXY[1];	
					}
					if(document.AxisSelected == 8 || document.AxisSelected == 22)
					{
						 wasScaled = true;
						tempscale[2] += scalemult * ScaleXZ[2];
					}
					if(document.AxisSelected == 23  )
					{
						 wasScaled = true;
						tempscale[0] += -scalemult * ScaleXY[0];	
					}
					if(document.AxisSelected == 24)
					{
						 wasScaled = true;
						tempscale[1] += -scalemult * ScaleXY[1];	
					}
					if(document.AxisSelected == 25)
					{
						 wasScaled = true;
						tempscale[2] += -scalemult * ScaleXZ[2];			
					}
					if(document.AxisSelected == 19)// || document.AxisSelected == 10 || document.AxisSelected == 11)
					{
						 wasScaled = true;
						tempscale[2] += scalemult * ScaleXY[0];
						tempscale[1] += scalemult * ScaleXY[0];
						tempscale[0] += scalemult * ScaleXY[0];
					}
					if(document.AxisSelected == 9)// || document.AxisSelected == 10 || document.AxisSelected == 11)
					{
						wasScaled = true;
						tempscale[2] += scalemult * ScaleXY[0];
						tempscale[1] += scalemult * ScaleXY[0];
						tempscale[0] += scalemult * ScaleXY[0];
					}
					if(document.AxisSelected == 10)// || document.AxisSelected == 10 || document.AxisSelected == 11)
					{
						wasScaled = true;
						tempscale[2] += scalemult * ScaleYZ[1];
						tempscale[1] += scalemult * ScaleYZ[1];
						tempscale[0] += scalemult * ScaleYZ[1];
					}
					if(document.AxisSelected == 11)// || document.AxisSelected == 10 || document.AxisSelected == 11)
					{
						wasScaled = true;
						tempscale[2] += scalemult * ScaleXZ[2];
						tempscale[1] += scalemult * ScaleXZ[2];
						tempscale[0] += scalemult * ScaleXZ[2];
					}
				    var rotationTransform;
					if(document.AxisSelected == 3 || document.AxisSelected == 16)
					{
						wasRotated = true;
						
						rotationTransform = GetRotationTransform(WorldX,relrotx);
					}
					if(document.AxisSelected == 4 || document.AxisSelected == 17)
					{
						wasRotated = true;
						
						rotationTransform = GetRotationTransform(WorldY,relroty);						
					}
					if(document.AxisSelected == 5 || document.AxisSelected == 18)
					{
						wasRotated = true;
						
						rotationTransform = GetRotationTransform(WorldZ,relrotz);
					}
					
					if(wasMoved)
					{
						
						var gizoffset = GLGE.subVec3([MoveGizmo.position.x,MoveGizmo.position.y,MoveGizmo.position.z],originalGizmoPos);
						gizoffset = TransformOffset(gizposoffset,SelectedVWFNodes[s].id); //TransformOffset(gizoffset,SelectedVWFNodes[s].id);
						
						
						
						var transform = vwf.getProperty(SelectedVWFNodes[s].id,'transform');
						transform[12] += gizoffset[0];
						transform[13] += gizoffset[1];
						transform[14] += gizoffset[2];
						
						lastpos[s] = [transform[12],transform[13],transform[14]];
						
						var success = this.setProperty(SelectedVWFNodes[s].id,'transform',transform);
						if(success) this.waitingForSet.push(SelectedVWFNodes[s].id);
						if(!success) SetLocation(MoveGizmo,originalGizmoPos);
					}
					
					if(wasScaled && tempscale[0] > 0 && tempscale[1] > 0 && tempscale[2] > 0)
					{
						
						var relScale = GLGE.subVec3(tempscale,lastscale[s]);
						
						var success = this.setProperty(SelectedVWFNodes[s].id,'scale',[tempscale[0],tempscale[1],tempscale[2]]);
						
						if(SelectedVWFNodes.length > 1)
						{
							
							var gizoffset = GLGE.subVec3(lastpos[s],originalGizmoPos);
							
							gizoffset[0] /= lastscale[s][0];
							gizoffset[1] /= lastscale[s][1];
							gizoffset[2] /= lastscale[s][2];
							
							gizoffset[0] *= tempscale[0];
							gizoffset[1] *= tempscale[1];
							gizoffset[2] *= tempscale[2];
							
							var newloc = GLGE.addVec3(originalGizmoPos,gizoffset);
							lastpos[s] = newloc;
							this.waitingForSet.push(SelectedVWFNodes[s].id);
							var success = this.setProperty(SelectedVWFNodes[s].id,'translation',newloc);
							if(success) this.waitingForSet.push(SelectedVWFNodes[s].id);							
						}
						lastscale[s] = tempscale;
						
					}
					if(wasRotated)
					{		
						
						
						var transform = vwf.getProperty(SelectedVWFNodes[s].id,'transform');
						
						var x = transform[12];
						var y = transform[13];
						var z = transform[14];
						
						var scale = vwf.getProperty(SelectedVWFNodes[s].id,'scale');
						
						transform[12] = 0;
						transform[13] = 0;
						transform[14] = 0;
						
						
						
						transform = GLGE.mulMat4(transform,rotationTransform);
						
						
						
						transform[12] = x;
						transform[13] = y;
						transform[14] = z;
						
						lastpos[s] = [x,y,z];
						var success = this.setProperty(SelectedVWFNodes[s].id,'transform',transform);
						if(success) this.waitingForSet.push(SelectedVWFNodes[s].id);
						if(SelectedVWFNodes.length > 1)
						{
							
							var parentmat = toGMat(_Editor.findviewnode(SelectedVWFNodes[s].id).parent.matrixWorld);
							var parentmatinv = GLGE.inverseMat4(parentmat);
							
							var parentgizloc = GLGE.mulMat4Vec3(parentmatinv,originalGizmoPos);
							var gizoffset = GLGE.subVec3(lastpos[s],parentgizloc);
							var rotmat = GLGE.inverseMat4(rotationTransform);
							gizoffset = GLGE.mulMat4Vec3(rotmat,gizoffset);
							
							
							var newloc = GLGE.addVec3(parentgizloc,gizoffset);
							lastpos[s] = newloc;
							var success = this.setProperty(SelectedVWFNodes[s].id,'translation',newloc);	
							console.log(newloc);
							if(success) this.waitingForSet.push(SelectedVWFNodes[s].id);
						}
					}
					//triggerSelectionTransformed(SelectedVWFNode);
					_Editor.updateGizmoOrientation(false);
					
				}
				
				
			}
			//if(wasScaled || wasRotated|| wasMoved && _Editor.getSelectionCount() > 1) _Editor.updateBounds();
		}
		else
		{
			//console.log(vwf.views[0].lastPick.object.uid);
			var axis = -1;
			
			for(var i =0; i < MoveGizmo.children.length;i++)
			{
				if(vwf.views[0].lastPick && vwf.views[0].lastPick.object && vwf.views[0].lastPick.object == MoveGizmo.children[i])
				axis = i;
			}			
			
			for(var i = 0; i < MoveGizmo.children.length; i++)
			{
				if(i!=document.AxisSelected)
				if(MoveGizmo.children[i].material)
				{
				var c = MoveGizmo.children[i].material.originalColor;
				MoveGizmo.children[i].material.color.setRGB(c.r,c.g,c.b);
				MoveGizmo.children[i].material.emissive.setRGB(c.r,c.g,c.b);
				}
			}
			
			if(axis >= 0)
			if(MoveGizmo.children[axis].material)
			{
				MoveGizmo.children[axis].material.color.setRGB(1,1,1);
				MoveGizmo.children[axis].material.emissive.setRGB(1,1,1);
			}
		}
		
		
	}.bind(this);
	this.isOwner = function(id,player)
	{
		var owner = vwf.getProperty(id,'owner');
		if(typeof owner === 'string' && owner==player)
		{
			return true;
		}
		if(typeof owner === 'object' && owner.indexOf && owner.indexOf(player) != -1)
		{
			return true;
		}
		return false;
	}
	this.setProperty = function(id,prop,val)
	{
		// if(document.PlayerNumber == null)
		// {
			// _Notifier.notify('You must log in to participate');
			// return false;
		// }
		
		// if(!_Editor.isOwner(id,document.PlayerNumber))
		// {
			// _Notifier.notify('You do not permission to edit this object.');
			// return false;
		// }
		vwf_view.kernel.setProperty(id,prop,val)
		return true;
	}
	this.GetInsertPoint = function()
	{
			var campos = [findcamera().position.x,findcamera().position.y,findcamera().position.z];
			var ray = _Editor.GetCameraCenterRay();
			var pick = this.ThreeJSPick(campos,ray);
			var dxy = pick.distance;
			var newintersectxy = GLGE.addVec3(campos,GLGE.scaleVec3(ray,dxy));
			newintersectxy[2] += .01;
			var dxy2 = _Editor.intersectLinePlane(ray,campos,[0,0,0],[0,0,1]);
			var newintersectxy2 = GLGE.addVec3(campos,GLGE.scaleVec3(ray,dxy2));
			newintersectxy2[2] += .01;
			return newintersectxy[2] > newintersectxy2[2]?newintersectxy:newintersectxy2;
	}
	this.createChild = function(parent,name,proto,uri,callback)
	{
		//if(document.PlayerNumber == null)
		//{
		//	_Notifier.notify('You must log in to participate');
		//	return;
		//}
		
		vwf_view.kernel.createChild(parent,name,proto,uri,callback);
	}
	this.createLight = function(type,pos,owner)
	{
		
				var proto  = { 
                    extends: 'SandboxLight.vwf',
					properties:{
					  rotation: [ 1, 0, 0, 0 ],
					  translation: pos,
					  owner:owner,
					  type:'Light',
					  lightType:type,
					  DisplayName: _Editor.GetUniqueName('Light')
					  }
                    };
		this.createChild('index-vwf',GUID(),proto,null,null); 
	}
	this.createParticleSystem = function(type,pos,owner)
	{
	
				var proto  = { 
                    extends: 'SandboxParticleSystem.vwf',
					properties:{
					  rotation: [ 1, 0, 0, 0 ],
					  translation: pos,
					  owner:owner,
					  type:'ParticleSystem',
					  DisplayName: _Editor.GetUniqueName('ParticleSystem')
					  }
                    };
		this.createChild('index-vwf',GUID(),proto,null,null); 
	}
	var CreatePrim = function(type,translation,size,texture,owner,id)
	{       
			translation[0] = SnapTo(translation[0],MoveSnap);
			translation[1] = SnapTo(translation[1],MoveSnap);
			translation[2] = SnapTo(translation[2],MoveSnap);
			translation[2] += .001;
			var BoxProto = { 
				
			extends: type+'.vwf',
			properties: {
			NotProto: ""
				}
			};
			var proto = BoxProto;
			proto.NotProto = "NOT!";
			proto.properties.NotProto = "NOT!";
			proto.properties.size = size;
			proto.properties.translation = translation;
			proto.properties.scale = [1,1,1];
			proto.properties.rotation = [0,0,1,0];
			proto.properties.owner = owner;
			proto.properties.texture = texture;
			proto.properties.type = type;
			proto.properties.tempid = id;
			proto.properties.DisplayName = _Editor.GetUniqueName(type);
			
			this.createChild('index-vwf',GUID(),proto,null,null); 
		
	}.bind(this);
	this.AddBlankBehavior = function()
	{
		
		if(GetSelectedVWFNode() == null)
		{
			_Notifier.notify('no object selected');
			return;
		}
		
		
		var ModProto = { 
				
			extends: 'http://vwf.example.com/node.vwf',
			properties: {
			NotProto: ""
				}
			};
			var proto = ModProto;
			proto.properties.type = 'behavior';
			proto.properties.DisplayName = _Editor.GetUniqueName('behavior');
			proto.properties.owner = document.PlayerNumber;
			var id = GetSelectedVWFNode().id;
			
			var owner = vwf.getProperty(id,'owner');
			if(!_Editor.isOwner(id,document.PlayerNumber))
			{
				_Notifier.notify('You do not have permission to edit this object');
				return;
			}
		
			this.createChild(id,GUID(),proto,null,null); 
	
	}
	var CreateModifier = function(type,owner)
	{       
		if(GetSelectedVWFNode() == null)
		{
			_Notifier.notify('no object selected');
			return;
		}
		
			var ModProto = { 
				
			extends: type+'.vwf',
			properties: {
			NotProto: ""
				}
			};
			var proto = ModProto;
			proto.NotProto = "NOT!";
			proto.properties.NotProto = "NOT!";
			proto.properties.translation = [0,0,0];
			proto.properties.scale = [1,1,1];
			proto.properties.rotation = [0,0,1,0];
			proto.properties.owner = owner;
			proto.properties.type = 'modifier';
			proto.properties.DisplayName = _Editor.GetUniqueName(type);
			
			var id = GetFirstChildLeaf(GetSelectedVWFNode()).id;
			
			var owner = vwf.getProperty(id,'owner');
			if(!_Editor.isOwner(id,document.PlayerNumber))
			{
				_Notifier.notify('You do not have permission to edit this object');
				return;
			}
		
			this.createChild(id,GUID(),proto,null,null); 
		
		    window.setTimeout(function(){$(document).trigger('modifierCreated',GetSelectedVWFNode());},500);
			
	}.bind(this);
	var GetFirstChildLeaf = function(object)
	{
		if(object)
		{
			if(object.children)
			{
				for(var i in object.children)
				{
					if(vwf.getProperty(object.children[i].id,'isModifier') == true)
						return GetFirstChildLeaf(object.children[i]);
				}
			}
			return object;
		}
		return null;
	}
	var Duplicate = function()
	{
		for(var i = 0; i < SelectedVWFNodes.length; i++)
		{
			var proto = _DataManager.getCleanNodePrototype(SelectedVWFNodes[i].id);
			proto.properties.DisplayName = _Editor.GetUniqueName(proto.properties.DisplayName);
			var parent = vwf.parent(_Editor.GetSelectedVWFNode().id);
			_Editor.createChild(parent,GUID(),proto,null,null,function(){alert();}); 
		}
		_Editor.SelectOnNextCreate(SelectedVWFNodes.length);
		_Editor.SelectObject(null);
	}.bind(this);
	var DeleteIDs = function(t)
	{
		
		if(t.id != undefined)
			delete t.id;
		if(t.children)
		{	
			var children = []
			for(var i in t.children)
			{
				DeleteIDs(t.children[i]);
				children.push(t.children[i]);
				delete t.children[i];
			}
			for(var i = 0; i < children.length; i++)
			{
				t.children[GUID()]=children[i];
			}
		}
	}
	var Copy = function(nodes)
	{
		_CoppiedNodes = [];
		var tocopy = SelectedVWFNodes;
		if(nodes)
		tocopy = nodes;
		for(var i = 0; i < tocopy.length; i++)
		{
			var t = _DataManager.getCleanNodePrototype(tocopy[i].id);
			var originalGizmoPos = [MoveGizmo.getLocX(),MoveGizmo.getLocY(),MoveGizmo.getLocZ()];
			var gizoffset = GLGE.subVec3(vwf.getProperty(tocopy[i].id,'translation'),originalGizmoPos);
			t.properties.transform[12] = gizoffset[0];
			t.properties.transform[13] = gizoffset[1];
			t.properties.transform[14] = gizoffset[2];
			t.properties.translation[0] = gizoffset[0];
			t.properties.translation[1] = gizoffset[1];
			t.properties.translation[2] = gizoffset[2];
			
			_CoppiedNodes.push(t);
		}
	}.bind(this);

	var Paste = function(useMousePoint)
	{
		_Editor.SelectObject(null);
		for(var i = 0; i < _CoppiedNodes.length; i++)
		{
			var t = _CoppiedNodes[i];
			
			var campos = [_Editor.findcamera().position.x,_Editor.findcamera().position.y,_Editor.findcamera().position.z];
				var ray;
				if(!useMousePoint)
					ray = _Editor.GetCameraCenterRay();
				else
					ray = _Editor.GetWorldPickRay(this.ContextShowEvent);
				_Editor.GetMoveGizmo().InvisibleToCPUPick = true;
				var pick = this.ThreeJSPick(campos,ray);
				_Editor.GetMoveGizmo().InvisibleToCPUPick = false;
				var dxy = pick.distance;
				var newintersectxy = GLGE.addVec3(campos,GLGE.scaleVec3(ray,dxy*.99));
			
			t.properties.transform[12] += newintersectxy[0];
			t.properties.transform[13] += newintersectxy[1];
			t.properties.transform[14] += newintersectxy[2];
			t.properties.translation[0] += newintersectxy[0];
			t.properties.translation[1] += newintersectxy[1];
			t.properties.translation[2] += newintersectxy[2];
			t.properties.DisplayName = _Editor.GetUniqueName(t.properties.DisplayName);
			_Editor.SelectOnNextCreate();
			this.createChild('index-vwf',GUID(),t,null,null); 
			t.properties.transform[12] -= newintersectxy[0];
			t.properties.transform[13] -= newintersectxy[1];
			t.properties.transform[14] -= newintersectxy[2];
			t.properties.translation[0] -= newintersectxy[0];
			t.properties.translation[1] -= newintersectxy[1];
			t.properties.translation[2] -= newintersectxy[2];
		}
	}
	var updateGizmoOrientation = function(updateBasisVectors)
	{
		if(CoordSystem == LocalCoords && SelectedVWFNodes[0])
		{
			
			
			
			var aa = vwf.getProperty(SelectedVWFNodes[0].id,'rotation');
			var rotmat = GetRotationMatrix(toGMat(findviewnode(SelectedVWFNodes[0].id).matrixWorld));//GLGE.angleAxis(aa[3] * 0.0174532925,[aa[0],aa[1],aa[2]]);
			var invRot = GLGE.inverseMat4(rotmat);
			var invRotT = GLGE.transposeMat4(invRot);
			
                       
			
			

			MoveGizmo.parent.matrixAutoUpdate = false;
			for(var i=0; i < 16; i++)
				if( i!=12 && i!=13 && i!=14)
					MoveGizmo.parent.matrix.elements[i] = invRotT[i];
			//MoveGizmo.matrix.setRotationFromQuaternion(q);
			MoveGizmo.parent.updateMatrixWorld(true);
			if(updateBasisVectors)
			{
				CurrentZ = GLGE.mulMat4Vec3(invRot,WorldZ);
				CurrentX = GLGE.mulMat4Vec3(invRot,WorldX);
				CurrentY = GLGE.mulMat4Vec3(invRot,WorldY);
			}
		}else
		{
			//var rotmat = GetRotationMatrix(findviewnode(SelectedVWFNode.id).parent.getModelMatrix());//GLGE.angleAxis(aa[3] * 0.0174532925,[aa[0],aa[1],aa[2]]);
			
			var q = new THREE.Quaternion();
			var rotmat = new THREE.Matrix4();
			rotmat.elements =[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
			
			for(var i=0; i < 16; i++)
				if( i!=12 && i!=13 && i!=14)
					MoveGizmo.parent.matrix.elements[i] = rotmat.elements[i];
					
			MoveGizmo.parent.updateMatrixWorld(true);
			//var invRot = GLGE.inverseMat4(rotmat);
			CurrentZ = WorldZ; //GLGE.mulMat4Vec3(invRot,WorldZ);
			CurrentX = WorldX; //GLGE.mulMat4Vec3(invRot,WorldX);
			CurrentY = WorldY; //GLGE.mulMat4Vec3(invRot,WorldY);
		}
	}.bind(this);
	var triggerSelectionChanged = function(VWFNode)
	{
		
		$(document).trigger('selectionChanged', [VWFNode]);
		
	}.bind(this);
	var triggerSelectionTransformed = function(VWFNode)
	{
		
		$(document).trigger('selectionTransformedLocal', [VWFNode]);
		
	}.bind(this);
	this.updateGizmoLocation = function()
	{
			
			var childmat = toGMat(this.findviewnode(this.GetSelectedVWFNode().id).matrixWorld);
			
			lastpos[0] = [childmat[3],childmat[7],childmat[11]];
			
			var gizpos = [0,0,0];
			
			gizpos = [childmat[3],childmat[7],childmat[11]];
			
			for(var s =1; s < SelectedVWFNodes.length; s++)
			{
				//this.findviewnode(SelectedVWFNodes[s].id).updateMatrix();
				var nextchildmat = toGMat(this.findviewnode(SelectedVWFNodes[s].id).matrixWorld);
				gizpos[0] += nextchildmat[3];
				gizpos[1] += nextchildmat[7];
				gizpos[2] += nextchildmat[11];
				
				var trans = vwf.getProperty(SelectedVWFNodes[s].id,'transform');
				lastpos[s] = [trans[12],trans[13],trans[14]];
				lastscale[s] = vwf.getProperty(SelectedVWFNodes[s].id,'scale');
			}
			
			gizpos[0] /= SelectedVWFNodes.length;
			gizpos[1] /= SelectedVWFNodes.length;
			gizpos[2] /= SelectedVWFNodes.length;
			
			MoveGizmo.parent.matrix.setPosition(new THREE.Vector3(gizpos[0],gizpos[1],gizpos[2]));
			MoveGizmo.parent.updateMatrixWorld(true);
	}
	this.updateBounds = function()
	{
			
			for(var i =0; i < SelectionBounds.length; i++)
			{
				SelectionBounds[i].parent.remove(SelectionBounds[i]);
			}
			SelectionBounds = [];
			for(var i =0; i < SelectedVWFNodes.length; i++)
			{	
				var box;
				var mat;
				
				box = _Editor.findviewnode(SelectedVWFNodes[i].id).getBoundingBox(true);
				mat = toGMat(_Editor.findviewnode(SelectedVWFNodes[i].id).matrixWorld).slice(0);
				
				
				var color = [1,1,1,1];
				if(findviewnode(SelectedVWFNodes[i].id).initializedFromAsset)
					color = [1,0,0,1];
				if(vwf.getProperty(SelectedVWFNodes[i].id,'type') == 'Group' && vwf.getProperty(SelectedVWFNodes[i].id,'open') == false)	
					color = [.2,.5,.2,1];
				if(vwf.getProperty(SelectedVWFNodes[i].id,'type') == 'Group' && vwf.getProperty(SelectedVWFNodes[i].id,'open') == true)	
					color = [.5,1,.5,1];	
					
				
				SelectionBounds[i] = new THREE.Object3D();
				SelectionBounds[i].add(BuildBox([box.max.x - box.min.x,box.max.y - box.min.y,box.max.z - box.min.z],[box.min.x + (box.max.x - box.min.x)/2,box.min.y + (box.max.y - box.min.y)/2,box.min.z + (box.max.z - box.min.z)/2],color));
				SelectionBounds[i].matrixAutoUpdate = false;
				SelectionBounds[i].matrix.elements = GLGE.transposeMat4(mat);
				SelectionBounds[i].updateMatrixWorld(true);
				SelectionBounds[i].children[0].material.wireframe = true;
				SelectionBounds[i].children[0].renderDepth = 10000 -3;
				SelectionBounds[i].children[0].material.depthTest = false;
				SelectionBounds[i].children[0].material.depthWrite = false;
				SelectionBounds[i].children[0].PickPriority = -1;
				// SelectionBounds[i].InvisibleToCPUPick = true;
				// SelectionBounds[i].setCastShadows(false);
				// SelectionBounds[i].setDrawType(GLGE.DRAW_LINELOOPS);
				// SelectionBounds[i].setDepthTest(false);
				// SelectionBounds[i].setZtransparent(true);
				// SelectionBounds[i].setCull(GLGE.NONE);
				// SelectionBounds[i].setPickable(false);
				// SelectionBounds[i].RenderPriority = 999;
				SelectionBounds[i].vwfid = SelectedVWFNodes[i].id;
				
			//	SelectionBounds[i].setMaterial(GLGE.MaterialManager.findMaterialRecord(SelectionBounds[i].getMaterial()).material);
				this.SelectionBoundsContainer.add(SelectionBounds[i]);
			}
	}
	this.updateBoundsTransform = function(id)
	{
		for(var i =0; i < SelectionBounds.length; i++)
		{
			if(SelectionBounds[i].vwfid == id)
			{
				var mat = toGMat(_Editor.findviewnode(id).matrixWorld).slice(0);
				SelectionBounds[i].matrix.elements = GLGE.transposeMat4(mat);
				SelectionBounds[i].updateMatrixWorld(true);
			}
		}
	}
	this.getSelectionCount =function()
	{
		return SelectedVWFNodes.length;
	
	}.bind(this);
	this.isSelected =function(id)
	{
			var index = -1;
			
			for(var i = 0; i < SelectedVWFNodes.length; i++)
				if(SelectedVWFNodes[i] && SelectedVWFNodes[i].id == id)
					index = i;		
			if(index == -1)
				return false;
			return true;	
	}.bind(this);
	this.OpenGroup = function()
	{
		for(var i =0; i < this.getSelectionCount(); i++)
		{
			if(vwf.getProperty(SelectedVWFNodes[i].id,'type') == 'Group')
			{
				vwf.setProperty(SelectedVWFNodes[i].id,'open',true);
			}
		}
		this.updateBounds();
	}
	this.CloseGroup = function()
	{
		for(var i =0; i < this.getSelectionCount(); i++)
		{
			if(vwf.getProperty(SelectedVWFNodes[i].id,'type') == 'Group')
			{
				vwf.setProperty(SelectedVWFNodes[i].id,'open',false);
			}
		}
		this.updateBounds();
	}
	this.SelectObjectPublic = function(VWFNodeid)
	{
		if(SelectMode=='TempPick')
		{
				if(this.TempPickCallback)
					this.TempPickCallback(vwf.getNode(VWFNodeid));
		}else
		{
			this.SelectObject(VWFNodeid,this.PickMod);
		}
	}
	var SelectObject = function(VWFNode,selectmod)
	{
		
		if(VWFNode && VWFNode.constructor.name == 'Array')
		{
			for(var i =0; i < VWFNode.length; i++)
				VWFNode[i] = vwf.getNode(VWFNode[i]);
		}else if(typeof(VWFNode) == 'object')
			VWFNode = [VWFNode];
		else if(typeof(VWFNode) == 'string')
			VWFNode = [vwf.getNode(VWFNode)];
			
		
			
		
		if(!selectmod)
		{
			SelectedVWFNodes = [];
		}
		
		if(VWFNode)
		for(var i =0; i < VWFNode.length; i++)
		{
			//if you've selected a node that is grouped, but not selected a group directly, select the nearest open group head.
			try{
				if(vwf.getProperty(VWFNode[i].id,'type') != 'Group')
				{
					while(vwf.getProperty(vwf.parent(VWFNode[i].id),'type') == 'Group' && vwf.getProperty(vwf.parent(VWFNode[i].id),'open') == false)
					{
						VWFNode[i] = vwf.getNode(vwf.parent(VWFNode[i].id));
					}
				}
			}catch(e)
			{
			
			}
			if(!selectmod)
			{
				if(VWFNode[i])
				{
					if(!this.isSelected(VWFNode[i].id) )
						SelectedVWFNodes.push(VWFNode[i]);
				}
			}
			
			if(selectmod == Add)
			{
				
				if(!this.isSelected(VWFNode[i].id) )
					SelectedVWFNodes.push(VWFNode[i]);
			}
			
			if(selectmod == Subtract)
			{
				var index = -1;
				
				for(var j = 0; j < SelectedVWFNodes.length; j++)
					if(SelectedVWFNodes[j] && SelectedVWFNodes[j].id == VWFNode[i].id)
						index = j;
						
				SelectedVWFNodes.splice(index,1);		
				
			}
		}
		
		if(SelectedVWFNodes[0])
			this.SelectedVWFID = SelectedVWFNodes[0].id;
		else
			this.SelectedVWFID = null;
			
		triggerSelectionChanged(SelectedVWFNodes[0]);
		
		if(MoveGizmo == null)
		{
			BuildMoveGizmo();
		}
		MoveGizmo.InvisibleToCPUPick = false;
		if(SelectedVWFNodes[0])
		{
			for(var s = 0; s < SelectedVWFNodes.length; s++)
			{
				lastscale[s] = vwf.getProperty(SelectedVWFNodes[s].id,'scale');
				
				this.showMoveGizmo();
				
				if(findviewnode(SelectedVWFNodes[s].id))
				{
					//findviewnode(SelectedVWFNodes[s].id).setTransformMode(GLGE.P_MATRIX);
					//findviewnode(SelectedVWFNodes[s].id).setRotMatrix(GetRotationMatrix(findviewnode(SelectedVWFNodes[s].id).getLocalMatrix()));
					//findviewnode(SelectedVWFNodes[s].id).updateMatrix
				}
			}
			updateBoundsAndGizmoLoc();
			updateGizmoOrientation(true);
		}
		else
		{
			this.hideMoveGizmo();
			MoveGizmo.InvisibleToCPUPick = true;
			if(SelectionBounds.length > 0)
			{
				for(var i =0; i < SelectionBounds.length; i++)
				{
					SelectionBounds[i].parent.remove(SelectionBounds[i]);
				}
				SelectionBounds = [];
			}
		}
	}.bind(this);
	this.hideMoveGizmo = function()
	{
			for(var i =0; i < MoveGizmo.children.length; i++)
			{ 
				MoveGizmo.children[i].oldVis = MoveGizmo.children[i].visible;
				MoveGizmo.children[i].visible=false;
			}
	}
	this.showMoveGizmo = function()
	{
			for(var i =0; i < MoveGizmo.children.length; i++)
			{ 
				MoveGizmo.children[i].visible=MoveGizmo.children[i].oldVis;
			}
	}
	var updateBoundsAndGizmoLoc = function()
	{
	
	
			
			_Editor.updateGizmoLocation();
			_Editor.updateGizmoSize();
			_Editor.updateGizmoOrientation(false);
			_Editor.updateBounds();
			$('#StatusSelectedID').html(SelectedVWFNodes[0].id);
			
			
	
	
	}.bind(this);
	var updateGizmoSize = function()
	{
		var pos = new THREE.Vector3();
		pos.getPositionFromMatrix(MoveGizmo.parent.matrixWorld);
		var gizpos = [pos.x,pos.y,pos.z];
		var campos = [findcamera().position.x,findcamera().position.y,findcamera().position.z];
		var dist = GLGE.lengthVec3(GLGE.subVec3(gizpos,campos));
		
		var cam = findcamera();
		cam.updateMatrixWorld(true);
        cam.matrixWorldInverse.getInverse( cam.matrixWorld );
		gizpos = GLGE.mulMat4Vec3(GLGE.transposeMat4(cam.matrixWorldInverse.elements),gizpos);
		
		dist = -gizpos[2]/65;
		
		var oldscale  = MoveGizmo.matrix.elements[0];
		MoveGizmo.matrix.scale(new THREE.Vector3(1/oldscale,1/oldscale,1/oldscale));
		var windowXadj = 1600.0/$('#index-vwf').width();
		var windowYadj = 1200.0/$('#index-vwf').height();
		var winadj = Math.max(windowXadj,windowYadj);
		
		
		
		MoveGizmo.matrix.scale(new THREE.Vector3(dist*winadj,dist*winadj,dist*winadj));
		MoveGizmo.updateMatrixWorld(true);
	}.bind(this);
	var BuildMoveGizmo = function()
	{
		var red = [1,0,0,1];
		var green = [0,1,.0,1];
		var blue = [0,0,1,1];
		if(MoveGizmo != null)
		return;
		
		  //temp mesh for all geometry to test
                var cubeX = new THREE.Mesh(
                    new THREE.CubeGeometry( 10.00, .40, .40 ),
                    new THREE.MeshLambertMaterial( { color: 0xFF0000, emissive:0xFF0000 } )
                );
                cubeX.position.set(5.00,.15,.15);
                var cubeY = new THREE.Mesh(
                    new THREE.CubeGeometry( .40, 10.00, .40 ),
                    new THREE.MeshLambertMaterial( { color: 0x00FF00, emissive:0x00FF00 } )
                );
                cubeY.position.set(.15,5.00,.15);
                var cubeZ = new THREE.Mesh(
                    new THREE.CubeGeometry( .40, .40, 10.00 ),
                    new THREE.MeshLambertMaterial( { color: 0x0000FF, emissive:0x0000FF} )
                );
                cubeZ.position.set(.15,.15,5.00);
                
                MoveGizmo = new THREE.Object3D();
                MoveGizmo.add(cubeX);
                MoveGizmo.add(cubeY);
                MoveGizmo.add(cubeZ);
				
				var rotx = new THREE.Mesh(
                    new THREE.TorusGeometry( 7, .50,4,20 ),
                    new THREE.MeshLambertMaterial( { color: 0xFF0000, emissive:0xFF0000} )
                );
				var roty = new THREE.Mesh(
                    new THREE.TorusGeometry( 7, .50 ,4,20 ),
                    new THREE.MeshLambertMaterial( { color: 0x00FF00, emissive:0x00FF00} )
                );
				var rotz = new THREE.Mesh(
                    new THREE.TorusGeometry( 7, .50 ,4,20 ),
                    new THREE.MeshLambertMaterial( { color: 0x0000FF, emissive:0x0000FF} )
                );
                
				MoveGizmo.add(rotx);
				roty.rotation.x = Math.PI/2;
                MoveGizmo.add(roty);
				rotx.rotation.y = Math.PI/2;
                MoveGizmo.add(rotz);
				rotz.rotation.z = 90;
				
		
		MoveGizmo.add(BuildBox([.5,.5,.5],[10.25,0,0],red));//scale x		
		MoveGizmo.add(BuildBox([.5,.5,.5],[0,10.25,0],green));//scale y
		MoveGizmo.add(BuildBox([.5,.5,.5],[0,0,10.25],blue));//scale z
		MoveGizmo.add(BuildBox([.85,.85,.85],[9.25,0,0],red));//scale xyz
		MoveGizmo.add(BuildBox([.85,.85,.85],[0,9.25,0],green));//scale xyz
		MoveGizmo.add(BuildBox([.85,.85,.85],[0,0,9.25],blue));//scale xyz
		MoveGizmo.add(BuildBox([1.50,1.50,.30],[.75,.75,.15],[75,75,0,1]));//movexy
	
		MoveGizmo.add(BuildBox([1.50,.30,1.50],[.75,.15,.75],[75,0,75,1]));//movexz
	
		MoveGizmo.add(BuildBox([.30,1.50,1.50],[.15,.75,.75],[0,75,75,1]));//moveyz
		
		MoveGizmo.add(BuildRing(12,.7,[0,0,1],30,[1,1,1,1],90,450));//rotate z
		
		MoveGizmo.add(BuildRing(7,0.5,[1,0,0],37,red,0,370));//rotate x
		MoveGizmo.add(BuildRing(7,0.5,[0,1,0],37,green,0,370));//rotate y
		MoveGizmo.add(BuildRing(7,0.5,[0,0,1],37,blue,0,370));//rotate z
		
		MoveGizmo.add(BuildBox([5,5,5],[0,0,0],[1,1,1,1]));//scale uniform
		MoveGizmo.add(BuildBox([0.30,5,5],[5,0,0],red));//scale uniform
		MoveGizmo.add(BuildBox([5,.30,5],[0,5,0],green));//scale uniform
		MoveGizmo.add(BuildBox([5,5,.30],[0,0,5],blue));//scale uniform
		MoveGizmo.add(BuildBox([.30,5,5],[-5,0,0],red));//scale uniform
		MoveGizmo.add(BuildBox([5,.30,5],[0,-5,0],green));//scale uniform
		MoveGizmo.add(BuildBox([5,5,.30],[0,0,-5],blue));//scale uniform		
				
				
				var movegizhead = new THREE.Object3D();
				movegizhead.matrixAutoUpdate = false;
				movegizhead.add(MoveGizmo);
		findscene().add(movegizhead);
		MoveGizmo.matrixAutoUpdate = false;
		
		for(var i =0; i < MoveGizmo.children.length; i++)
		{
			MoveGizmo.children[i].material.originalColor = new THREE.Color();
			var c = MoveGizmo.children[i].material.color;
			MoveGizmo.children[i].material.originalColor.setRGB(c.r,c.g,c.b);
			MoveGizmo.children[i].renderDepth = 10000 - i;
			MoveGizmo.children[i].material.depthTest = false;
			MoveGizmo.children[i].material.depthWrite = false;
			MoveGizmo.children[i].material.transparent = true;
			MoveGizmo.children[i].PickPriority = 1;
		}		
		
		SetGizmoMode(Move);
/* 		var red = [1,.55,.55,1];
		var green = [.55,1,.55,1];
		var blue = [.55,.55,1,1];
		
		MoveGizmo = new GLGE.Group();
		MoveGizmo.addChild(BuildBox([1,.030,.030],[.5,0,0],red));               //move x
		MoveGizmo.children[0].getMesh().setPickMesh(BuildBox([1,.20,.20],[.5,0,0],red).getMesh());
		MoveGizmo.addChild(BuildBox([.030,1,.030],[0,.5,0],green));//move y
		MoveGizmo.children[1].getMesh().setPickMesh(BuildBox([.2,1,.20],[0,.5,0],red).getMesh());
		MoveGizmo.addChild(BuildBox([.030,.030,1],[0,0,.5],blue));//move z
		MoveGizmo.children[2].getMesh().setPickMesh(BuildBox([.2,.20,1],[0,0,.5],red).getMesh());
		MoveGizmo.addChild(BuildRing([0,1.070,0],[0,1,0],[1,0,0],6,red,25,62));//rotate x
		MoveGizmo.addChild(BuildRing([0,0,1.070],[0,0,1],[0,1,0],6,green,25,62));//rotate y
		MoveGizmo.addChild(BuildRing([0,1.070,0],[0,1,0],[0,0,-1],6,blue,25,62));//rotate z
		MoveGizmo.addChild(BuildBox([.05,.05,.05],[1.025,0,0],red));//scale x
		MoveGizmo.addChild(BuildBox([.05,.05,.05],[0,1.025,0],green));//scale y
		MoveGizmo.addChild(BuildBox([.05,.05,.05],[0,0,1.025],blue));//scale z
		MoveGizmo.addChild(BuildBox([.085,.085,.085],[.925,0,0],red));//scale xyz
		MoveGizmo.addChild(BuildBox([.085,.085,.085],[0,.925,0],green));//scale xyz
		MoveGizmo.addChild(BuildBox([.085,.085,.085],[0,0,.925],blue));//scale xyz
		MoveGizmo.addChild(BuildBox([.150,.150,.030],[.075,.075,.015],[.75,.75,25,1]));//movexy
		MoveGizmo.children[12].getMesh().setPickMesh(BuildBox([.50,.50,.030],[.25,.25,.015],red).getMesh());
		MoveGizmo.addChild(BuildBox([.150,.030,.150],[.075,.015,.075],[.75,.25,.75,1]));//movexz
		MoveGizmo.children[13].getMesh().setPickMesh(BuildBox([.50,.030,.5],[.25,.015,.25],red).getMesh());
		MoveGizmo.addChild(BuildBox([.030,.150,.150],[.015,.075,.075],[.25,.75,.75,1]));//moveyz
		MoveGizmo.children[14].getMesh().setPickMesh(BuildBox([.030,.50,.5],[.015,.25,.25],red).getMesh());
		MoveGizmo.addChild(BuildRing([0,.170,0],[0,.240,0],[0,0,-1],4,[1,1,1,1],90,450));//rotate z
		
		MoveGizmo.addChild(BuildRing([0,1.050,0],[0,1,0],[1,0,0],37,red,0,370));//rotate x
		MoveGizmo.addChild(BuildRing([0,0,1.050],[0,0,1],[0,1,0],37,green,0,370));//rotate y
		MoveGizmo.addChild(BuildRing([0,1.050,0],[0,1,0],[0,0,-1],37,blue,0,370));//rotate z
		
		MoveGizmo.children[16].getMesh().setPickMesh(BuildRing([0,1.120,0],[0,.9,0],[1,0,0],37,red,0,370).getMesh());//rotate x
		MoveGizmo.children[17].getMesh().setPickMesh(BuildRing([0,0,1.120],[0,0,.9],[0,1,0],37,green,0,370).getMesh());//rotate y
		MoveGizmo.children[18].getMesh().setPickMesh(BuildRing([0,1.120,0],[0,.9,0],[0,0,-1],37,blue,0,370).getMesh());//rotate z
		
		MoveGizmo.addChild(BuildBox([.5,.5,.5],[0,0,0],[1,1,1,1]));//scale uniform
		MoveGizmo.addChild(BuildBox([.030,.5,.5],[.5,0,0],red));//scale uniform
		MoveGizmo.addChild(BuildBox([.5,.030,.5],[0,.5,0],green));//scale uniform
		MoveGizmo.addChild(BuildBox([.5,.5,.030],[0,0,.5],blue));//scale uniform
		MoveGizmo.addChild(BuildBox([.030,.5,.5],[-.5,0,0],red));//scale uniform
		MoveGizmo.addChild(BuildBox([.5,.030,.5],[0,-.5,0],green));//scale uniform
		MoveGizmo.addChild(BuildBox([.5,.5,.030],[0,0,-.5],blue));//scale uniform
		for(var i=0; i < MoveGizmo.children.length;i++){
			MoveGizmo.children[i].setZtransparent(true); MoveGizmo.children[i].setDepthTest(false);
			
			MoveGizmo.children[i].PickPriority = Infinity;
			MoveGizmo.children[i].RenderPriority = 1000+i;
			MoveGizmo.children[i].setCastShadows(false);
		}
		MoveGizmo.InvisibleToCPUPick = false;
		findscene().addChild(MoveGizmo); */
		
	}.bind(this);
	var SetGizmoMode = function(type)
	{
		
		if(type == Move)
		{
			$('#StatusTransform').html('Move');	
			for(var i=0; i < MoveGizmo.children.length;i++){
				if((i>=0 && i <=2) || (i>=12 && i<=14))
				{
					MoveGizmo.children[i].visible = true;
				}
				else
				{
					MoveGizmo.children[i].visible = false;
				}
				GizmoMode = Move;
			}
		}
		if(type == Rotate)
		{
			$('#StatusTransform').html('Rotate');	
			for(var i=0; i < MoveGizmo.children.length;i++){
				if(i>=16 && i <=18)
				{
					MoveGizmo.children[i].visible = true;
				}
				else
				{
					MoveGizmo.children[i].visible = false;
				}
				GizmoMode = Rotate;
			}
		}
		if(type == Scale)
		{
			$('#StatusTransform').html('Scale');
			//SetCoordSystem(LocalCoords);			
			for(var i=0; i < MoveGizmo.children.length;i++){
				if(i>=19 && i <=25)
				{
					MoveGizmo.children[i].visible = true;
				}
				else
				{
					MoveGizmo.children[i].visible = false;
				}
				GizmoMode = Scale;
			}
		}
		if(type == Multi)
		{
			$('#StatusTransform').html('Multi');	
			for(var i=0; i < MoveGizmo.children.length;i++){
				if(i <=15)
				{
					MoveGizmo.children[i].visible = true;
				}
				else
				{
					MoveGizmo.children[i].visible = false;
				}
				
				GizmoMode = Multi;
			}
		}
		
		
		
		
	}.bind(this);
	var BuildRing = function(radius1,radius2,axis,steps,color,startdeg,enddeg)
	{
		var mesh = new THREE.Mesh( new THREE.TorusGeometry(radius1,radius2,6,steps), new THREE.MeshLambertMaterial());
		mesh.material.color.r = color[0];
		mesh.material.color.g = color[1];
		mesh.material.color.b = color[2];
		mesh.material.emissive.r = color[0];
		mesh.material.emissive.g = color[1];
		mesh.material.emissive.b = color[2];
		mesh.rotation.x = axis[1] * Math.PI/2;
		mesh.rotation.y = axis[0] * Math.PI/2;
		mesh.rotation.z = axis[2] * Math.PI/2;
		
		mesh.updateMatrixWorld(true);
		return mesh;
			
	}.bind(this);
	var BuildBox = function(size,offset,color)
	{
		var mesh = new THREE.Mesh( new THREE.CubeGeometry(size[0],size[1],size[2]), new THREE.MeshLambertMaterial());
		mesh.material.color.r = color[0];
		mesh.material.color.g = color[1];
		mesh.material.color.b = color[2];
		mesh.material.emissive.r = color[0];
		mesh.material.emissive.g = color[1];
		mesh.material.emissive.b = color[2];
		mesh.matrix.setPosition(new THREE.Vector3(offset[0],offset[1],offset[2]));
		mesh.matrixAutoUpdate = false;
		mesh.updateMatrixWorld(true);
		return mesh;
		
	}.bind(this);
	this.PickParentCallback = function(parentnode)
	{
		
		this.TempPickCallback = null;
		var node = _DataManager.getCleanNodePrototype(this.GetSelectedVWFNode().id);
		
		
		var childmat = toGMat(this.findviewnode(this.GetSelectedVWFNode().id).matrixWorld);
		var parentmat = toGMat(this.findviewnode(parentnode.id).matrixWorld);
		var invparentmat = GLGE.inverseMat4(parentmat);
		childmat = GLGE.mulMat4(invparentmat,childmat);
		
		delete node.properties.translation;
		delete node.properties.rotation;
		delete node.properties.quaternion;
		delete node.properties.scale;
		
		node.properties.transform = GLGE.transposeMat4(childmat);
	
		
		this.DeleteSelection();
		this.createChild(parentnode.id,GUID(),node);
		_Editor.SelectOnNextCreate();
		SetSelectMode('Pick');
	}
	this.RemoveParent = function()
	{
		
		var node = _DataManager.getCleanNodePrototype(this.GetSelectedVWFNode().id);

		var childmat = toGMat(this.findviewnode(this.GetSelectedVWFNode().id).matrixWorld);

		delete node.properties.translation;
		delete node.properties.rotation;
		delete node.properties.quaternion;
		delete node.properties.scale;
		
		node.properties.transform = GLGE.transposeMat4(childmat);
		
		this.DeleteSelection();
		_Editor.SelectOnNextCreate();
		this.createChild('index-vwf',GUID(),node);
		SetSelectMode('Pick');
	}
	this.SetParent = function()
	{
		if(!this.GetSelectedVWFNode())
		{
			_Notifier.alert('No object selected. Select the desired child, then use this to choose the parent.');
			return;
		}
		SetSelectMode('TempPick');
		this.TempPickCallback = this.PickParentCallback;
	}
	this.UngroupSelection = function()
	{
	
		for(var i=0; i<this.getSelectionCount(); i++)
		{
		
			// if(!_Editor.isOwner(SelectedVWFNodes[i].id,document.PlayerNumber))
			// {
				// _Notifier.alert('You must be the group owner to ungroup objects.');
				// continue;
			// }
		
			var vwfparent = vwf.parent(this.GetSelectedVWFNode(i).id);
			var children = vwf.children(this.GetSelectedVWFNode(i).id);
			for(var j = 0; j < children.length; j++)
			{
				
				var node = _DataManager.getCleanNodePrototype(children[j]);
				var childmat = toGMat(this.findviewnode(children[j]).matrixWorld);
				var parentmat = toGMat(this.findviewnode(vwfparent).matrixWorld);
				var invparentmat = GLGE.inverseMat4(parentmat);
				childmat = GLGE.mulMat4(invparentmat,childmat);
			
				delete node.properties.translation;
				delete node.properties.rotation;
				delete node.properties.quaternion;
				delete node.properties.scale;
				
				node.properties.transform = GLGE.transposeMat4(childmat);
				vwf_view.kernel.deleteNode(children[j]);
				vwf_view.kernel.createChild(vwfparent,GUID(),node);
			}
			vwf_view.kernel.deleteNode(this.GetSelectedVWFNode(i).id);
		}
		this.SelectObject();
	}
	this.GroupSelection = function()
	{
		
		var parentmat = GLGE.identMatrix();
		
		
		var parent = this.findviewnode(this.GetSelectedVWFNode().id).parent;
		var pos;
		for(var i=0; i<this.getSelectionCount(); i++)
		{
			if(parent != this.findviewnode(this.GetSelectedVWFNode(i).id).parent)
			{
				_Notifier.alert('All objects must have the same parent to be grouped');
				return;
			}
			// if(!_Editor.isOwner(SelectedVWFNodes[i].id,document.PlayerNumber))
			// {
				// _Notifier.alert('You must be the owner of all objects to group them.');
				// return;
			// }
			var childmat = toGMat(this.findviewnode(this.GetSelectedVWFNode(i).id).matrixWorld);
			if(!pos)
				pos = [childmat[3],childmat[7],childmat[11]];
			else
				pos = GLGE.addVec3(pos,[childmat[3],childmat[7],childmat[11]]);
		}
		
		pos = GLGE.scaleVec3(pos,1/this.getSelectionCount());
		
		parentmat[3] = pos[0];
		parentmat[7] = pos[1];
		parentmat[11] = pos[2];
		
		var proto = {
			extends: 'sandboxGroup.vwf',
			properties: {
				type: 'Group',
				owner: document.PlayerNumber,
				transform : GLGE.transposeMat4(parentmat)
			},
			children:
			{
			
			
			}
		};
		
		for(var i=0; i<this.getSelectionCount(); i++)
		{
			var node = _DataManager.getCleanNodePrototype(this.GetSelectedVWFNode(i).id);
			var childmat = toGMat(this.findviewnode(this.GetSelectedVWFNode(i).id).matrixWorld);
			var invparentmat = GLGE.inverseMat4(parentmat);
			childmat = GLGE.mulMat4(invparentmat,childmat);
			
			delete node.properties.translation;
			delete node.properties.rotation;
			delete node.properties.quaternion;
			delete node.properties.scale;
			
			node.properties.transform = GLGE.transposeMat4(childmat);
			proto.children[GUID()]=node;
		}
		
		this.DeleteSelection();
		vwf_view.kernel.createChild('index-vwf',GUID(),proto);
		_Editor.SelectOnNextCreate();
		SetSelectMode('Pick');
	
	}
	var findviewnode = function(id)
	{
		for(var i =0; i<vwf.views.length;i++)
		{
			if(vwf.views[i] && vwf.views[i].state && vwf.views[i].state.nodes && vwf.views[i].state.nodes[id] && vwf.views[i].state.nodes[id].threeObject ) return vwf.views[i].state.nodes[id].threeObject ;
			if(vwf.views[i] && vwf.views[i].state && vwf.views[i].state.scenes && vwf.views[i].state.scenes[id] && vwf.views[i].state.scenes[id].threeScene ) return vwf.views[i].state.scenes[id].threeScene ;
			
			
		}
		return null;
	}.bind(this);
	this.SelectScene = function()
	{
		this.SelectObject('index-vwf');
	}
	var SetSelectMode = function(e)
	{
		SelectMode = e;
		$('#StatusPickMode').html('Pick: ' + e);
		if(e == 'Pick')
			$('#MenuSelectPickicon').css('background',"#9999FF");
		else
			$('#MenuSelectPickicon').css('background',"");	
			
		if(SelectMode == 'TempPick')
		{
			$('#index-vwf').css('cursor','crosshair');
		}else
		{
			$('#index-vwf').css('cursor','default');
		}
	}.bind(this);
	var SetCoordSystem	= function(e)
	{
		CoordSystem = e;
		if(e == WorldCoords)
		{
			$('#StatusCoords').html('World Coords');
			$('#MenuWorldicon').css('background',"#9999FF");
			$('#MenuLocalicon').css('background',"");
		}
		else
		{
			$('#StatusCoords').html('Local Coords');
			$('#MenuWorldicon').css('background',"");
			$('#MenuLocalicon').css('background',"#9999FF");
		}
	}.bind(this);
	var GetMoveGizmo = function(e)
	{	
		return MoveGizmo;
	}.bind(this);
	var SetSnaps = function(m,r,s)
	{	
		RotateSnap = r;
		MoveSnap = m;
		ScaleSnap = s;
		
		$('#StatusSnaps').html('Snaps: '+(r/0.0174532925)+'deg, '+m+'m, '+s+'%');
		
	}.bind(this);
	this.GetSelectedVWFID = function()
	{
		return this.SelectedVWFID;
	}
	this.CallCreateNodeCallback = function(e)
	{
		try
		{
			this.createNodeCallback(e);
			
		}catch(e)
		{
			console.log(e);
		}
	}
	this.SetCreateNodeCallback = function(callback)
	{
		this.createNodeCallback = callback;
	}
	this.SelectOnNextCreate = function(count)
	{
		if(!count)
			count = 1;
		this.toSelect = count;	
		this.tempSelect = [];
		this.SetCreateNodeCallback(function(e){
				
				_Editor.tempSelect.push(e);
				_Editor.toSelect--;
				
				
				if(_Editor.toSelect == 0 )
				{
					_Editor.createNodeCallback = null;
					_Editor.SelectObject(_Editor.tempSelect,Add);
				}
		});
	}
	var GetSelectedVWFNode = function(idx)
	{
		if(idx === undefined)
			idx = 0;
		try{
			
			if(SelectedVWFNodes[idx])
			return vwf.getNode(SelectedVWFNodes[idx].id);
		}catch(e)
		{
			
			return null;
		}
	}.bind(this);
	var findscene = function()
	{
             return vwf.views[0].state.scenes["index-vwf"].threeScene;
      }
    var findcamera = function()
      {
             return vwf.views[0].state.scenes["index-vwf"].camera.threeJScameras[vwf.views[0].state.scenes["index-vwf"].camera.defaultCamID];
      }
      function matcpy(mat)
      {
        var newmat = [];
        for(var i = 0; i < 16; i++)
            newmat[i] = mat[i];
        return newmat;    
      }
      function getViewProjection()
      {
        var cam = findcamera();
        cam.matrixWorldInverse.getInverse( cam.matrixWorld );
        
        var _viewProjectionMatrix = new THREE.Matrix4();
        _viewProjectionMatrix.multiplyMatrices( cam.projectionMatrix, cam.matrixWorldInverse );


        return GLGE.transposeMat4(_viewProjectionMatrix.flattenToArray([]));
      }
      
	  function toGMat(threemat)
      {
        var mat = [];
		mat = matcpy(threemat.elements);
		
		mat = (GLGE.transposeMat4(mat));
		return mat;
      }
	this.buildContextMenu = function()
	{
		$(document.body).append('<div id="ContextMenu" />');
		
		$('#ContextMenu').append('<div id="ContextMenuName" style="border-bottom: 3px solid gray;">name</div>');
		$('#ContextMenu').append('<div id="ContextMenuActions" style="border-bottom: 2px gray dotted;"></div>');
		$('#ContextMenu').append('<div id="ContextMenuSelect" class="ContextMenuItem" style="border-bottom: 1px solid gray;">Select</div>');
		$('#ContextMenu').append('<div id="ContextMenuSelectNone" class="ContextMenuItem" style="border-bottom: 1px solid gray;" >Select None</div>');
		$('#ContextMenu').append('<div id="ContextMenuMove" class="ContextMenuItem">Move</div>');
		$('#ContextMenu').append('<div id="ContextMenuRotate" class="ContextMenuItem">Rotate</div>');
		$('#ContextMenu').append('<div id="ContextMenuScale" class="ContextMenuItem" style="border-bottom: 1px solid gray;">Scale</div>');
		$('#ContextMenu').append('<div id="ContextMenuFocus" class="ContextMenuItem" style="border-bottom: 1px solid gray;" >Focus</div>');
		$('#ContextMenu').append('<div id="ContextMenuCopy" class="ContextMenuItem">Copy</div>');
		$('#ContextMenu').append('<div id="ContextMenuPaste" class="ContextMenuItem">Paste</div>');
		$('#ContextMenu').append('<div id="ContextMenuDuplicate" class="ContextMenuItem" style="border-bottom: 1px solid gray;">Duplicate</div>');
		$('#ContextMenu').append('<div id="ContextMenuDelete" class="ContextMenuItem" style="border-bottom: 1px solid gray;">Delete</div>');
		
		
		$('#ContextMenu').disableSelection();
		
		$('#ContextMenuSelect').click(function()
		{
			_Editor.SelectObject($('#ContextMenuName').attr('VWFID'));
			$('#ContextMenu').hide();
			$('#ContextMenu').css('z-index','-1');
			$(".ddsmoothmenu").find('li').trigger('mouseleave');
			$('#index-vwf').focus();
		});
		
		$('#ContextMenuSelectNone').click(function()
		{
			_Editor.SelectObject(null);
			_Editor.SetSelectMode('None');
			$('#ContextMenu').hide();
			$('#ContextMenu').css('z-index','-1');
			$(".ddsmoothmenu").find('li').trigger('mouseleave');
			$('#index-vwf').focus();
		});
		$('#ContextMenuMove').click(function()
		{
			$('#MenuMove').click();
			$('#ContextMenu').hide();
			$('#ContextMenu').css('z-index','-1');
			$(".ddsmoothmenu").find('li').trigger('mouseleave');
			$('#index-vwf').focus();
		});
		$('#ContextMenuRotate').click(function()
		{
			$('#MenuRotate').click();
			$('#ContextMenu').hide();
			$('#ContextMenu').css('z-index','-1');
			$(".ddsmoothmenu").find('li').trigger('mouseleave');
			$('#index-vwf').focus();
		});
		$('#ContextMenuScale').click(function()
		{
			$('#MenuScale').click();
			$('#ContextMenu').hide();
			$('#ContextMenu').css('z-index','-1');
			$(".ddsmoothmenu").find('li').trigger('mouseleave');
			$('#index-vwf').focus();
		});
		$('#ContextMenuFocus').click(function()
		{
			$('#MenuFocusSelected').click();
			$('#ContextMenu').hide();
			$('#ContextMenu').css('z-index','-1');
			$(".ddsmoothmenu").find('li').trigger('mouseleave');
			$('#index-vwf').focus();
		});
		$('#ContextMenuCopy').click(function()
		{
			$('#MenuCopy').click();
			$('#ContextMenu').hide();
			$('#ContextMenu').css('z-index','-1');
			$(".ddsmoothmenu").find('li').trigger('mouseleave');
			$('#index-vwf').focus();
		});
		$('#ContextMenuPaste').click(function(e)
		{
			_Editor.Paste(true);
			$('#ContextMenu').hide();
			$('#ContextMenu').css('z-index','-1');
		});
		$('#ContextMenuDuplicate').click(function()
		{
			$('#MenuDuplicate').click();
			$('#ContextMenu').hide();
			$('#ContextMenu').css('z-index','-1');
			$(".ddsmoothmenu").find('li').trigger('mouseleave');
			$('#index-vwf').focus();
		});
		$('#ContextMenuDelete').click(function()
		{
			$('#MenuDelete').click();
			$('#ContextMenu').hide();
			$('#ContextMenu').css('z-index','-1');
			$(".ddsmoothmenu").find('li').trigger('mouseleave');
			$('#index-vwf').focus();
		});
		
	}
	this.getDefaultMaterial = function()
	{
		var currentmat = new THREE.MeshPhongMaterial();
		currentmat.color.r = 1;
        currentmat.color.g = 1;
        currentmat.color.b = 1;
		
		currentmat.ambient.r = 1;
        currentmat.ambient.g = 1;
        currentmat.ambient.b = 1;
		
		currentmat.emissive.r = 0;
        currentmat.emissive.g = 0;
        currentmat.emissive.b = 0;
		
		currentmat.specular.r = .5;
        currentmat.specular.g = .5;
        currentmat.specular.b = .5;
		
		currentmat.map = THREE.ImageUtils.loadTexture('checker.jpg');
		return currentmat;
	}
	this.getDefForMaterial = function(currentmat)
	{
		var value = {};
		
		value.color={}
		value.color.r = currentmat.color.r;
        value.color.g = currentmat.color.g;
        value.color.b = currentmat.color.b;
		
		value.ambient={}
		value.ambient.r = currentmat.ambient.r;
        value.ambient.g = currentmat.ambient.g;
        value.ambient.b = currentmat.ambient.b;
		
		value.emit={}
		value.emit.r = currentmat.emissive.r;
        value.emit.g = currentmat.emissive.g;
        value.emit.b = currentmat.emissive.b;
		
		value.specularColor={}
		value.specularColor.r = currentmat.specular.r;
        value.specularColor.g = currentmat.specular.g;
        value.specularColor.b = currentmat.specular.b;
		value.specularLevel = 1;
		
		var mapnames = ['map','bumpMap','lightMap','normalMap','specularMap','envMap'];
		value.layers = [];
		for(var i = 0; i < mapnames.length; i++)
		{
			var map = currentmat[mapnames[i]];
			if(map)
			{
				
				value.layers.push({});
				value.layers[i].mapTo = i+1;
				value.layers[i].scalex = map.repeat.x ;
                value.layers[i].scaley = map.repeat.y ;
                value.layers[i].offsetx = map.offset.x ;
                value.layers[i].offsety = map.offset.y ;
				if(i==1)
					value.layers[i].alpha = -currentmat.alphaTest +1 ;
				if(i==4)
					value.layers[i].alpha = currentmat.normalScale.x;
				if(i==2)
					value.layers[i].alpha = currentmat.bumpScale;
				
				value.layers[i].src	= map.image.src;
				if(map.mapping instanceof THREE.UVMapping)
					value.layers[i].mapInput = 0;
				if(map.mapping instanceof THREE.CubeReflectionMapping)
					value.layers[i].mapInput = 1;
				if(map.mapping instanceof THREE.CubeRefractionMapping)
					value.layers[i].mapInput = 2;
				if(map.mapping instanceof THREE.SphericalReflectionMapping)
					value.layers[i].mapInput = 3;
				if(map.mapping instanceof THREE.SphericalRefractionMapping)
					value.layers[i].mapInput = 4;					
			}
	
		}
		return value;
	}
	this.setMaterialByDef = function(currentmat,value)
	{
		currentmat.color.r = value.color.r;
        currentmat.color.g = value.color.g;
        currentmat.color.b = value.color.b;
		
		currentmat.ambient.r = value.ambient.r;
        currentmat.ambient.g = value.ambient.g;
        currentmat.ambient.b = value.ambient.b;
		
		currentmat.emissive.r = value.emit.r;
        currentmat.emissive.g = value.emit.g;
        currentmat.emissive.b = value.emit.b;
		
		currentmat.specular.r = value.specularColor.r * value.specularLevel;
        currentmat.specular.g = value.specularColor.g * value.specularLevel;
        currentmat.specular.b = value.specularColor.b * value.specularLevel;
		
		currentmat.opacity = value.alpha;
		if(value.alpha < 1)
			currentmat.transparent = true;
		else
			currentmat.transparent = false;
			
		currentmat.shininess = value.shininess * 5 ;
        
		var mapnames = ['map','bumpMap','lightMap','normalMap','specularMap','envMap'];
		currentmat.reflectivity = value.reflect;
        for(var i =0; i < value.layers.length; i++)
        {
				var mapname;
				if(value.layers[i].mapTo == 1)
				{
					mapname = 'map';
					
					
					currentmat.alphaTest = 1 - value.layers[i].alpha;
					
				}
				if(value.layers[i].mapTo == 2)
				{
					mapname = 'bumpMap';
					currentmat.bumpScale = value.layers[i].alpha;
				}
				if(value.layers[i].mapTo == 3)
				{
					mapname = 'lightMap';
				}	
				if(value.layers[i].mapTo == 4)
				{
					mapname = 'normalMap';
					currentmat.normalScale.x = value.layers[i].alpha;
					currentmat.normalScale.y = value.layers[i].alpha;
				}	
				if(value.layers[i].mapTo == 5)
				{
					mapname = 'specularMap';
				}
				
				if(value.layers[i].mapTo == 6)
				{
					mapname = 'envMap';
				}
				
				mapnames.splice(mapnames.indexOf(mapname),1);				
				
				String.prototype.endsWith = function(suffix) {
					return this.indexOf(suffix, this.length - suffix.length) !== -1;
				};

                if((currentmat[mapname] && currentmat[mapname].image && !currentmat[mapname].image.src.toString().endsWith(value.layers[i].src)) || !currentmat[mapname])
				{
                    currentmat[mapname] = THREE.ImageUtils.loadTexture(value.layers[i].src);
					
				}
				
				if(value.layers[i].mapInput == 0)
				{
					currentmat[mapname].mapping = new THREE.UVMapping();
				}
				if(value.layers[i].mapInput == 1)
				{
					currentmat[mapname].mapping = new THREE.CubeReflectionMapping();
				}
				if(value.layers[i].mapInput == 2)
				{
					currentmat[mapname].mapping = new THREE.CubeRefractionMapping();
				}
				if(value.layers[i].mapInput == 3)
				{
					currentmat[mapname].mapping = new THREE.SphericalReflectionMapping();
				}
				if(value.layers[i].mapInput == 4)
				{
					currentmat[mapname].mapping = new THREE.SphericalRefractionMapping();
				}
                currentmat[mapname].wrapS = THREE.RepeatWrapping;
                currentmat[mapname].wrapT = THREE.RepeatWrapping;
                currentmat[mapname].repeat.x = value.layers[i].scalex;
                currentmat[mapname].repeat.y = value.layers[i].scaley;
                currentmat[mapname].offset.x = value.layers[i].offsetx;
                currentmat[mapname].offset.y = value.layers[i].offsety;
			
        }
   		for(var i in mapnames)
		{
			currentmat[mapnames[i]] = null;
		}
		currentmat.needsUpdate = true;
	}
	this.initialize = function()
	{
		
		this.BuildMoveGizmo();
		this.SelectObject(null);
		$(document).bind('prerender',this.updateGizmoSize.bind(this));
		document.oncontextmenu = function() {return false;};
		this.SelectionBoundsContainer = new THREE.Object3D();
		this.findscene().add(this.SelectionBoundsContainer);
		this.buildContextMenu();
		
		this.mouseDownScreenPoint = [0,0];
		this.mouseUpScreenPoint = [0,0];
		
		$(document.body).append('<div id="selectionMarquee" />');
		this.selectionMarquee = $('#selectionMarquee'); 
		this.selectionMarquee.css('position','absolute');
		this.selectionMarquee.css('width','100');
		this.selectionMarquee.css('height','100');
		this.selectionMarquee.css('top','100');
		this.selectionMarquee.css('left','100');
		this.selectionMarquee.css('z-index','100');
		this.selectionMarquee.css('border','2px dotted darkslategray');
		this.selectionMarquee.css('border-radius','10px');
		//this.selectionMarquee.css('box-shadow','0px 0px 10px lightgray, 0px 0px 10px lightgray inset');
		this.selectionMarquee.mousedown(function(e){_Editor.mousedown(e);e.preventDefault();e.stopPropagation();return false;});
		this.selectionMarquee.mouseup(function(e){_Editor.mouseup(e);e.preventDefault();e.stopPropagation();return false;});
		this.selectionMarquee.mousemove(function(e){_Editor.mousemove(e);e.preventDefault();e.stopPropagation();return false;});
		
		$('body *').not(':has(input)').not('input').disableSelection();
		this.selectionMarquee.hide();
		$('#ContextMenu').hide();
	}
	
	this.GetSelectionBounds = function(){return SelectionBounds;};
	this.findscene = findscene;
	this.findcamera = findcamera;
	this.findviewnode =findviewnode;
	this.mousedown = mousedown;
	this.mousemove =mousemove;
	this.mousewheel =mousewheel;
	this.mouseup =mouseup;
	this.DeleteSelection =DeleteSelection;
	this.keydown =keydown ;
	this.intersectLinePlane =intersectLinePlane;
	this.GetCameraCenterRay =GetCameraCenterRay;
	this.GetWorldPickRay =GetWorldPickRay;
	this.Matrix =Matrix;
	this.Vec3 =Vec3;
	this.Quat =Quat;
	this.SnapTo =SnapTo;
	this.RotateAroundAxis =RotateAroundAxis;
	this.RotationToVWFAngleAxis =RotationToVWFAngleAxis;
	this.isMove =isMove;
	this.isRotate =isRotate;
	this.SetLocation =SetLocation;
	this.GetLocation =GetLocation;
	this.isScale =isScale;
	this.RotateVecAroundAxis =RotateVecAroundAxis;
	this.CreatePrim =CreatePrim;
	this.updateGizmoOrientation =updateGizmoOrientation;
	this.updateGizmoSize =updateGizmoSize;
	this.BuildMoveGizmo =BuildMoveGizmo;
	this.SetGizmoMode =SetGizmoMode;
	this.BuildRing =BuildRing;
	this.BuildBox =BuildBox;
	this.Move = Move;
	this.Rotate = Rotate;
	this.Scale = Scale;
	this.Multi = Multi;
	this.CoordSystem = CoordSystem;
	this.WorldCoords = WorldCoords;
	this.LocalCoords = LocalCoords;
	this.MoveGizmo = MoveGizmo;
	this.SelectedVWFNodes = SelectedVWFNodes;
	this.RotateSnap = RotateSnap;
	this.MoveSnap = MoveSnap;
	this.ScaleSnap = ScaleSnap;
	this.WorldZ = WorldZ;
	this.WorldY = WorldY;
	this.WorldX = WorldX;
	this.GetCurrentZ = function(){return CurrentZ};
	this.GetCurrentY = function(){return CurrentY};
	this.GetCurrentX = function(){return CurrentX};
	this.SetSelectMode = SetSelectMode;
	this.SetCoordSystem = SetCoordSystem;
	this.GetMoveGizmo = GetMoveGizmo;
	this.SetSnaps = SetSnaps;
	this.GetSelectedVWFNode = GetSelectedVWFNode;
	this.SelectObject = SelectObject;
	this.Copy = Copy;
	this.click=click;
	this.Paste = Paste;
	this.Duplicate = Duplicate;
	this.CreateModifier = CreateModifier;
	this.GetRotationMatrix = GetRotationMatrix;
	this.updateBoundsAndGizmoLoc = updateBoundsAndGizmoLoc;
	this.keyup = keyup;
	this.GetSelectMode = function(){return SelectMode;}
	this.getViewProjection = getViewProjection;
	
	

	//$(document).bind('prerender',this.rt.bind(this));
}

function FindMaxMin(positions)
{

	var min = [Infinity,Infinity,Infinity];
	var max = [-Infinity,-Infinity,-Infinity];
	
	for(var i =0; i<positions.length-2; i+=3)
	{	
		var vert = [positions[i],positions[i+1],positions[i+2]];
		if(vert[0] > max[0]) max[0] = vert[0];
		if(vert[1] > max[1]) max[1] = vert[1];
		if(vert[2] > max[2]) max[2] = vert[2];
		
		if(vert[0] < min[0]) min[0] = vert[0];
		if(vert[1] < min[1]) min[1] = vert[1];
		if(vert[2] < min[2]) min[2] = vert[2];
	}
	return [min,max];
}

function TransformBoundingBox(matrix,bb)
{


	var mat = matCpy(matrix.elements);
	mat = GLGE.transposeMat4(mat);
	
	//mat = GLGE.inverseMat4(mat); 
	
	var points = [];
	var allpoints = [];
	var min = bb.min;
	var max = bb.max;
	//list of all corners
	points.push([min.x,min.y,min.z]);
	points.push([min.x,min.y,max.z]);
	points.push([min.x,max.y,min.z]);
	points.push([min.x,max.y,max.z]);
	points.push([max.x,min.y,min.z]);
	points.push([max.x,min.y,max.z]);
	points.push([max.x,max.y,min.z]);
	points.push([max.x,max.y,max.z]);
	for(var i = 0; i < points.length; i++)
	{
		//transform all points
		allpoints = allpoints.concat(GLGE.mulMat4Vec3(mat,points[i]));
	}
	//find new axis aligned bounds
	var bounds = FindMaxMin(allpoints);
	var min2 = bounds[0];
	var max2 = bounds[1];
	return {min:new THREE.Vector3(min2[0],min2[1],min2[2]),max:new THREE.Vector3(max2[0],max2[1],max2[2])}



}

THREE.Object3D.prototype.getBoundingBoxes = function(bbxes,donttransform){
  var object = this;
  if(object.geometry){
	object.geometry.computeBoundingBox();
	var bb = object.geometry.boundingBox;
		if(!donttransform)
			bb = TransformBoundingBox(this.matrix,bb);
    bbxes.push(bb);
  }else{
    for(i in object.children){
      child = object.children[i];
	  var bbs = [];
      child.getBoundingBoxes(bbs);
	  if(!donttransform)
	  {
		for(var i =0; i < bbs.length; i++)
			bbs[i] = TransformBoundingBox(this.matrix,bbs[i]);
	  }
	  for(var i = 0; i < bbs.length; i++)
	  bbxes.push(bbs[i]);
    }
  }
}

THREE.Object3D.prototype.getBoundingBox = function(donttransform){

  var object = this;
     var boundingBox = {};
    var max = new THREE.Vector3(-Infinity,-Infinity,-Infinity);
    var min = new THREE.Vector3(Infinity,Infinity,Infinity);
    var bboxes = [];
    object.getBoundingBoxes(bboxes,donttransform);
    for(i in bboxes){
      var bbox = bboxes[i];
      var bbmin = bbox.min;
      var bbmax = bbox.max;
      if(bbmin.x < min.x){ min.x = bbmin.x; }
      if(bbmin.y < min.y){ min.y = bbmin.y; }
      if(bbmin.z < min.z){ min.z = bbmin.z; }
      if(bbmax.x > max.x){ max.x = bbmax.x; }
      if(bbmax.y > max.y){ max.y = bbmax.y; }
      if(bbmax.z > max.z){ max.z = bbmax.z; }
    }
    boundingBox.max = max;
    boundingBox.min = min;
    object.boundingBox = boundingBox;
    return object.boundingBox;
  
}

_Editor = new Editor();
_Editor.initialize();