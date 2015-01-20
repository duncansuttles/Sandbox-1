
var NUM_FLAMETHROWERS = 8;
var NUM_TRAPDOORS = 10;
var NUM_WAYPOINTS = 5;
var NUM_LASERS = 5;
var NUM_ENEMIES = 5;

//enum
var WAYPOINT = 0;
var FLAMETHROWER = 1;
var TRAPDOOR = 2;
var LASER = 3;
var ENEMY = 4;

hideTools();
$(document.body).append('<div id="gameEditGUI"></div>')
$('#gameEditGUI').dialog({
	title:'Edit Game Board',
	autoOpen:true,
	position:[50,100],
	height:'auto',
	width:400
});

$(document.body).append('<link rel="stylesheet" type="text/css" href="../examples/arcade/styles.css">');

$(document.head).append('<script type="text/javascript" src="../examples/arcade/tutorial.js">')

$('#gameEditGUI').parent().find('.ui-dialog-titlebar button').css('display','none');
$('#gameEditGUI').append('<div id="undoButton">Undo</div>');
$('#gameEditGUI').append('<div id="clearButton">Clear</div>');
$('#gameEditGUI').append('<div id="gamePlayButton">Play/Pause</div>');
$('#gameEditGUI').append('<div id="OverheadCam">OverheadCam</div>');
$('#gameEditGUI').append('<div id="TopCam">TopCam</div>');
$('#gameEditGUI').append('<div id="ChaseCam">ChaseCam</div>');

$('#OverheadCam').button();
$('#TopCam').button();
$('#ChaseCam').button();

$('#OverheadCam').click(function(){
  
  _dView.setCamera("SandboxCamera-vwf-58faf29-3658-392-e779-44d7f701f192")
});

$('#TopCam').click(function(){
  _dView.setCamera("SandboxCamera-vwf-24623952-8037-e5d2-7651-8bc5b9a26b5a")
});

$('#ChaseCam').click(function(){
  
  _dView.setCamera("SandboxCamera-vwf-1e8f40f1-7ad6-f731-62d0-65bccbc91286")
});

vwf_view.calledMethod = function(nodeID,methodName)
{
    
     if(methodName == 'Die')
     {
      _Tutorial.died();
     }
     if(methodName == 'Win')
     {
      _Tutorial.win();
     }
     if(methodName == 'playWinSound')
      _Tutorial.won();
}
vwf_view.satProperty = function(id,prop,val)
{
  _Tutorial.satProperty(id,prop,val);
  if(id == vwf.application() && prop == 'playMode' && val == 'play')
  {
     
    $('.blockTray').css('opacity',.3);
    $('.blockTray').css('pointer-events','none');
    $('#gameEditGUI').parent().css('border','none');
    $('#gameEditGUI').parent().css('background','none');
    $('#gameEditGUI').parent().children(":not(#gameEditGUI)").css('display','none');
    $('#gameEditGUI').children(":not(#gamePlayButton)").css('display','none');
    $('#gameEditGUI').dialog('option','position',[0,0]);
   $('#gamePlayButton span').text('pause');
     
  }
  if(id == vwf.application() && prop == 'playMode' && val != 'play')
  {
     
    $('.blockTray').css('opacity','');
    $('.blockTray').css('pointer-events','');
    $('#gameEditGUI').parent().css('border','');
    $('#gameEditGUI').parent().css('background','');
    $('#gameEditGUI').parent().children(":not(#gameEditGUI)").css('display','');
    $('#gameEditGUI').children(":not(#gamePlayButton)").css('display','');
   $('#gamePlayButton span').text('play');
  }


}


$('#gamePlayButton').button();
$('#gamePlayButton').click(function()
{

  if(vwf.getProperty(vwf.application(),'playMode') == 'play')
  {
     _Publisher.stopWorld();
    _Tutorial.paused(); 

  }else
  {
    _Publisher.playWorld();
    _Tutorial.played();
  }



});

$('#undoButton').button();
$('#undoButton').click(function()
	{
		_UndoManager.undo();
    _Tutorial.undid();
		var lastAction = undoStack.pop();
		if(lastAction == TRAPDOOR)
			$($('.createDoor:hidden')[0]).css('display','inline-block');
		if(lastAction == FLAMETHROWER)
			$($('.createFire:hidden')[0]).css('display','inline-block');
		if(lastAction == WAYPOINT)
			$($('.createWaypoint:hidden')[0]).css('display','inline-block');
		if(lastAction == LASER)
			$($('.createLaser:hidden')[0]).css('display','inline-block');
		if(lastAction == ENEMY)
			$($('.createEnemy:hidden')[0]).css('display','inline-block');

		$('#index-vwf').focus();
	});
$('#clearButton').button();
$('#clearButton').click(function()
	{
    _Tutorial.cleared();
		var objects = vwf.models.object.objects;
		$('.createWaypoint').css('display','inline-block');
		$('.createFire').css('display','inline-block');
		$('.createDoor').css('display','inline-block');
		$('.createLaser').css('display','inline-block');
		$('.createEnemy').css('display','inline-block');

		for(var i in objects)
		{
			var gameType = vwf.getProperty(i,'GameType');
			if(gameType == 'TrapDoor' || gameType == 'FlameThrower' || gameType == 'WayPoint' || gameType == 'Laser' || gameType == 'Enemy' )
			{
				vwf_view.kernel.deleteNode(i);
			}
		}
		$('#index-vwf').focus();
	});

$('#gameEditGUI').append('<div id="fireBlocks" class="blockTray" style=""></div>');
$('#gameEditGUI').append('<div id="doorBlocks" class="blockTray" style=""></div>');
$('#gameEditGUI').append('<div id="waypointBlocks" class="blockTray" style=""></div>');
$('#gameEditGUI').append('<div id="laserBlocks" class="blockTray" style=""></div>');
$('#gameEditGUI').append('<div id="enemyBlocks" class="blockTray" style=""></div>');

for(var i =0; i < NUM_FLAMETHROWERS; i++)
	$('#fireBlocks').append('<div class="gameObject createFire"  draggable="true" style="">Flame Thrower</div>');

for(var i =0; i < NUM_TRAPDOORS; i++)
	$('#doorBlocks').append('<div class="gameObject createDoor"  draggable="true" style="">Trap Door</div>');

for(var i =0; i < NUM_WAYPOINTS; i++)
	$('#waypointBlocks').append('<div class="gameObject createWaypoint"  draggable="true" style="">Way Point</div>');

for(var i =0; i < NUM_LASERS; i++)
	$('#laserBlocks').append('<div class="gameObject createLaser"  draggable="true" style="">Laser</div>');

for(var i =0; i < NUM_ENEMIES; i++)
	$('#enemyBlocks').append('<div class="gameObject createEnemy"  draggable="true" style="">Enemy</div>');



ADL.XAPIWrapper.changeConfig(
    {
        endpoint: 'https://lrs.adlnet.gov/xapi/',
        user: 'IFestGame',
        password: 'UQw9Sw*FcZlM'
    });

function postCreateEvent(Type,Name,Position)
{
	var agentId = {
	    'homePage': 'http://vwf.adlnet.gov',
	    'name': _UserManager.GetCurrentUserName()
	};
	var worldId = 'http://vwf.adlnet.gov/xapi/'+ _DataManager.getCurrentSession().slice(-17,-1);
	var creationId = worldId+'/'+Name;
	var statement = new ADL.XAPIStatement(
		new ADL.XAPIStatement.Agent(agentId, agentId.name),
        new ADL.XAPIStatement.Verb('http://vwf.adlnet.gov/xapi/verbs/rezzed', 'rezzed'),
        new ADL.XAPIStatement.Activity(creationId, Name)
    );
	statement.addParentActivity(new ADL.XAPIStatement.Activity(worldId, _DataManager.getInstanceData().title || 'tempPublish'));
    statement.context.extensions = 
    {
        "http://vwf.adlnet.gov/xapi/IFestGame2014": {'GameType':Type},
        "http://vwf.adlnet.gov/xapi/extensions/location": {
			'x': Position[0],
			'y': Position[1],
			'z': Position[2]
		}
    };
	ADL.XAPIWrapper.sendStatement(statement);
}


$(document).on('setstatecomplete')
{

		var objects = vwf.models.object.objects;
		$('.createWaypoint').css('display','inline-block');
		$('.createFire').css('display','inline-block');
		$('.createDoor').css('display','inline-block');

		for(var i in objects)
		{
			var gameType = vwf.getProperty(i,'GameType');
			if(gameType == 'TrapDoor') 
			{
				$($('.createDoor:visible')[0]).css('display','none');
			}
			if(gameType == 'FlameThrower') 
			{
				$($('.createFire:visible')[0]).css('display','none');
			}
			if(gameType == 'WayPoint') 
			{
				$($('.createWaypoint:visible')[0]).css('display','none');
			}
			if(gameType == 'Laser') 
			{
				$($('.createLaser:visible')[0]).css('display','none');
			}
			if(gameType == 'Enemy') 
			{
				$($('.createEnemy:visible')[0]).css('display','none');
			}


		}
		$('#index-vwf').focus();
    _Tutorial.runTutorial();

}

var dragElement = null;
var undoStack = [];
for(var i =0; i < $('.createFire').length; i ++)
$('.createFire')[i].ondragstart = function(){

	dragElement = this;
	$('#index-vwf')[0].ondrop = dropFire;
	return true;
}
for(var i =0; i < $('.createWaypoint').length; i ++)
$('.createWaypoint')[i].ondragstart = function(){

	dragElement = this;
	$('#index-vwf')[0].ondrop = dropWaypoint;
	return true;
}
for(var i =0; i < $('.createDoor').length; i ++)
$('.createDoor')[i].ondragstart = function(){

	dragElement = this;
	$('#index-vwf')[0].ondrop = dropDoor;
	return true;
}

for(var i =0; i < $('.createLaser').length; i ++)
$('.createLaser')[i].ondragstart = function(){

	dragElement = this;
	$('#index-vwf')[0].ondrop = dropLaser;
	return true;
}

for(var i =0; i < $('.createEnemy').length; i ++)
$('.createEnemy')[i].ondragstart = function(){

	dragElement = this;
	$('#index-vwf')[0].ondrop = dropEnemy;
	return true;
}

var fireTrap = {
  "extends": "cone2.vwf",
  "source": "vwf/model/threejs/cone.js",
  "type": "subDriver/threejs",
  "properties": {
    "GameType": "FlameThrower",
    "transform": [
      1,
      0,
      0,
      0,
      0,
      7.363584586528304E-8,
      -0.9999998211860657,
      0,
      0,
      0.9999998211860657,
      7.363584586528304E-8,
      0,
      -4.87399959564209,
      -5.999998569488525,
      0.5040001273155212,
      1
    ],
    "materialDef": {
      "shininess": 15,
      "alpha": 1,
      "ambient": {
        "r": 0.5803921568627451,
        "g": 0.03529411764705882,
        "b": 0.03529411764705882
      },
      "color": {
        "r": 0.5803921568627451,
        "g": 0.03529411764705882,
        "b": 0.03529411764705882,
        "a": 1
      },
      "emit": {
        "r": 1,
        "g": 0,
        "b": 0
      },
      "reflect": 0.8,
      "shadeless": false,
      "shadow": true,
      "specularColor": {
        "r": 0.5773502691896258,
        "g": 0.5773502691896258,
        "b": 0.5773502691896258
      },
      "specularLevel": 1,
      "layers": [],
      "morphTargets": false,
      "skinning": false,
      "type": "phong"
    },
    "size": [
      0.5,
      1,
      0.5
    ],
    "translation": [
      -4.87399959564209,
      -5.999998569488525,
      0.5040001273155212
    ],
    "scale": [
      1,
      0.9999998211860657,
      0.9999998211860657
    ],
    "rotation": [
      -1,
      0,
      0,
      89.99999237060547
    ],
    "owner":"vergenzs",
    "texture": "checker.jpg",
    "type": "Primitive",
    "tempid": "",
    "DisplayName": "cone1",
    "quaternion": [
      -0.7071067690849304,
      0,
      0,
      0.7071068286895752
    ],
    "height": 0.16,
    "radius": 0.1
  },
  "children": {
    "be1fabc2-1784-b4e8-ea76-c326bcc5600e": {
      "extends": "SandboxParticleSystem.vwf",
      "properties": {
        "owner":"vergenzs",
        "type": "ParticleSystem",
        "DisplayName": "ParticleSystem1",
        "transform": [
          0.9999998807907104,
          3.0720584801339438E-15,
          4.1719598442568895E-8,
          0,
          1.321999049130624E-15,
          1.000000238418579,
          -8.121186567677796E-8,
          0,
          -4.171959133714154E-8,
          8.12118585713506E-8,
          1.0000001192092896,
          0,
          0.015921633690595627,
          0.017000118270516396,
          -0.09707215428352356,
          1
        ],
        "minVelocity": [
          0.004,
          0.004,
          0.064
        ],
        "maxVelocity": [
          -0.007,
          -0.007,
          0.084
        ],
        "image": "/adl/sandbox/DnNE31e3uvYptRYw//vwfDataManager.svc/texture?UID=fire.png",
        "depthTest": false,
        "additive": true,
        "startSize": 0.18,
        "minLifeTime": 48,
        "maxLifeTime": 91,
        "endSize": 0.46,
        "counter": 293654,
        "visible": false,
        "minAcceleration": [
          0,
          0,
          -0.001
        ],
        "maxAcceleration": [
          0,
          0,
          -0.001
        ],
        "minOrientation": -17.9,
        "maxOrientation": 13.4,
        "endColor": [
          0,
          0,
          0,
          0.6
        ],
        "endAlpha": 0.6,
        "solver": "AnalyticShader"
      },
      "methods": {
        "makeFlameSound": {
          "body": "  this.audioAPI.stopSound(\"../examples/arcade/flame.mp3\");\n        this.audioAPI.playSound(\"../examples/arcade/flame.mp3\", false, 100);\n",
          "parameters": []
        },
        "tick": {
          "body": " if (this.Scene.children_by_name.GameCode.paused === true) return;\n\n     var localPlayer = this.transformAPI.globalToLocal(this.Scene.children_by_name.Player.transformAPI.getPosition());\n\n                                                                            if (Math.abs(localPlayer[0]) < 1.5 && Math.abs(localPlayer[1]) < 1.5 && localPlayer[2] > -1 && localPlayer[2] < 6)\n                                                                            {\n                                                                                this.counter++;\n                                                                                if (Math.sin(this.counter / 10) > 0)\n                                                                                {\n                                                                                    if (this.visible == false)\n                                                                                        this.makeFlameSound();\n                                                                                    this.visible = true;\n                                                                                }\n                                                                                else\n                                                                                    this.visible = false;\n                                                                            }\n                                                                            else\n                                                                                this.visible = false;\n\n                                                                            if (Math.abs(localPlayer[0]) < .4 && Math.abs(localPlayer[1]) < .4 && localPlayer[2] > -.2 && localPlayer[2] < 3.5 && this.visible === true)\n                                                                            {\n                                                                                this.Scene.children_by_name.GameCode.postDeath(this.parent.DisplayName);\n                                                                                this.Scene.children_by_name.Player.Die();\n                                                                       }\n",
          "parameters": []
        }
      }
    }
  }
}
var doorTrap = {"extends":"box2.vwf","methods":{"makeGateSound":{"body":"\n\n    //this.audioAPI.stopSound(\"../examples/arcade/XAPIGame.boochch.mp3\");\n        this.audioAPI.playSound(\"../examples/arcade/boochch.mp3\", false, 100);\n","parameters":[]},"tick":{"body":"\n  if (this.Scene.children_by_name.GameCode.paused === true) return;\n\n      if (Vec3.distance(this.transformAPI.getPosition(), this.Scene.children_by_name.Player.transformAPI.getPosition()) < 1.5)\n      {\n          this.counter += 1;\n          var trans = this.transformAPI.getPosition();\n          trans[2] = .5 + (Math.sin(this.counter / 3) + 1) / 2;\n          this.transformAPI.setPosition(trans);\n          if (trans[2] > .5 && trans[2] < .505)\n              this.makeGateSound();\n          if (Vec3.distance(this.transformAPI.getPosition(), this.Scene.children_by_name.Player.transformAPI.getPosition()) < .45)\n          {\n              this.Scene.children_by_name.Player.Die();\n              this.Scene.children_by_name.GameCode.postDeath(this.DisplayName);\n          }\n      }\n","parameters":[]}},"properties":{"DisplayName":"Trapdoor1","GameType":"TrapDoor","___physics_activation_state":1,"___physics_deactivation_time":0,"___physics_velocity_angular":[0,0,0],"___physics_velocity_linear":[0,0,0],"_length":0.12,"counter":35178,"materialDef":{"alpha":1,"ambient":{"b":0.588235294117647,"g":0.588235294117647,"r":0.588235294117647},"color":{"a":1,"b":0.588235294117647,"g":0.588235294117647,"r":0.588235294117647},"emit":{"b":0,"g":0,"r":0},"layers":[{"alpha":1,"blendMode":0,"mapInput":0,"mapTo":1,"offsetx":0,"offsety":0,"rot":0,"scalex":1,"scaley":1,"src":"/adl/sandbox/DnNE31e3uvYptRYw//vwfDataManager.svc/texture?UID=\\wests_textures\\paneling.png"}],"morphTargets":false,"reflect":0.8,"shadeless":false,"shadow":true,"shininess":15,"skinning":false,"specularColor":{"b":0.577350269189626,"g":0.577350269189626,"r":0.577350269189626},"specularLevel":1,"type":"phong"},"owner":"Rob","quaternion":[0,0,1,0],"rotation":[0,0,1,180],"scale":[1.00000011920929,1.00000011920929,1],"size":[1,1,1],"tempid":"","texture":"checker.jpg","transform":[0,-1,0,0,1,0,0,0,0,0,1,0,-6.300577163696289,-4.606511116027832,0.5,1],"translation":[-6.3005771083613,-4.60651091501668,0.5],"type":"Primitive","width":0.98},"random":{"c":1,"s0":0.293148491997272,"s1":0.230744849890471,"s2":0.98613961506635},"sequence":0,"source":"vwf/model/threejs/box.js","type":"subDriver/threejs"};
var wayPoint = {"extends":"cylinder2.vwf","source":"vwf/model/threejs/cylinder.js","type":"subDriver/threejs","sequence":0,"random":{"s0":0.16833227220922709,"s1":0.4437819307204336,"s2":0.8111532814800739,"c":1},"properties":{"GameType":"WayPoint","materialDef":{"alpha":1,"ambient":{"b":1,"g":1,"r":1},"color":{"a":1,"b":1,"g":1,"r":1},"emit":{"b":0,"g":0,"r":0},"layers":[{"offsetx":0,"offsety":0,"scalex":1,"scaley":1,"rot":0,"blendMode":0,"mapTo":1,"mapInput":0,"alpha":1,"src":"../examples/arcade/teleport.png"}],"morphTargets":false,"reflect":0.8,"shadeless":false,"shadow":true,"shininess":15,"skinning":false,"specularColor":{"b":0.577350269189626,"g":0.577350269189626,"r":0.577350269189626},"specularLevel":1,"type":"phong"},"size":[1,0.5,0.5],"translation":[-2.914514277695916,-2.5775688933245835,0.15],"owner":"Rob","texture":"checker.jpg","type":"Primitive","tempid":"","DisplayName":"WayPoint1","transform":[1,0,0,0,0,1,0,0,0,0,1,0,-2.9145143032073975,-2.577569007873535,0.15000000596046448,1],"quaternion":[0,0,0,1],"radius":0.48,"height":0.13,"rsegs":16},"children":{"480b8be3-a19-e97a-500a-5ae37b54202b":{"id":"SandboxParticleSystem-vwf-480b8be3-a19-e97a-500a-5ae37b54202b","extends":"SandboxParticleSystem.vwf","sequence":0,"random":{"s0":0.9608409397769719,"s1":0.8240233536344022,"s2":0.6333122481592,"c":1},"properties":{"owner":"vergenzs","type":"ParticleSystem","DisplayName":"ParticleSystem4","transform":[-4.171958423171418e-8,-0.9999998807907104,7.915092599354231e-15,0,0.999919056892395,-4.1716212706433e-8,-0.012740704230964184,0,0.012740678153932095,-5.315541895534182e-10,0.9999189972877502,0,0.0068735480308532715,-0.012549042701721191,0.7300000786781311,1],"minVelocity":[0.027,0.03,0.012],"maxVelocity":[-0.033,-0.037,0.012],"image":"../examples/arcade/spark.jpg","depthTest":false,"additive":true,"startSize":0.16,"minLifeTime":38,"maxLifeTime":40,"endSize":0.46,"counter":298728,"visible":false,"minAcceleration":[0,0,-0.001],"maxAcceleration":[0,0,-0.001],"minOrientation":-17.9,"maxOrientation":13.4,"endColor":[0,0,0,0.6],"solver":"AnalyticShader","startColor":[0.254901960784314,0.4,0.980392156862745,0.45],"active":true,"alphaTest":0.255},"methods":{"makeRingSound":{"body":"\n\n\n\n\n\n\n                this.audioAPI.stopSound(\"../examples/arcade/ring.mp3\");\n                      this.audioAPI.playSound(\"../examples/arcade/ring.mp3\", false, 100);\n","parameters":[]},"reset":{"body":"\n\n\n\n\n          this.active = true;\n              this.visible = false;\n","parameters":[]},"tick":{"body":"\n\n    if (this.Scene.children_by_name.GameCode.paused === true) return;\n\n        var localPlayer = this.transformAPI.globalToLocal(this.Scene.children_by_name.Player.transformAPI.getPosition());\n\n        if (Vec3.magnitude(localPlayer) < .5)\n        {\n            if (this.visible == false)\n            {\n                this.active = false;\n                this.Scene.children_by_name.GameCode.postWaypoint(this.parent.DisplayName); this.makeRingSound();\n            }\n            this.visible = true;\n        }\n","parameters":[]}}},"ba57cdc0-69b4-3292-c4cb-ec04c06254f0":{"id":"uvmap-vwf-ba57cdc0-69b4-3292-c4cb-ec04c06254f0","extends":"uvmap.vwf","source":"vwf/model/threejs/uvmap.js","type":"subDriver/threejs","sequence":0,"random":{"s0":0.03435761807486415,"s1":0.7066649086773396,"s2":0.031324582640081644,"c":1},"properties":{"NotProto":"NOT!","translation":[0,0,0],"owner":"Rob","type":"modifier","DisplayName":"uvmap3","transform":[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],"quaternion":{"0":0,"1":0,"2":0,"3":1},"mode":"plane","plane":"y","_length":2.19,"height":2.32,"uoffset":0.34,"voffset":-0.07}}}};
var laserTrap = {"extends": "cone2.vwf", "source": "vwf/model/threejs/cone.js", "type": "subDriver/threejs", "properties": {"GameType": "Laser", "transform": [-3.58659268950845E-10, 0, 1, 0, -0.79181307554245, -0.6097365021705627, -2.839905255402897E-10, 0, 0.6091272234916687, -0.7926051616668701, 2.1846846554041122E-10, 0, 0.15271449089050293, 0.9135131239891052, 0.5, 1 ], "materialDef": {"shininess": 15, "alpha": 1, "ambient": {"r": 0.34509803921568627, "g": 0.0392156862745098, "b": 1 }, "color": {"r": 0.34509803921568627, "g": 0.0392156862745098, "b": 1, "a": 1 }, "emit": {"r": 0.17647058823529413, "g": 0.0392156862745098, "b": 0.9686274509803922 }, "reflect": 0.8, "shadeless": false, "shadow": true, "specularColor": {"r": 0.5773502691896258, "g": 0.5773502691896258, "b": 0.5773502691896258 }, "specularLevel": 1, "layers": [], "morphTargets": false, "skinning": false, "type": "phong", "metal": false, "blendMode": 1 }, "size": [0.5, 1, 0.5 ], "translation": [0.15271449089050293, 0.9135131239891052, 0.5 ], "scale": [1, 0.9993730783462524, 0.9996293783187866 ], "rotation": [0.6678335666656494, -0.3286285400390625, 0.6678335666656494, 143.61599731445312 ], "owner":"vergenzs", "texture": "checker.jpg", "type": "Primitive", "tempid": "", "DisplayName": "Laser", "quaternion": [0.6344523429870605, -0.3122022747993469, 0.6344523429870605, 0.3122022747993469 ], "height": 0.53, "radius": 0.1 }, "children": {"df6a4edc-23a7-e944-48b4-b93e76c34889": {"extends": "SandboxParticleSystem.vwf", "properties": {"owner":"vergenzs", "type": "ParticleSystem", "DisplayName": "ParticleSystem1", "transform": [0.9999998807907104, 3.0720584801339438E-15, 4.1719598442568895E-8, 0, 1.321999049130624E-15, 1.000000238418579, -8.121186567677796E-8, 0, -4.171959133714154E-8, 8.12118585713506E-8, 1.0000001192092896, 0, 0.015921633690595627, 0.017000118270516396, -0.09707215428352356, 1 ], "minVelocity": [0, 0, 0.064 ], "maxVelocity": [0, 0, 0.084 ], "image": "../examples/arcade/spark.jpg", "depthTest": false, "additive": true, "startSize": 0.18, "minLifeTime": 23, "maxLifeTime": 23, "endSize": 0.19, "counter": 294588, "visible": true, "minAcceleration": [0, 0, 0 ], "maxAcceleration": [0, 0, 0 ], "minOrientation": -30, "maxOrientation": -30, "endColor": [0.058823529411764705, 0.058823529411764705, 1, 0.6 ], "endAlpha": 0.6, "solver": "AnalyticShader", "alphaTest": 0, "endColor_noAplha": [0.058823529411764705, 0.058823529411764705, 1 ], "textureTiles": 1, "emitterType": "sphere", "emitterSize": [1, 1, 0 ], "startColor": [0.49019607843137253, 0, 0.9490196078431372, 1 ], "startColor_noAplha": [0.49019607843137253, 0, 0.9490196078431372 ] }, "methods": {"makeFlameSound": {"body": "\n    this.audioAPI.stopSound(\"../examples/arcade/flame.mp3\");\n          this.audioAPI.playSound(\"../examples/arcade/flame.mp3\", false, 100);\n", "parameters": [] }, "tick": {"body": "\n  if (this.Scene.children_by_name.GameCode.paused === true) return;\n\n      var localPlayer = this.transformAPI.globalToLocal(this.Scene.children_by_name.Player.transformAPI.getPosition());\n\n      if (Math.abs(localPlayer[0]) < .1 && Math.abs(localPlayer[1]) < .1 && localPlayer[2] > -.2 && localPlayer[2] < 3 && this.visible === true)\n      {\n          this.Scene.children_by_name.GameCode.postDeath(this.parent.DisplayName);\n          this.Scene.children_by_name.Player.Die();\n      }\n", "parameters": [] } } }, "9c06dc7f-f09f-82b9-1a30-60a3da102b01": {"extends": "rotator.vwf", "properties": {"owner":"vergenzs", "type": "behavior", "DisplayName": "rotator3", "Local": true, "Axis": "Y", "Active": true } } } }
var Enemy = {"children":{"495413d6-96db-1c5-da53-96b765f36934":{"children":{"a6beca7a-fa1b-52d1-77ae-a55d546d5002":{"extends":"asset.vwf","properties":{"___physics_activation_state":1,"___physics_deactivation_time":0,"___physics_velocity_angular":[0,0,0],"___physics_velocity_linear":[0,0,0],"materialDef":{"alpha":1,"ambient":{"b":1,"g":1,"r":1},"color":{"b":1,"g":1,"r":1},"emit":{"b":0,"g":0,"r":0},"layers":[{"alpha":1,"mapInput":0,"mapTo":1,"offsetx":0,"offsety":0,"scalex":1,"scaley":1,"src":"../examples/arcade/policecar.png"}],"morphTargets":false,"reflect":0,"shininess":1,"side":0,"skinning":false,"specularColor":{"b":1,"g":1,"r":1},"specularLevel":1,"type":"phong"},"owner":"Rob","transform":[6.735213081698888e-11,-0.39993909001350403,0.006980963051319122,0,1.2635426038798414e-10,0.0069635105319321156,0.39893922209739685,0,-0.4000000059604645,-6.513115741180187e-11,1.2782709613023968e-10,0,0,0,-0.3349999785423279,1]},"random":{"c":1,"s0":0.953633794793859,"s1":0.951581143541262,"s2":0.0818706699647009},"sequence":0,"source":"../examples/arcade/PoliceCar.json","type":"subDriver/threejs/asset/vnd.osgjs+json+compressed"}},"extends":"sphere2.vwf","properties":{"DisplayName":"Ship","___physics_activation_state":1,"___physics_deactivation_time":0,"___physics_velocity_angular":[0,0,0],"___physics_velocity_linear":[0,0,0],"materialDef":{"alpha":1,"ambient":{"b":1,"g":1,"r":1},"color":{"a":1,"b":1,"g":1,"r":1},"emit":{"b":0,"g":0,"r":0},"layers":[{"alpha":1,"blendMode":0,"mapInput":0,"mapTo":1,"offsetx":0,"offsety":0,"rot":0,"scalex":1,"scaley":1,"src":"checker.jpg"}],"morphTargets":false,"reflect":0.8,"shadeless":false,"shadow":true,"shininess":15,"skinning":false,"specularColor":{"b":0.577350269189626,"g":0.577350269189626,"r":0.577350269189626},"specularLevel":1,"type":"phong"},"owner":"Rob","radius":0.23,"size":[0.5,1,1],"tempid":"","texture":"checker.jpg","transform":[-1,0,0,0,0,-1,0,0,0,0,1,0,0,0,0,1],"type":"Primitive","visible":false},"random":{"c":1,"s0":0.216963760089129,"s1":0.302025123033673,"s2":0.709411301417276},"sequence":0,"source":"vwf/model/threejs/sphere.js","type":"subDriver/threejs"}},"extends":"sphere2.vwf","methods":{"doMove":{"body":"\n\n\n\n\n\n\n\n\n\n                    this.transformAPI.move(x, y, z);\n                        this.children_by_name.Ship.transformAPI.lookat([x*100,y*100,0],'','X','Z');\n","parameters":["x","y","z"]},"reset":{"body":"\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n                                                      if(this.startingLocation)\n                                                          {\n                                                              this.transformAPI.setPosition(this.startingLocation);   \n                                                          }\n","parameters":[]},"tick":{"body":"\n\n\n\n\n\n\n\n\n\n                    if (this.Scene.children_by_name.GameCode.paused === true) return;\n                        //This function was created for you by the system. \n                        //The tick function is called 20 times every second. \n                        // Write code here to animate over time\n                        var toPlayer = Vec3.subtract(this.Scene.children_by_name.Player.transformAPI.getPosition(), this.transformAPI.getPosition(), []);\n                        var hits = this.Scene.traceAPI.rayCast(this.transformAPI.getPosition(), toPlayer,\n                        {\n                            ignore: [this.id]\n                        });\n                        if (!this.sign)\n                            this.sign = function(num)\n                            {\n                                return num > 0 ? 1 : -1;\n                        }\n\n                        if (Vec3.distance(this.transformAPI.getPosition(), this.Scene.children_by_name.Player.transformAPI.getPosition()) < .74)\n                        {\n\n                            if (hits.node == this.Scene.children_by_name.Player)\n                            {\n                                this.Scene.children_by_name.Player.Die();\n                                this.Scene.children_by_name.GameCode.postDeath(this.DisplayName);\n                            }\n                        }\n                        else if (Vec3.distance(this.transformAPI.getPosition(), this.Scene.children_by_name.Player.transformAPI.getPosition()) < 4)\n                        {\n                            var max = Math.max(Math.abs(toPlayer[0]), Math.abs(toPlayer[1]), Math.abs(toPlayer[2]));\n                            if (max == Math.abs(toPlayer[0]))\n                                if (this.tryMove([this.sign(toPlayer[0]) / 10, 0, 0]))\n                                    this.doMove(this.sign(toPlayer[0]) / 10, 0, 0);\n                                else if (this.tryMove([0, this.sign(toPlayer[1]) / 10, 0]))\n                                this.doMove(0, this.sign(toPlayer[1]) / 10, 0);\n                            if (max == Math.abs(toPlayer[1]))\n                                if (this.tryMove([0, this.sign(toPlayer[1]) / 10, 0]))\n                                   this.doMove(0, this.sign(toPlayer[1]) / 10, 0);\n                                else if (this.tryMove([this.sign(toPlayer[0]) / 10, 0, 0]))\n                                this.doMove(this.sign(toPlayer[0]) / 10, 0, 0);\n\n                        }\n","parameters":[]},"tryMove":{"body":"\n  if (Vec3.magnitude(dir) == 0) return false;\n\n      var transform = this.transformAPI.getPosition();\n      var newpos = Vec3.add(transform, dir, []);\n      var hits = _SceneManager.SphereCast(newpos, .3,\n      {\n          OneHitPerMesh: true,\n          ignore: [_dSky, _Editor.findviewnode(this.id), _Editor.findviewnode(\"sandboxGroup-vwf-ff144e59-a5d8-d4b0-94ed-641a4d60d49\")]\n      });\n\n      if (hits && hits.length)\n      {\n\n          return false;\n      }\n      return true;\n","parameters":["dir"]}},"properties":{"DisplayName":"Enemy1","GameType":"Enemy","___physics_activation_state":1,"___physics_deactivation_time":0,"___physics_velocity_angular":[0,0,0],"___physics_velocity_linear":[0,0,0],"materialDef":{"alpha":1,"ambient":{"b":0.0745098039215686,"g":0.0745098039215686,"r":0.941176470588235},"color":{"a":1,"b":0.0745098039215686,"g":0.0745098039215686,"r":0.941176470588235},"emit":{"b":0,"g":0,"r":0},"layers":[{"alpha":1,"blendMode":0,"mapInput":0,"mapTo":1,"offsetx":0,"offsety":0,"rot":0,"scalex":1,"scaley":1,"src":"checker.jpg"}],"morphTargets":false,"reflect":0.8,"shadeless":false,"shadow":true,"shininess":15,"skinning":false,"specularColor":{"b":0.577350269189626,"g":0.577350269189626,"r":0.577350269189626},"specularLevel":1,"type":"phong"},"owner":"Rob","radius":0.42,"size":[0.5,1,1],"startingLocation":[-2.97893338765174,-0.0518645777216702,0.55],"tempid":"","texture":"checker.jpg","transform":[-0.9999918341636658,-0.004014354199171066,0,0,0.004014354199171066,-0.9999918341636658,0,0,0,0,1,0,-2.978933334350586,-0.05186457931995392,0.550000011920929,1],"translation":[-2.97893338765174,-0.0518645777216702,0.55],"type":"Primitive","visible":false},"random":{"c":1,"s0":0.201469623949379,"s1":0.204106712946668,"s2":0.828892245423049},"sequence":0,"source":"vwf/model/threejs/sphere.js","type":"subDriver/threejs"};

function dropFire(e)
{

	undoStack.push(FLAMETHROWER);
	console.log(e);
	var insetpoint = _Editor.GetInsertPoint(e);
	insetpoint[2] = .5;
	var campos = _Editor.getCameraPosition();
	
	var ray;
	ray = _Editor.GetWorldPickRay(e);
	var dxy2 = _Editor.intersectLinePlane(ray, campos, [0, 0, .5], [0, 0, 1]);
	var newintersectxy2 = MATH.addVec3(campos, MATH.scaleVec3(ray, dxy2));
	
	var left = _SceneManager.CPUPick(insetpoint,[0,1,0],{ignore:[_dSky]});
	var right = _SceneManager.CPUPick(insetpoint,[0,-1,0],{ignore:[_dSky]});
	var bottom = _SceneManager.CPUPick(insetpoint,[1,0,0],{ignore:[_dSky]});
	var top = _SceneManager.CPUPick(insetpoint,[-1,0,0],{ignore:[_dSky]});

	var min = left || right || bottom || top;;
	if(left && left.distance < min.distance)
		min = left
	if(right && right.distance < min.distance)
		min = right
	if(bottom && bottom.distance < min.distance)
		min = bottom
	if(top && top.distance < min.distance)
		min = top

	console.log(min);
	if(!min) return;

	var norm = min.norm;
	var up = [0,0,1];
	var cross = Vec3.cross(up,norm,[]);
	

	fireTrap.properties.transform[0] = cross[0];
	fireTrap.properties.transform[1] = cross[1];
	fireTrap.properties.transform[2] = cross[2];

	fireTrap.properties.transform[4] = up[0];
	fireTrap.properties.transform[5] = up[1];
	fireTrap.properties.transform[6] = up[2];

	fireTrap.properties.transform[8] = norm[0];
	fireTrap.properties.transform[9] =  norm[1];
	fireTrap.properties.transform[10] =  norm[2];

	fireTrap.properties.transform[12] = min.point[0] + norm[0]/10;
	fireTrap.properties.transform[13] = min.point[1] + norm[1]/10;
	fireTrap.properties.transform[14] = min.point[2] + norm[2]/10;

	fireTrap.properties.translation[0] = fireTrap.properties.transform[12];
	fireTrap.properties.translation[1] = fireTrap.properties.transform[13];
	fireTrap.properties.translation[2] = fireTrap.properties.transform[14];

	fireTrap.properties.owner = _UserManager.GetCurrentUserName();
	fireTrap.properties.DisplayName = _Editor.GetUniqueName('FlameThrower');
	_Editor.createChild('index-vwf',GUID(),_DataManager.getCleanNodePrototype(fireTrap));
	$(dragElement).css('display','none');
	$('#index-vwf').focus();
	postCreateEvent('fireTrap',fireTrap.properties.DisplayName,fireTrap.properties.translation);

  _Tutorial.createdFire();
	return true;

}

function dropLaser(e)
{


	undoStack.push(LASER);
	console.log(e);
	var insetpoint = _Editor.GetInsertPoint(e);
	insetpoint[2] = .5;
	var campos = _Editor.getCameraPosition();
	
	var ray;
	ray = _Editor.GetWorldPickRay(e);
	var dxy2 = _Editor.intersectLinePlane(ray, campos, [0, 0, .5], [0, 0, 1]);
	var newintersectxy2 = MATH.addVec3(campos, MATH.scaleVec3(ray, dxy2));
	
	var left = _SceneManager.CPUPick(insetpoint,[0,1,0],{ignore:[_dSky]});
	var right = _SceneManager.CPUPick(insetpoint,[0,-1,0],{ignore:[_dSky]});
	var bottom = _SceneManager.CPUPick(insetpoint,[1,0,0],{ignore:[_dSky]});
	var top = _SceneManager.CPUPick(insetpoint,[-1,0,0],{ignore:[_dSky]});

	var min = left || right || bottom || top;;
	if(left && left.distance < min.distance)
		min = left
	if(right && right.distance < min.distance)
		min = right
	if(bottom && bottom.distance < min.distance)
		min = bottom
	if(top && top.distance < min.distance)
		min = top

	console.log(min);
	if(!min) return;

	var norm = min.norm;
	var up = [0,0,1];
	var cross = Vec3.cross(up,norm,[]);
	

	laserTrap.properties.transform[0] = cross[0];
	laserTrap.properties.transform[1] = cross[1];
	laserTrap.properties.transform[2] = cross[2];

	laserTrap.properties.transform[4] = up[0];
	laserTrap.properties.transform[5] = up[1];
	laserTrap.properties.transform[6] = up[2];

	laserTrap.properties.transform[8] = norm[0];
	laserTrap.properties.transform[9] =  norm[1];
	laserTrap.properties.transform[10] =  norm[2];

	laserTrap.properties.transform[12] = min.point[0] - norm[0]/10;
	laserTrap.properties.transform[13] = min.point[1] - norm[1]/10;
	laserTrap.properties.transform[14] = min.point[2] - norm[2]/10;

	laserTrap.properties.translation[0] = laserTrap.properties.transform[12];
	laserTrap.properties.translation[1] = laserTrap.properties.transform[13];
	laserTrap.properties.translation[2] = laserTrap.properties.transform[14];

	laserTrap.properties.owner = _UserManager.GetCurrentUserName();
	laserTrap.properties.DisplayName = _Editor.GetUniqueName('Laser');
	_Editor.createChild('index-vwf',GUID(),_DataManager.getCleanNodePrototype(laserTrap));
	$(dragElement).css('display','none');
	$('#index-vwf').focus();
	postCreateEvent('laserTrap',laserTrap.properties.DisplayName,laserTrap.properties.translation);
  _Tutorial.createdLaser();
	return true;

}

function dropDoor(e)
{

	undoStack.push(TRAPDOOR);
	console.log(e);
	var insetpoint = _Editor.GetInsertPoint(e);
	insetpoint[2] = .5;
	var campos = _Editor.getCameraPosition();
	
	var ray;
	ray = _Editor.GetWorldPickRay(e);
	var dxy2 = _Editor.intersectLinePlane(ray, campos, [0, 0, .5], [0, 0, 1]);
	var newintersectxy2 = MATH.addVec3(campos, MATH.scaleVec3(ray, dxy2));
	
	var left = _SceneManager.CPUPick(insetpoint,[0,1,0],{ignore:[_dSky]});
	var right = _SceneManager.CPUPick(insetpoint,[0,-1,0],{ignore:[_dSky]});
	var bottom = _SceneManager.CPUPick(insetpoint,[1,0,0],{ignore:[_dSky]});
	var top = _SceneManager.CPUPick(insetpoint,[-1,0,0],{ignore:[_dSky]});

	var min = left || right || bottom || top;;
	if(left && left.distance < min.distance)
		min = left
	if(right && right.distance < min.distance)
		min = right
	if(bottom && bottom.distance < min.distance)
		min = bottom
	if(top && top.distance < min.distance)
		min = top

	console.log(min);
	if(!min) return;

	var norm = min.norm;
	var up = [0,0,1];
	var cross = Vec3.cross(up,norm,[]);
	

	doorTrap.properties.transform[0] = -cross[0];
	doorTrap.properties.transform[1] = -cross[1];
	doorTrap.properties.transform[2] = -cross[2];

	doorTrap.properties.transform[8] = up[0];
	doorTrap.properties.transform[9] = up[1];
	doorTrap.properties.transform[10] = up[2];

	doorTrap.properties.transform[4] = norm[0];
	doorTrap.properties.transform[5] =  norm[1];
	doorTrap.properties.transform[6] =  norm[2];

	doorTrap.properties.transform[12] = min.point[0] + norm[0] * .49;
	doorTrap.properties.transform[13] = min.point[1] + norm[1] * .49;
	doorTrap.properties.transform[14] = min.point[2] + norm[2] * .49;

	doorTrap.properties.translation[0] = doorTrap.properties.transform[12];
	doorTrap.properties.translation[1] = doorTrap.properties.transform[13];
	doorTrap.properties.translation[2] = doorTrap.properties.transform[14];

	doorTrap.properties.owner = _UserManager.GetCurrentUserName();
	doorTrap.properties.DisplayName = _Editor.GetUniqueName('Trapdoor');
	_Editor.createChild('index-vwf',GUID(),_DataManager.getCleanNodePrototype(doorTrap));
	$('#index-vwf').focus();
	$(dragElement).css('display','none');
	postCreateEvent('Trapdoor',doorTrap.properties.DisplayName,doorTrap.properties.translation);
  _Tutorial.createdDoor();
	return true;

}

function dropWaypoint(e)
{

	undoStack.push(WAYPOINT);
	console.log(e);
	var insetpoint = _Editor.GetInsertPoint(e);
	insetpoint[2] = .15;
	var campos = _Editor.getCameraPosition();
	
	var ray;
	ray = _Editor.GetWorldPickRay(e);
	var dxy2 = _Editor.intersectLinePlane(ray, campos, [0, 0, .15], [0, 0, 1]);
	var newintersectxy2 = MATH.addVec3(campos, MATH.scaleVec3(ray, dxy2));
	
	var left = _SceneManager.CPUPick(insetpoint,[0,1,0],{ignore:[_dSky]});
	var right = _SceneManager.CPUPick(insetpoint,[0,-1,0],{ignore:[_dSky]});
	var bottom = _SceneManager.CPUPick(insetpoint,[1,0,0],{ignore:[_dSky]});
	var top = _SceneManager.CPUPick(insetpoint,[-1,0,0],{ignore:[_dSky]});

	var min = left || right || bottom || top;;
	if(left && left.distance < min.distance)
		min = left
	if(right && right.distance < min.distance)
		min = right
	if(bottom && bottom.distance < min.distance)
		min = bottom
	if(top && top.distance < min.distance)
		min = top

	console.log(min);
	if(!min) return;

	var norm = min.norm;

	wayPoint.properties.transform[12] = min.point[0] + norm[0] * .49;
	wayPoint.properties.transform[13] = min.point[1] + norm[1] * .49;
	wayPoint.properties.transform[14] = min.point[2] + norm[2] * .49;

	wayPoint.properties.translation[0] = wayPoint.properties.transform[12];
	wayPoint.properties.translation[1] = wayPoint.properties.transform[13];
	wayPoint.properties.translation[2] = wayPoint.properties.transform[14];

	wayPoint.properties.owner = _UserManager.GetCurrentUserName();
	wayPoint.properties.DisplayName = _Editor.GetUniqueName('WayPoint');
	_Editor.createChild('index-vwf',GUID(),_DataManager.getCleanNodePrototype(wayPoint));
	$('#index-vwf').focus();
	$(dragElement).css('display','none');
	postCreateEvent('WayPoint',wayPoint.properties.DisplayName,wayPoint.properties.translation);
  _Tutorial.createdWaypoint();
	return true;

}


function dropEnemy(e)
{

	undoStack.push(ENEMY);
	console.log(e);
	var insetpoint = _Editor.GetInsertPoint(e);
	insetpoint[2] = .15;
	var campos = _Editor.getCameraPosition();
	
	var ray;
	ray = _Editor.GetWorldPickRay(e);
	var dxy2 = _Editor.intersectLinePlane(ray, campos, [0, 0, .15], [0, 0, 1]);
	var newintersectxy2 = MATH.addVec3(campos, MATH.scaleVec3(ray, dxy2));
	
	var left = _SceneManager.CPUPick(insetpoint,[0,1,0],{ignore:[_dSky]});
	var right = _SceneManager.CPUPick(insetpoint,[0,-1,0],{ignore:[_dSky]});
	var bottom = _SceneManager.CPUPick(insetpoint,[1,0,0],{ignore:[_dSky]});
	var top = _SceneManager.CPUPick(insetpoint,[-1,0,0],{ignore:[_dSky]});

	var min = left || right || bottom || top;;
	if(left && left.distance < min.distance)
		min = left
	if(right && right.distance < min.distance)
		min = right
	if(bottom && bottom.distance < min.distance)
		min = bottom
	if(top && top.distance < min.distance)
		min = top

	console.log(min);
	if(!min) return;

	var norm = min.norm;

	Enemy.properties.transform[12] = min.point[0] + norm[0] * .49;
	Enemy.properties.transform[13] = min.point[1] + norm[1] * .49;
	Enemy.properties.transform[14] = .55;

	Enemy.properties.translation[0] = Enemy.properties.transform[12];
	Enemy.properties.translation[1] = Enemy.properties.transform[13];
	Enemy.properties.translation[2] = .55;

	Enemy.properties.owner = _UserManager.GetCurrentUserName();
	Enemy.properties.DisplayName = _Editor.GetUniqueName('Enemy');
	Enemy.properties.startingLocation = Enemy.properties.translation;
	_Editor.createChild('index-vwf',GUID(),_DataManager.getCleanNodePrototype(Enemy));
	$('#index-vwf').focus();
	$(dragElement).css('display','none');
	postCreateEvent('Enemy',Enemy.properties.DisplayName,Enemy.properties.startingLocation);
  _Tutorial.createdEnemy();
	return true;

}
