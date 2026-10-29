import * as THREE from 'three';
import { glowTexture } from '../utils/textures.js';

const vertexShader = /* glsl */`
	varying vec3 vDirection;

	void main() {

		vDirection = position;
		vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
		gl_Position = projectionMatrix * mvPosition;

	}
`;

const fragmentShader = /* glsl */`
	uniform vec3 uTop;
	uniform vec3 uHorizon;
	uniform vec3 uSun;
	uniform vec3 uGlow;
	uniform vec3 uCloud;
	uniform vec3 uCloudShadow;
	uniform vec3 uSunDir;
	uniform float uTime;
	uniform float uNight;

	varying vec3 vDirection;

	float hash( vec2 p ) {

		p = fract( p * vec2( 123.34, 456.21 ) );
		p += dot( p, p + 45.32 );
		return fract( p.x * p.y );

	}

	float noise( vec2 p ) {

		vec2 i = floor( p );
		vec2 f = fract( p );
		f = f * f * ( 3.0 - 2.0 * f );
		return mix( mix( hash( i ), hash( i + vec2( 1.0, 0.0 ) ), f.x ),
			mix( hash( i + vec2( 0.0, 1.0 ) ), hash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );

	}

	float fbm( vec2 p ) {

		float value = 0.0;
		float amplitude = 0.5;

		for ( int i = 0; i < 4; i ++ ) {

			value += noise( p ) * amplitude;
			p = p * 2.03 + vec2( 13.1, 7.7 );
			amplitude *= 0.5;

		}

		return value;

	}

	void main() {

		vec3 dir = normalize( vDirection );
		float height = clamp( dir.y, 0.0, 1.0 );
		float horizon = pow( 1.0 - height, 3.5 );

		vec3 color = mix( uHorizon, uTop, pow( height, 0.58 ) );
		color = mix( color, uHorizon, horizon * 0.42 );

		float sunDot = max( dot( dir, uSunDir ), 0.0 );
		float halo = pow( sunDot, 42.0 );
		float glow = pow( sunDot, 5.0 );
		color += uGlow * ( glow * 0.22 + halo * 0.5 );

		float disc = smoothstep( 0.99955, 0.99985, sunDot );
		color = mix( color, uSun, disc );

		// nubes bajas, cálidas
		vec2 cloudUv = dir.xz / max( 0.11, dir.y + 0.18 ) * 1.35;
		cloudUv += vec2( uTime * 0.0025, uTime * 0.0007 );
		float clouds = fbm( cloudUv * 1.15 );
		float clouds2 = fbm( cloudUv * 2.7 + vec2( 4.2, 1.7 ) );
		float cloudMask = smoothstep( 0.44, 0.68, clouds * 0.75 + clouds2 * 0.35 );
		cloudMask *= smoothstep( 0.02, 0.16, dir.y ) * smoothstep( 0.58, 0.16, dir.y );
		vec3 cloudColor = mix( uCloudShadow, uCloud, smoothstep( 0.3, 0.85, clouds ) );
		color = mix( color, cloudColor, cloudMask * 0.62 );

		// estrellas tenues
		float starField = step( 0.99955, hash( floor( dir.xz * 1400.0 ) ) );
		color += starField * uNight * smoothstep( 0.15, 0.7, dir.y ) * vec3( 0.75, 0.85, 1.0 );

		gl_FragColor = vec4( color, 1.0 );

	}
`;

export function createSky( scene ) {

	const uniforms = {
		uTop: { value: new THREE.Color( 0x35577f ) },
		uHorizon: { value: new THREE.Color( 0xffb27a ) },
		uSun: { value: new THREE.Color( 0xffe6bd ) },
		uGlow: { value: new THREE.Color( 0xff9a5e ) },
		uCloud: { value: new THREE.Color( 0xffc197 ) },
		uCloudShadow: { value: new THREE.Color( 0x8e6873 ) },
		uSunDir: { value: new THREE.Vector3( 0, 0.2, - 1 ).normalize() },
		uTime: { value: 0 },
		uNight: { value: 0 }
	};

	const material = new THREE.ShaderMaterial( {
		uniforms,
		vertexShader,
		fragmentShader,
		side: THREE.BackSide,
		depthWrite: false,
		fog: false
	} );

	const mesh = new THREE.Mesh( new THREE.SphereGeometry( 12000, 48, 32 ), material );
	mesh.frustumCulled = false;
	mesh.renderOrder = - 1000;
	scene.add( mesh );

	const sunGlow = new THREE.Sprite( new THREE.SpriteMaterial( {
		map: glowTexture(),
		color: 0xff8a4e,
		transparent: true,
		opacity: 0.5,
		blending: THREE.AdditiveBlending,
		depthWrite: false,
		depthTest: true,
		fog: false
	} ) );
	sunGlow.scale.set( 1400, 1400, 1 );
	sunGlow.frustumCulled = false;
	scene.add( sunGlow );

	return {
		mesh,
		sunGlow,
		uniforms,
		update( delta, preset, sunDirection, camera ) {

			uniforms.uTime.value += delta;
			uniforms.uSunDir.value.copy( sunDirection );
			uniforms.uTop.value.setHex( preset.sky.top );
			uniforms.uHorizon.value.setHex( preset.sky.horizon );
			uniforms.uSun.value.setHex( preset.sky.sun );
			uniforms.uGlow.value.setHex( preset.sky.glow );
			uniforms.uCloud.value.setHex( preset.sky.cloud );
			uniforms.uCloudShadow.value.setHex( preset.sky.cloudShadow );
			uniforms.uNight.value = preset.id === 'noche' ? 1 : 0;

			if ( camera ) {

				sunGlow.position.copy( camera.position ).addScaledVector( sunDirection, 9000 );
				sunGlow.material.color.setHex( preset.id === 'noche' ? 0x9fb9df : preset.sky.glow );
				sunGlow.material.opacity = preset.id === 'noche' ? 0.28 : 0.48;
				sunGlow.scale.setScalar( preset.id === 'noche' ? 900 : 1400 );

			}

		}
	};

}
