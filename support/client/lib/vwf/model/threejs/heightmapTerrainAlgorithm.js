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
				terraindata.heightScale = this.heightScale;
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

		h_aaalable:{
								
				      			displayname: 'Heightmap Algorithm',
				      			type: 'sectionTitle'
      					},	
		h_heightmapSrc:{
								displayname : 'HeightMap (Data Source) URL',
								property:'url',
								type:'map'
						},
		h_diffuseSrc:{
								displayname : 'Texture URL',
								property:'diffuseUrl',
								type:'map'
						},	
		h_worldLength:{
								displayname : 'Data Source Length (m)',
								property:'worldLength',
								type:'prompt'
						},
		h_worldWidth:{
								displayname : 'Data Source Width (m)',
								property:'worldWidth',
								type:'prompt'
						},
						h_addNoise:{
								displayname : 'Add additional noise',
								property:'addNoise',
								type:'check'
						},
						h_cubic:{
								displayname : 'Use Bicubic interpolation',
								property:'cubic',
								type:'check'
						},
						h_gamma:{
								displayname : 'Use gamma correction',
								property:'gamma',
								type:'check'
						},
						h_heightScale:{
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
		dirtSampler:   { type: "t", value: _SceneManager.getTexture( "terrain/cliff.jpg",true ) },
		grassSampler:   { type: "t", value: _SceneManager.getTexture( "terrain/cliff.jpg",true ) },
		rockSampler:   { type: "t", value: _SceneManager.getTexture( "terrain/ground.jpg",true ) },
		snowSampler:   { type: "t", value: _SceneManager.getTexture( "terrain/ground.jpg",true ) },

		dirtNormalMap:   { type: "t", value: _SceneManager.getTexture( "terrain/4979-normal.jpg",true ) },
		grassNormalMap:   { type: "t", value: _SceneManager.getTexture( "terrain/4979-normal.jpg",true ) },
		rockNormalMap:   { type: "t", value: _SceneManager.getTexture( "terrain/grassnorm.jpg",true ) },
		snowNormalMap:   { type: "t", value: _SceneManager.getTexture( "terrain/grassnorm.jpg",true ) },
		mixMap:   { type: "t", value: _SceneManager.getTexture( "terrain/rivermix.png",true ) },
		};
		uniforms_default.diffuseSampler.value.wrapS = uniforms_default.diffuseSampler.value.wrapT = THREE.RepeatWrapping;
		uniforms_default.dirtSampler.value.wrapS = uniforms_default.dirtSampler.value.wrapT = THREE.RepeatWrapping;
		uniforms_default.grassSampler.value.wrapS = uniforms_default.grassSampler.value.wrapT = THREE.RepeatWrapping;
		uniforms_default.dirtNormalMap.value.wrapS = uniforms_default.dirtNormalMap.value.wrapT = THREE.RepeatWrapping;
		uniforms_default.grassNormalMap.value.wrapS = uniforms_default.grassNormalMap.value.wrapT = THREE.RepeatWrapping;
		return uniforms_default;
	}

	this.getNormalFragmentShader = function()
	{
		
		
		
		// http://www.thetenthplanet.de/archives/1180
		 
		return ""+
		
		"uniform sampler2D snowNormalMap;\n"+
		"uniform sampler2D rockNormalMap;\n"+
		"uniform sampler2D dirtNormalMap;\n"+
		"uniform sampler2D grassNormalMap;\n"+

		"mat3 cotangent_frame(vec3 N, vec3 p, vec2 uv)\n"+
		"{\n"+
		"    // get edge vectors of the pixel triangle\n"+
		"    vec3 dp1 = dFdx( p );\n"+
		"    vec3 dp2 = dFdy( p );\n"+
		"    vec2 duv1 = dFdx( uv );\n"+
		"    vec2 duv2 = dFdy( uv );\n"+
		 
		"    // solve the linear system\n"+
		"    vec3 dp2perp = cross( dp2, N );\n"+
		"    vec3 dp1perp = cross( N, dp1 );\n"+
		"    vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;\n"+
		"    vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;\n"+
		 
		"    // construct a scale-invariant frame \n"+
		"    float invmax = inversesqrt( max( dot(T,T), dot(B,B) ) );\n"+
		"    return mat3( T * invmax, B * invmax, N );\n"+
		"}\n"+

		"vec3 perturb_normal( mat3 TBN, vec2 texcoord, sampler2D sampler )\n"+
		"{\n"+
		"    // assume N, the interpolated vertex normal and \n"+
		"    // V, the view vector (vertex to eye)\n"+
		"    vec3 map = texture2D(sampler, texcoord ).xyz;\n"+
		"    map = map * 2.0 - 1.0;\n"+
		"    return normalize(TBN * map);\n"+
		"}\n"+
		"vec3 triPlanerNorm(mat3 TBN0, mat3 TBN1, mat3 TBN2, vec3 coords, vec3 norm, sampler2D sampler)" +
		"{"+
			"vec3 dirt0 = perturb_normal(TBN0, coords.yz, sampler);\n"+
			"vec3 dirt1 = perturb_normal(TBN1, coords.zx, sampler);\n"+
			"vec3 dirt2 = perturb_normal(TBN2, -coords.xy, sampler);\n"+
			"return blend_weights.x * dirt0 + blend_weights.y * dirt1 + blend_weights.z * dirt2;\n"+
		"}"+
		"vec3 blendNorm(vec3 texture1,vec3 texture2, float a1)\n"+
		"{\n"+
		"    return mix(texture1,texture2,1.0-a1);\n"+
		"}\n"+
		"vec3 getNormal(vec3 coords, vec3 viewNorm, vec2 uv,vec3 wN) {\n"+


"mixVal = texture2D(mixMap,((coords.yx * vec2(1.0,1.0) + vec2("+((this.worldWidth)/2).toFixed(5)+","+((this.worldLength)/2).toFixed(5)+"))/vec2("+((this.worldWidth)).toFixed(5)+","+((this.worldLength)).toFixed(5)+")));\n"+
		"blend_weights = abs( wN.xyz );   // Tighten up the blending zone:  \n"+
		"blend_weights = (blend_weights -  0.2679);  \n"+
		"blend_weights = max(blend_weights, 0.0);      // Force weights to sum to 1.0 (very important!)  \n"+
		"blend_weights /= (blend_weights.x + blend_weights.y + blend_weights.z ); \n"+
		"    vec4 diffuse = texture2D(diffuseSampler,((coords.yx * vec2(1.0,1.0) + vec2("+((this.worldWidth)/2).toFixed(5)+","+((this.worldLength)/2).toFixed(5)+"))/vec2("+((this.worldWidth)).toFixed(5)+","+((this.worldLength)).toFixed(5)+")));\n"+
		"	 vec3 V = -((viewMatrix * vec4(coords,1.0)).xyz);\n"+
		"    mat3 TBN0 = cotangent_frame(viewNorm, V, coords.yz/100.0);\n"+
		"    mat3 TBN1 = cotangent_frame(viewNorm, V, coords.zx/100.0);\n"+
		"    mat3 TBN2 = cotangent_frame(viewNorm, V, coords.xy/100.0);\n"+

		"	 vec3 dirt = triPlanerNorm(TBN0,TBN1,TBN2,coords/100.0,wN,dirtNormalMap);\n"+
		"	 vec3 grass = triPlanerNorm(TBN0,TBN1,TBN2,coords/100.0,wN,grassNormalMap);\n"+
		"	 vec3 snow = triPlanerNorm(TBN0,TBN1,TBN2,coords/100.0,wN,snowNormalMap);\n"+
		"	 vec3 rock = triPlanerNorm(TBN0,TBN1,TBN2,coords/100.0,wN,rockNormalMap);\n"+

		"	 vec3 dirtnear = triPlanerNorm(TBN0,TBN1,TBN2,coords/10.0,wN,dirtNormalMap);\n"+
		"	 vec3 grassnear = triPlanerNorm(TBN0,TBN1,TBN2,coords/10.0,wN,grassNormalMap);\n"+
		"	 vec3 snownear = triPlanerNorm(TBN0,TBN1,TBN2,coords/10.0,wN,snowNormalMap);\n"+
		"	 vec3 rocknear = triPlanerNorm(TBN0,TBN1,TBN2,coords/10.0,wN,rockNormalMap);\n"+
		"    float minamt = smoothstep(0.0,1500.0,distance(cameraPosition , coords));\n"+
		"    float minamt2 = smoothstep(0.0,50.0,distance(cameraPosition , coords));\n"+
			
		
			
			"vec3 near = blendNorm(snow,blendNorm(grass,blendNorm(rock,blendNorm(dirt,viewNorm,mixVal.r),mixVal.g),mixVal.b),0.0);\n"+
			"vec3 vnear = blendNorm(snownear,blendNorm(grassnear,blendNorm(rocknear,blendNorm(dirtnear,viewNorm,mixVal.r),mixVal.g),mixVal.b),0.0);\n"+
			"vec3 dist =  mix(near,viewNorm,minamt);\n"+
			"return dist.rgb;// normalize(vnear*(1.0-minamt2) +dist);\n"+
		"}\n";
	}
	//This funciton allows you to compute the diffuse surface color however you like. 
	//must implement vec4 getTexture(vec3 coords, vec3 norm) or return null which will give you the default white
	this.getDiffuseFragmentShader = function(mesh,matrix)
	{
		
		return (
		
		"uniform sampler2D diffuseSampler;\n"+
		"uniform sampler2D dirtSampler;\n"+
		"uniform sampler2D grassSampler;\n"+
		"uniform sampler2D rockSampler;\n"+
		"uniform sampler2D snowSampler;\n"+
		"uniform sampler2D mixMap;\n"+
		"vec4 mixVal=vec4(0.0,0.0,0.0,0.0);\n"+
		"vec3 blend_weights = vec3(0.0,0.0,0.0);\n"+

		"vec4 triPlanerMap(vec3 coords, vec3 norm, sampler2D sampler)" +
		"{"+
			"vec4 dirt0 = texture2D(sampler,((coords.yz )));\n"+
			"vec4 dirt1 = texture2D(sampler,((coords.zx )));\n"+
			"vec4 dirt2 = texture2D(sampler,((coords.xy )));\n"+
			"vec3 blend_weights = abs( norm.xyz );   // Tighten up the blending zone:  \n"+
			
			"return blend_weights.x * dirt0 + blend_weights.y * dirt1 + blend_weights.z * dirt2;\n"+
		"}"+
		"vec4 blend(vec4 texture1, vec4 texture2, float a1)\n"+
		"{\n"+
		" float a2 = 1.0-a1;\n"+
		"    float depth = 0.2;\n"+
		"    float ma = max(length(texture1) + a1,length( texture2) + a2) - depth;\n"+

		"    float b1 = max(length(texture1) + a1 - ma, 0.0);\n"+
		"    float b2 = max(length(texture2) + a2 - ma, 0.0);\n"+
		//"return mix(texture1,texture2,a1);\n"+
		"    return vec4((texture1.rgb * b1 + texture2.rgb * b2) / (b1 + b2),max(texture1.a,texture2.a));\n"+
		"}\n"+
		"vec4 getTexture(vec3 coords, vec3 norm, vec2 uv)" +
		"{"+

			"mixVal = texture2D(mixMap,((coords.yx * vec2(1.0,1.0) + vec2("+((this.worldWidth)/2).toFixed(5)+","+((this.worldLength)/2).toFixed(5)+"))/vec2("+((this.worldWidth)).toFixed(5)+","+((this.worldLength)).toFixed(5)+")));\n"+
		"blend_weights = abs( wN.xyz );   // Tighten up the blending zone:  \n"+
		"blend_weights = (blend_weights -  0.2679);  \n"+
		"blend_weights = max(blend_weights, 0.0);      // Force weights to sum to 1.0 (very important!)  \n"+
		"blend_weights /= (blend_weights.x + blend_weights.y + blend_weights.z ); \n"+


			"vec4 diffuse = texture2D(diffuseSampler,((coords.yx * vec2(1.0,1.0) + vec2("+((this.worldWidth)/2).toFixed(5)+","+((this.worldLength)/2).toFixed(5)+"))/vec2("+((this.worldWidth)).toFixed(5)+","+((this.worldLength)).toFixed(5)+")));\n"+
			//"vec4 diffuse = texture2D(diffuseSampler,((coords.yx * vec2(1.0,1.0) + vec2(6750.0,4750.0))/vec2(13500.0,9500.0)));\n"+
			
			"vec4 dirt = triPlanerMap(coords/100.0,wN,dirtSampler);\n"+
			"vec4 grass = triPlanerMap(coords/50.0,wN,grassSampler);\n"+
			"vec4 rock = triPlanerMap(coords/50.0,wN,rockSampler);\n"+
			"vec4 snow = triPlanerMap(coords/50.0,wN,snowSampler);\n"+
			
			"vec4 dirtnear = triPlanerMap(coords/10.0,wN,dirtSampler);\n"+
			"vec4 grassnear = triPlanerMap(coords/10.0,wN,grassSampler);\n"+
			"vec4 rocknear = triPlanerMap(coords/10.0,wN,rockSampler);\n"+
			"vec4 snownear = triPlanerMap(coords/10.0,wN,snowSampler);\n"+
			

			//"dirt = vec4(1.0,0.0,0.0,0.0);\n"+
			//"grass = vec4(0.0,1.0,0.0,0.0);\n"+
			//"rock = vec4(0.0,0.0,1.0,0.0);\n"+
			//"snow = vec4(0.0,0.0,0.0,0.0);\n"+
			
			"float minamt = smoothstep(0.0,1500.0,distance(cameraPosition , coords));\n"+
			"float minamt2 = smoothstep(0.0,50.0,distance(cameraPosition , coords));\n"+
			"float dirtdot = dot(diffuse,vec4(182.0/255.0,179.0/255.0,164.0/255.0,1.0));\n"+
			"dirtdot = clamp(0.0,1.0,pow(max(.5,dirtdot)-.5,9.5)/100.0);\n"+
			
			"vec4 near = blend(snow,blend(grass,blend(rock,blend(dirt,dirt,mixVal.r),mixVal.g),mixVal.b),0.0);\n"+
			//"vec4 near = blend(dirt,vec4(0.0,0.0,0.0,0.0),mixVal.r);\n"+
			"vec4 vnear = blend(snownear,blend(grassnear,blend(rocknear,blend(dirtnear,vec4(0.0,0.0,0.0,0.0),mixVal.r),mixVal.g),mixVal.b),0.0);\n"+

			"vec4 dist = mix(near,diffuse,minamt);\n"+
			"return mix(vnear,dist,minamt2);\n"+
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