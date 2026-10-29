import * as THREE from 'three';

const vertexShader = /* glsl */`
	uniform float uTime;
	varying vec3 vWorld;
	varying vec3 vNormalW;
	varying float vWave;

	float waveHeight( vec2 p, float t ) {

		return sin( p.x * 0.042 + t * 0.85 ) * 0.11
			+ sin( p.y * 0.061 - t * 1.15 ) * 0.07
			+ sin( ( p.x + p.y ) * 0.13 + t * 1.9 ) * 0.028;

	}

	void main() {

		vec3 pos = position;

		float h = waveHeight( pos.xz, uTime );
		pos.y += h;
		vWave = h;

		float dx = cos( pos.x * 0.042 + uTime * 0.85 ) * 0.042 * 0.11
			+ cos( ( pos.x + pos.z ) * 0.13 + uTime * 1.9 ) * 0.13 * 0.028;
		float dz = cos( pos.z * 0.061 - uTime * 1.15 ) * 0.061 * 0.07
			+ cos( ( pos.x + pos.z ) * 0.13 + uTime * 1.9 ) * 0.13 * 0.028;

		vNormalW = normalize( vec3( - dx, 1.0, - dz ) );

		vec4 world = modelMatrix * vec4( pos, 1.0 );
		vWorld = world.xyz;

		gl_Position = projectionMatrix * viewMatrix * world;

	}
`;

const fragmentShader = /* glsl */`
	uniform vec3 uDeep;
	uniform vec3 uShallow;
	uniform vec3 uSparkle;
	uniform vec3 uHorizon;
	uniform vec3 uTop;
	uniform vec3 uSunDir;
	uniform vec3 uFogColor;
	uniform float uFogNear;
	uniform float uFogFar;
	uniform float uTime;

	varying vec3 vWorld;
	varying vec3 vNormalW;
	varying float vWave;

	float hash( vec2 p ) {

		p = fract( p * vec2( 123.34, 456.21 ) );
		p += dot( p, p + 45.32 );
		return fract( p.x * p.y );

	}

	void main() {

		vec3 viewDir = normalize( cameraPosition - vWorld );
		vec3 normal = normalize( vNormalW );

		// detalle fino de la superficie
		float ripple = sin( vWorld.x * 0.55 + uTime * 2.1 ) * sin( vWorld.z * 0.47 - uTime * 1.7 );
		normal = normalize( normal + vec3( ripple * 0.038, 0.0, ripple * 0.032 ) );

		float fresnel = pow( 1.0 - clamp( dot( normal, viewDir ), 0.0, 1.0 ), 3.8 );
		vec3 reflected = reflect( - viewDir, normal );
		vec3 skyReflection = mix( uHorizon, uTop, clamp( reflected.y * 1.8 + 0.25, 0.0, 1.0 ) );

		float depthMix = smoothstep( 0.0, 0.55, normal.y );
		vec3 body = mix( uDeep, uShallow, depthMix * 0.34 );
		vec3 color = mix( body, skyReflection, fresnel * 0.3 );

		// ondulación de fondo
		float bands = sin( vWorld.x * 0.045 + vWorld.z * 0.021 + uTime * 0.55 ) * 0.5 + 0.5;
		color *= 0.88 + bands * 0.22;

		// sol sobre el agua
		float spec = pow( max( dot( reflected, uSunDir ), 0.0 ), 260.0 );
		float glitter = pow( max( dot( reflected, uSunDir ), 0.0 ), 18.0 );
		color += uSparkle * ( spec * 5.6 + glitter * 0.2 );

		// espuma de superficie muy tenue
		float foam = smoothstep( 0.72, 0.95, sin( vWorld.x * 0.21 + uTime * 0.6 ) * sin( vWorld.z * 0.18 - uTime * 0.4 ) * 0.5 + 0.5 );
		color = mix( color, vec3( 0.9, 0.93, 0.9 ), foam * 0.06 );

		float distanceToCamera = length( cameraPosition - vWorld );
		float fogFactor = smoothstep( uFogNear, uFogFar, distanceToCamera );
		color = mix( color, uFogColor, fogFactor );

		gl_FragColor = vec4( color, 1.0 );

	}
`;

export function createOcean( scene, preset ) {

	const geometry = new THREE.PlaneGeometry( 24000, 24000, 160, 160 );
	geometry.rotateX( - Math.PI / 2 );

	const uniforms = {
		uTime: { value: 0 },
		uDeep: { value: new THREE.Color( preset.ocean.deep ) },
		uShallow: { value: new THREE.Color( preset.ocean.shallow ) },
		uSparkle: { value: new THREE.Color( preset.ocean.sparkle ) },
		uHorizon: { value: new THREE.Color( preset.sky.horizon ) },
		uTop: { value: new THREE.Color( preset.sky.top ) },
		uSunDir: { value: new THREE.Vector3( 0, 0.1, - 1 ).normalize() },
		uFogColor: { value: new THREE.Color( preset.fog.color ) },
		uFogNear: { value: preset.fog.near },
		uFogFar: { value: preset.fog.far }
	};

	const material = new THREE.ShaderMaterial( {
		uniforms,
		vertexShader,
		fragmentShader
	} );

	const mesh = new THREE.Mesh( geometry, material );
	mesh.position.y = - 0.16;
	mesh.receiveShadow = false;
	mesh.frustumCulled = false;
	scene.add( mesh );

	function apply( next ) {

		uniforms.uDeep.value.setHex( next.ocean.deep );
		uniforms.uShallow.value.setHex( next.ocean.shallow );
		uniforms.uSparkle.value.setHex( next.ocean.sparkle );
		uniforms.uHorizon.value.setHex( next.sky.horizon );
		uniforms.uTop.value.setHex( next.sky.top );
		uniforms.uFogColor.value.setHex( next.fog.color );
		uniforms.uFogNear.value = next.fog.near;
		uniforms.uFogFar.value = next.fog.far;

	}

	return {
		mesh,
		uniforms,
		apply,
		update( delta, sunDirection ) {

			uniforms.uTime.value += delta;
			uniforms.uSunDir.value.copy( sunDirection );

		},
		waveHeight( x, z ) {

			const t = uniforms.uTime.value;
			return Math.sin( x * 0.042 + t * 0.85 ) * 0.11
				+ Math.sin( z * 0.061 - t * 1.15 ) * 0.07
				+ Math.sin( ( x + z ) * 0.13 + t * 1.9 ) * 0.028;

		}
	};

}
