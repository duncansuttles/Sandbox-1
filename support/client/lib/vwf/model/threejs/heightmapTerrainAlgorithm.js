function heightmapTerrainAlgorithm() 
{	
	
	this.dataHeight =  0;
	this.dataWidth =  0;
	this.worldLength =  13500;
	this.worldWidth =  9500;
	this.addNoise =  false;
	this.cubic =  false;
	this.gamma =  false;
	this.min =  0;

	//this init is called from each thread, and gets data from the poolInit function.
	this.init = function(data)
	{
		this.data = data.data;
		
		console.log('data received');
		
		this.dataHeight = data.dataHeight || 0;
		this.dataWidth = data.dataWidth || 0;

		this.worldLength = data.worldLength || 13500;
		this.worldWidth = data.worldWidth || 9500;
		this.addNoise = data.addNoise || false;
		this.cubic = data.cubic || false;
		this.gamma = data.gamma || false;
		this.min = data.min || 0;
		console.log('from thread: min is ' + this.min);
		this.type = 'bt';
		this.heightScale = data.heightScale || 1;
		this.importScript('simplexNoise.js');
		this.importScript('Rc4Random.js');
		this.SimplexNoise = new SimplexNoise((new Rc4Random(1 +"")).random);
	}
	//This can generate data on the main thread, and it will be passed to the coppies in the thread pool
	this.poolInit = function(cb,params)
	{	
		
		this.type = 'bt';
		if(!params) params = {};
		this.addNoise = params.addNoise || false;
		this.cubic = params.cubic || false;
		this.gamma = params.gamma || false;
		this.heightScale = params.heightScale || 1;
		this.url = (params && params.url) || 'terrain/River.bt';

		if(this.url && this.url.lastIndexOf('.') > -1)
		{
			var type = this.url.substr(this.url.lastIndexOf('.')+1);
			if(type.toLowerCase() == 'bt')
				this.type = 'bt'
			else
				this.type = 'img';
		}
		this.diffuseUrl = (params && params.diffuseUrl) || 'terrain/River.jpg';
		if(this.type == 'img')
		{
			canvas = document.createElement('canvas');

			this.worldLength = params && parseFloat(params.worldLength) || 13500;
			this.worldWidth =  params && parseFloat(params.worldWidth) || 9500;
			var img = new Image();
			img.src = this.url;
			
			img.onload = function()
			{
				
				this.worldLength = params && parseFloat(params.worldLength) || 13500;
				this.worldWidth =  params && parseFloat(params.worldWidth) || 9500;
				this.dataHeight = img.naturalHeight;
				this.dataWidth = img.naturalWidth;
				this.heightScale = params.heightScale || 1;
				canvas.height = this.dataHeight;
				canvas.width = this.dataWidth;
				var context = canvas.getContext('2d');
				context.drawImage(img, 0, 0);
				var data = context.getImageData(0, 0, this.dataHeight, this.dataWidth).data;
				
				var array = new Uint8Array(this.dataHeight*this.dataWidth);
				for(var i =0; i < this.dataHeight*this.dataWidth * 4; i+=4)
					array[Math.floor(i/4)] = Math.pow(data[i]/255.0,1.0) * 255;
				var data = new Uint8Array(this.dataHeight*this.dataWidth);
				for(var i = 0; i < this.dataWidth; i++)
				{
					for(var j = 0; j < this.dataHeight; j++)
					{
						var c = i * this.dataWidth + j;
						var c2 = j * this.dataHeight + i;
						data[c] = array[c2];
					}
				}

				cb({heightScale:this.heightScale,worldLength:this.worldLength,worldWidth:this.worldWidth,dataHeight:this.dataHeight,dataWidth:this.dataWidth,min:0,data:data,addNoise:params.addNoise,cubic:params.cubic,gamma:params.gamma});
			}
		}
		if(this.type == 'bt')
		{
			this.worldLength = params && parseFloat(params.worldLength) || 13500;
			this.worldWidth =  params && parseFloat(params.worldWidth) || 9500;
			
			//check if it was preloaded
			if(_assetLoader.getTerrain(this.url))
			{
				var terraindata = _assetLoader.getTerrain(this.url);
				terraindata.worldLength = this.worldLength;
				terraindata.worldWidth = this.worldWidth;
				terraindata.addNoise=this.addNoise
				terraindata.cubic=this.cubic;
				terraindata.gamma=this.gamma;

				window.setTimeout(function(){
					cb(terraindata);	
				},0);
				
			}
			else
			{
				var buff;
				var self2 = this;
				var xhr = new XMLHttpRequest();
				xhr.responseType = 'arraybuffer';
				xhr.onload = function(e) {
					if (xhr.status === 200) {
					  buff = xhr.response;
					  cb(self2.parseBT(buff));
					} else
					{
						cb(null);
					}
				};
				xhr.open('GET', this.url);
				xhr.send();
			}
		}
		
		//signal the pool that we need an async startup
		return false;
	}
	this.parseBT = function(arraybuf)
	{
		
		var DV = new DataView(arraybuf);
		this.dataWidth = DV.getInt32(10,true);
		this.dataHeight = DV.getInt32(14,true);
		var dataSize = DV.getInt16(18,true);
		var isfloat = DV.getInt16(20,true);
		var scale = DV.getFloat32(62,true);
		var data;
		if(isfloat == 1)
		{
			data = new Float32Array(this.dataWidth*this.dataHeight);
		}
		else
		{
			data = new Int16Array(this.dataWidth*this.dataHeight);
		}
		var min = Infinity;
		for(var i =0; i < this.dataWidth*this.dataHeight; i++)
		{
			if(isfloat == 1)
			{
				data[i] = DV.getFloat32(256 + 4 * i,true);			
			}else
			{
				data[i] = DV.getInt16(256 + 2 * i,true);
			}
			if(data[i] < min)
				min = data[i];
		}
		this.min = min;
		this.data = data;
		return {heightScale:this.heightScale,worldLength:this.worldLength,worldWidth:this.worldWidth,dataHeight:this.dataHeight,dataWidth:this.dataWidth,min:min,data:data,addNoise:this.addNoise,cubic:this.cubic,gamma:this.gamma}
	}
	//This is the settings data, set both main and pool side
	this.getEditorData = function(data)
	{
		return {
		heightmapSrc:{
								displayname : 'HeightMap (Data Source) URL',
								property:'url',
								type:'map'
						},
		diffuseSrc:{
								displayname : 'Texture URL',
								property:'diffuseUrl',
								type:'map'
						},	
		worldLength:{
								displayname : 'Data Source Length (m)',
								property:'worldLength',
								type:'prompt'
						},
		worldWidth:{
								displayname : 'Data Source Width (m)',
								property:'worldWidth',
								type:'prompt'
						},
						addNoise:{
								displayname : 'Add additional noise',
								property:'addNoise',
								type:'check'
						},
						cubic:{
								displayname : 'Use Bicubic interpolation',
								property:'cubic',
								type:'check'
						},
						gamma:{
								displayname : 'Use gamma correction',
								property:'gamma',
								type:'check'
						},
						heightScale:{
								displayname : 'Height Scale',
								property:'heightScale',
								type:'prompt'
						},											
		}
	}
	//This is the settings data, set both main and pool side
	this.setAlgorithmData = function(data)
	{
		
	}
	//this sets the values on the pool side. Keep these cached here, so the engine can query them without an async call
	//updatelist is the existing tiles. Return tiles in an array  that will need an update after the property set. This will 
	//allow the engine to only schedule tile updates that are necessary.
	this.setAlgorithmDataPool = function(data,updateList)
	{
		if(!data) return [];
		var needRebuild = false;
		if(data.url && data.url != this.url)
		{
			this.url = data.url;
			needRebuild = true;
		}
		if(data.worldLength && data.worldLength != this.worldLength)
		{
			this.worldLength =  parseFloat(data.worldLength);
			needRebuild = true;
		}
		if(data.worldWidth && data.worldWidth != this.worldWidth)
		{

			this.worldWidth =  parseFloat(data.worldWidth);
			needRebuild = true;
		}
		if(data.cubic != this.cubic)
		{
			this.cubic =  data.cubic;
			needRebuild = true;
		}
		if(data.gamma != this.gamma)
		{
			this.gamma =  data.gamma;
			needRebuild = true;
		}
		if(data.addNoise != this.addNoise)
		{
			this.addNoise =  data.addNoise;
			needRebuild = true;
		}
		if(data.heightScale != this.heightScale)
		{
			
			this.heightScale =  data.heightScale;
			needRebuild = true;
		}
		if(data.diffuseUrl != this.diffuseUrl)	
		{
			this.diffuseUrl = data.diffuseUrl;
			this.materialRebuildCB();
		}
		if(needRebuild) return updateList;
		return [];
	}
	
	//the engine will read the data values here
	this.getAlgorithmDataPool = function(seed)
	{
		return {
			url:this.url,
			diffuseUrl:this.diffuseUrl,
			worldWidth:this.worldWidth,
			worldLength:this.worldLength,
			cubic:this.cubic || false,
			gamma:this.gamma || false,
			addNoise:this.addNoise || false,
			heightScale:this.heightScale || 1
		};
	}
	//This will allow you to setup shader variables that will be merged into the the terrain shader
	this.getMaterialUniforms = function(mesh,matrix)
	{
		
		var uniforms_default = {
		diffuseSampler:   { type: "t", value: _SceneManager.getTexture( this.diffuseUrl,true) },
		dirtSampler:   { type: "t", value: _SceneManager.getTexture( "terrain/dirt.jpg",true ) },
		brushSampler:   { type: "t", value: _SceneManager.getTexture( "terrain/scrub.jpg",true ) },
		};
		uniforms_default.diffuseSampler.value.wrapS = uniforms_default.diffuseSampler.value.wrapT = THREE.RepeatWrapping;
		uniforms_default.dirtSampler.value.wrapS = uniforms_default.dirtSampler.value.wrapT = THREE.RepeatWrapping;
		uniforms_default.brushSampler.value.wrapS = uniforms_default.brushSampler.value.wrapT = THREE.RepeatWrapping;
		return uniforms_default;
	}
	//This funciton allows you to compute the diffuse surface color however you like. 
	//must implement vec4 getTexture(vec3 coords, vec3 norm) or return null which will give you the default white
	this.getDiffuseFragmentShader = function(mesh,matrix)
	{
		
		return (
		"uniform sampler2D diffuseSampler;\n"+
		"uniform sampler2D dirtSampler;\n"+
		"uniform sampler2D brushSampler;\n"+
		"vec4 getTexture(vec3 coords, vec3 norm, vec2 uv)" +
		"{"+
			"vec4 diffuse = texture2D(diffuseSampler,((coords.yx * vec2(1.0,1.0) + vec2("+((this.worldWidth)/2).toFixed(5)+","+((this.worldLength)/2).toFixed(5)+"))/vec2("+((this.worldWidth)).toFixed(5)+","+((this.worldLength)).toFixed(5)+")));\n"+
			//"vec4 diffuse = texture2D(diffuseSampler,((coords.yx * vec2(1.0,1.0) + vec2(6750.0,4750.0))/vec2(13500.0,9500.0)));\n"+
			"vec4 dirt = texture2D(dirtSampler,((coords.yx / 10.0)));\n"+
			"vec4 brush = texture2D(brushSampler,((coords.yx / 5.0)));\n"+
			"float minamt = smoothstep(0.0,100.0,distance(cameraPosition , coords));\n"+
			"float dirtdot = dot(diffuse,vec4(182.0/255.0,179.0/255.0,164.0/255.0,1.0));\n"+
			"dirtdot = clamp(0.0,1.0,pow(max(.5,dirtdot)-.5,9.5)/100.0);\n"+
			
			"vec4 near = mix(brush,dirt,dirtdot);\n"+
			"return mix(near,diffuse,minamt);\n"+
		"}")
	}
	
	//This is the displacement function, which is called in paralell by the thread pool
	this.displace= function(vert,matrix,res)
	{
		var z = 0;

		if(this.addNoise)
		{
			z = this.SimplexNoise.noise2D((vert.x)/100,(vert.y)/100) * 4.5;
			z += this.SimplexNoise.noise2D((vert.x)/300,(vert.y)/300) * 4.5;
			z += this.SimplexNoise.noise2D((vert.x)/10,(vert.y)/10) * 0.5;
		}
		//this is gamma correction
		var h = this.type == 'img' && this.gamma?2.2:1.0;
		if(this.cubic)
			return this.sampleBiCubic((vert.x+ (this.worldLength/2)) / this.worldLength ,(vert.y + (this.worldWidth/2)) / this.worldWidth,matrix,res  ) * h * this.heightScale  + z|| 0;
		else
			return this.sampleBiLinear((vert.x+ (this.worldLength/2)) / this.worldLength ,(vert.y + (this.worldWidth/2)) / this.worldWidth,matrix,res  ) * h * this.heightScale + z|| 0;
	}
	this.at = function(x,y)
	{
		x = Math.floor(x);
		y = Math.floor(y);
		if(!this.data) return 0;
		if( x >= this.dataHeight || x < 0) return 0;
		if( y >= this.dataWidth || y < 0) return 0;
		var i = y * this.dataWidth  + x;
		return this.data[i]  - this.min;
	}
	this.sampleBiLinear = function(u,v)
	{
		//u = u - Math.floor(u);
		//v = v - Math.floor(v);
		u = u * this.dataWidth - .5;
		v = v * this.dataHeight - .5;
		var x = Math.floor(u);
		var y = Math.floor(v);
		var u_ratio = u -x;
		var v_ratio = v - y;
		var u_opposite = 1 - u_ratio;
		var v_opposite = 1 - v_ratio;
		var result = (this.at(x,y)   * u_opposite  + this.at(x+1,y)   * u_ratio) * v_opposite + 
                   (this.at(x,y+1) * u_opposite  + this.at(x+1,y+1) * u_ratio) * v_ratio;
		return result;
	}
	this.cubicInterpolate = function(p, x) 
	{
		return p[1] + 0.5 * x*(p[2] - p[0] + x*(2.0*p[0] - 5.0*p[1] + 4.0*p[2] - p[3] + x*(3.0*(p[1] - p[2]) + p[3] - p[0])));
	}
	this.bicubicInterpolate = function(p, x, y)
	{
		var arr = [];
		arr[0] = this.cubicInterpolate(p[0], y);
		arr[1] = this.cubicInterpolate(p[1], y);
		arr[2] = this.cubicInterpolate(p[2], y);
		arr[3] = this.cubicInterpolate(p[3], y);
		return this.cubicInterpolate(arr, x);
	}
	this.mipAt = function(x,xo,y,yo,mip)
	{
		return this.at(x*mip + xo * mip,y*mip+yo*mip);
	}
	this.sampleBiCubic = function(u,v,matrix,tileres)
	{

		var res = 1;
		if((this.worldWidth/this.dataWidth) < 2)
		    res = Math.min(1,(this.worldWidth/this.dataWidth)/50);
		var mip = 1/res;
		var dh = this.dataHeight * res;
		var dw = this.dataWidth * res;


		var y = Math.floor(u * dh);
		var x = Math.floor(v * dw);
		
		u = (u * dh) - Math.floor(u * dh);
		v = (v * dw) - Math.floor(v * dw);
		var p = [];
		var t = x;
		x = y;
		y = t;
		t = u;
		u = v;
		v = t;


	//	p[0] = [this.at(x-1 ,y-1 ),this.at(x-0,y-1 ),this.at(x+1 ,y-1 ),this.at(x+2 ,y-1 )];
	//	p[1] = [this.at(x-1 ,y-0 ),this.at(x-0,y-0 ),this.at(x+1 ,y-0 ),this.at(x+2 ,y-0 )];
	//	p[2] = [this.at(x-1 ,y+1 ),this.at(x-0,y+1 ),this.at(x+1 ,y+1 ),this.at(x+2 ,y+1 )];
	//	p[3] = [this.at(x-1 ,y+2 ),this.at(x-0,y+2 ),this.at(x+1 ,y+2 ),this.at(x+2 ,y+2 )];


		p[0] = [this.mipAt(x,-1 ,y,-1,mip ),this.mipAt(x,0,y,-1,mip ),this.mipAt(x,1 ,y,-1,mip ),this.mipAt(x,2 ,y,-1,mip )];
		p[1] = [this.mipAt(x,-1 ,y,-0,mip ),this.mipAt(x,0,y,0,mip ),this.mipAt(x,1 ,y,0,mip ),this.mipAt(x,2 ,y,0,mip )];
		p[2] = [this.mipAt(x,-1 ,y,1,mip ),this.mipAt(x,0,y,1,mip ),this.mipAt(x,1 ,y,1,mip ),this.mipAt(x,2 ,y,1,mip )];
		p[3] = [this.mipAt(x,-1 ,y,2,mip ),this.mipAt(x,0,y,2,mip ),this.mipAt(x,1 ,y,2,mip ),this.mipAt(x,2 ,y,2,mip )];
		return this.bicubicInterpolate(p,u,v);
	}
}