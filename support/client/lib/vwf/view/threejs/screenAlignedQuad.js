define([], function()
{
	var fragment_shader_screen = "varying vec2 vUv;\n" +
		"uniform sampler2D tDiffuse;\n" +
		"void main() {\n" +
		"   vec4 color = texture2D( tDiffuse, vUv );" + 
		"	gl_FragColor = color;\n" +
		"}	\n";
	var fragment_shader_dialate = "varying vec2 vUv;\n" +
		"uniform sampler2D tDiffuse;\n" +
		"void main() {\n" +
		"   vec4 color1 = texture2D( tDiffuse, vUv + vec2(0.001,0.001) );" +
		"   vec4 color2 = texture2D( tDiffuse, vUv + vec2(0.001,-0.001) );" +
		"   vec4 color3 = texture2D( tDiffuse, vUv + vec2(-0.001,-0.001) );" +
		"   vec4 color4 = texture2D( tDiffuse, vUv + vec2(-0.001,0.001) );"+ 
		"	gl_FragColor = vec4(0.0,0.0,1.0,color1.a+color2.a+color3.a+color4.a);\n" +
		"	if(color1.a+color2.a+color3.a+color4.a > 3.8)\n" +
		"	gl_FragColor.a = 0.0;\n" +
		"}	\n";	
	var vertexShader = "varying vec2 vUv;\n" +
		"void main() {\n" +
		"	vUv = uv;\n" +
		"	gl_Position = vec4( position, 1.0 );\n" +
		"}";
	var presentMaterial = new THREE.ShaderMaterial(
	{
		uniforms:
		{
			tDiffuse:
			{
				type: "t",
				value: null
			}
		},
		vertexShader: vertexShader,
		fragmentShader: fragment_shader_screen,
		depthWrite: false,
		transparent:true,
		depthTest:false
	});
	var dialateMaterial = new THREE.ShaderMaterial(
	{
		uniforms:
		{
			tDiffuse:
			{
				type: "t",
				value: null
			}
		},
		vertexShader: vertexShader,
		fragmentShader: fragment_shader_dialate,
		depthWrite: false,
		transparent:true,
		depthTest:false
	});
	var geo = new THREE.PlaneGeometry(2,2);
	var mesh = new THREE.Mesh(geo,presentMaterial)
	mesh.presentMaterial = presentMaterial;
	mesh.dialateMaterial = dialateMaterial;
	return mesh;
})