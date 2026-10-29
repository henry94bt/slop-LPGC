import * as THREE from 'three';

const MAX_POINTS = 72;
const MAX_AGE = 3.4;

export function createWake( scene ) {

	const positions = new Float32Array( MAX_POINTS * 2 * 3 );
	const alphas = new Float32Array( MAX_POINTS * 2 );
	const indices = [];

	for ( let i = 0; i < MAX_POINTS - 1; i ++ ) {

		const a = i * 2;
		indices.push( a, a + 2, a + 1, a + 1, a + 2, a + 3 );

	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
	geometry.setAttribute( 'aAlpha', new THREE.BufferAttribute( alphas, 1 ) );
	geometry.setIndex( indices );
	geometry.setDrawRange( 0, 0 );

	const material = new THREE.ShaderMaterial( {
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		side: THREE.DoubleSide,
		uniforms: {
			uColor: { value: new THREE.Color( 0xf4fbf7 ) }
		},
		vertexShader: /* glsl */`
			attribute float aAlpha;
			varying float vAlpha;
			void main() {
				vAlpha = aAlpha;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}
		`,
		fragmentShader: /* glsl */`
			uniform vec3 uColor;
			varying float vAlpha;
			void main() {
				gl_FragColor = vec4( uColor, vAlpha );
			}
		`
	} );

	const mesh = new THREE.Mesh( geometry, material );
	mesh.frustumCulled = false;
	mesh.renderOrder = 2;
	mesh.visible = false;
	scene.add( mesh );

	const trail = [];
	let timer = 0;
	let lastX = 0;
	let lastZ = 0;

	return {
		mesh,
		clear() {

			trail.length = 0;
			geometry.setDrawRange( 0, 0 );
			mesh.visible = false;

		},
		update( delta, x, z, heading, speed ) {

			if ( speed < 0.35 ) {

				mesh.visible = trail.length > 1;

			} else {

				mesh.visible = true;
				timer += delta;

				const dx = x - lastX;
				const dz = z - lastZ;

				if ( timer > 0.07 || dx * dx + dz * dz > 0.16 ) {

					timer = 0;
					lastX = x;
					lastZ = z;
					trail.unshift( { x, z, heading, age: 0 } );
					if ( trail.length > MAX_POINTS ) trail.pop();

				}

			}

			for ( let i = trail.length - 1; i >= 0; i -- ) {

				trail[ i ].age += delta;
				if ( trail[ i ].age > MAX_AGE ) trail.splice( i, 1 );

			}

			const count = trail.length;

			if ( count < 2 ) {

				geometry.setDrawRange( 0, 0 );
				return;

			}

			for ( let i = 0; i < count; i ++ ) {

				const point = trail[ i ];
				const f = i / Math.max( 1, count - 1 );
				const fade = Math.pow( 1 - f, 1.15 ) * 0.55;
				const width = ( 0.95 - f * 0.55 ) * ( 1 - point.age / MAX_AGE );

				const nx = Math.cos( point.heading );
				const nz = - Math.sin( point.heading );
				const idx = i * 2;

				positions[ idx * 3 ] = point.x + nx * width;
				positions[ idx * 3 + 1 ] = - 0.08;
				positions[ idx * 3 + 2 ] = point.z + nz * width;

				positions[ ( idx + 1 ) * 3 ] = point.x - nx * width;
				positions[ ( idx + 1 ) * 3 + 1 ] = - 0.08;
				positions[ ( idx + 1 ) * 3 + 2 ] = point.z - nz * width;

				alphas[ idx ] = fade;
				alphas[ idx + 1 ] = fade;

			}

			geometry.attributes.position.needsUpdate = true;
			geometry.attributes.aAlpha.needsUpdate = true;
			geometry.setDrawRange( 0, ( count - 1 ) * 6 );

		}
	};

}
