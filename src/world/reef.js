import * as THREE from 'three';

function mulberry32( seed ) {

	let a = seed >>> 0;
	return function () {

		a += 0x6D2B79F5;
		let t = a;
		t = Math.imul( t ^ ( t >>> 15 ), t | 1 );
		t ^= t + Math.imul( t ^ ( t >>> 7 ), t | 61 );
		return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296;

	};

}

/**
 * La Barra de Las Canteras: el arrecife volcánico que protege la playa.
 * Se genera como una cadena de bloques de basalto paralela a la orilla.
 */
export function createReef( { promenade, coastField, pointAlong } ) {

	const random = mulberry32( 9173 );
	const group = new THREE.Group();
	group.name = 'la-barra-reef';

	const geometry = new THREE.IcosahedronGeometry( 1, 0 );
	const material = new THREE.MeshStandardMaterial( {
		color: 0x34302b,
		roughness: 1,
		metalness: 0.02,
		flatShading: true
	} );

	const placements = [];

	if ( promenade ) {

		for ( let i = 0; i < 74; i ++ ) {

			const t = 0.12 + ( i / 73 ) * 0.68;
			const p = pointAlong( promenade, t );
			const q = coastField.query( p.x, p.z );
			const offshore = 185 + Math.sin( i * 0.37 ) * 26 + random() * 16;
			const x = p.x - q.nx * offshore + ( random() - 0.5 ) * 14;
			const z = p.z - q.nz * offshore + ( random() - 0.5 ) * 14;
			const s = 1.5 + random() * 3.2;
			placements.push( { x, z, s, ry: random() * Math.PI * 2 } );

		}

	}

	const mesh = new THREE.InstancedMesh( geometry, material, placements.length );
	mesh.name = 'la-barra-rocks';
	mesh.castShadow = false;
	mesh.receiveShadow = true;
	mesh.frustumCulled = false;

	const matrix = new THREE.Matrix4();
	const position = new THREE.Vector3();
	const quaternion = new THREE.Quaternion();
	const scale = new THREE.Vector3();
	const euler = new THREE.Euler();

	placements.forEach( ( p, i ) => {

		position.set( p.x, - 0.55 + p.s * 0.22, p.z );
		euler.set( random() * 0.3, p.ry, random() * 0.25 );
		quaternion.setFromEuler( euler );
		scale.set( p.s * ( 1.1 + random() * 0.8 ), p.s * ( 0.42 + random() * 0.3 ), p.s );
		matrix.compose( position, quaternion, scale );
		mesh.setMatrixAt( i, matrix );

	} );

	mesh.instanceMatrix.needsUpdate = true;
	group.add( mesh );

	// bajío: una mancha de agua más clara y espumosa alrededor de la barra
	const foamMat = new THREE.MeshBasicMaterial( {
		color: 0xe8f3ee,
		transparent: true,
		opacity: 0.1,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		side: THREE.DoubleSide
	} );

	for ( let i = 0; i < placements.length; i += 3 ) {

		const p = placements[ i ];
		const patch = new THREE.Mesh( new THREE.CircleGeometry( 7 + random() * 8, 18 ), foamMat );
		patch.rotation.x = - Math.PI / 2;
		patch.position.set( p.x, 0.0, p.z );
		patch.renderOrder = 2;
		group.add( patch );

	}

	return {
		group,
		placements
	};

}
