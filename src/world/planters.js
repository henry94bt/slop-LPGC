import * as THREE from 'three';

const LEAF = [ 0x3d5c35, 0x4a6b3b, 0x2f4d2c, 0x5b7747 ];

function hash( value ) {

	let h = 2166136261;
	for ( let i = 0; i < value.length; i ++ ) {

		h ^= value.charCodeAt( i );
		h = Math.imul( h, 16777619 );

	}

	return h >>> 0;

}

export function createPlanters( { promenade, pointAlong, coastField, castShadows = true } ) {

	const group = new THREE.Group();
	group.name = 'jardineras';
	const spots = [];
	let travelled = 0;

	for ( let i = 0; i < promenade.length - 1; i ++ ) {

		const a = promenade[ i ];
		const b = promenade[ i + 1 ];
		const segment = Math.hypot( b[ 0 ] - a[ 0 ], b[ 1 ] - a[ 1 ] );
		travelled += segment;
		if ( travelled < 27 ) continue;
		travelled = 0;
		const t = ( i + 0.5 ) / ( promenade.length - 1 );
		const p = pointAlong( promenade, t );
		const q = coastField.query( p.x, p.z );
		const side = spots.length % 2 === 0 ? 4.5 : - 4.2;
		const x = p.x + q.nx * side;
		const z = p.z + q.nz * side;
		if ( ! coastField.isLand( x, z, 0.5 ) ) continue;
		spots.push( { x, z, yaw: Math.atan2( p.tx, p.tz ), h: hash( `${i}` ) } );

	}

	const boxGeo = new THREE.BoxGeometry( 1.65, 0.62, 0.72 );
	boxGeo.translate( 0, 0.31, 0 );
	const box = new THREE.InstancedMesh(
		boxGeo,
		new THREE.MeshStandardMaterial( { color: 0x8d8172, roughness: 0.95 } ),
		spots.length
	);
	const bushGeo = new THREE.IcosahedronGeometry( 0.55, 1 );
	const bush = new THREE.InstancedMesh(
		bushGeo,
		new THREE.MeshStandardMaterial( { color: 0xffffff, roughness: 0.95, flatShading: true } ),
		spots.length * 2
	);
	const dummy = new THREE.Object3D();
	const color = new THREE.Color();

	for ( let i = 0; i < spots.length; i ++ ) {

		const s = spots[ i ];
		dummy.position.set( s.x, 0.01, s.z );
		dummy.rotation.set( 0, s.yaw, 0 );
		dummy.updateMatrix();
		box.setMatrixAt( i, dummy.matrix );

		for ( let k = 0; k < 2; k ++ ) {

			dummy.position.set( s.x + ( k ? 0.42 : - 0.4 ), 0.78 + ( k ? 0.08 : 0 ), s.z );
			dummy.scale.set( 1 + ( s.h % 4 ) * 0.05, 0.9 + ( s.h % 3 ) * 0.08, 1 );
			dummy.updateMatrix();
			bush.setMatrixAt( i * 2 + k, dummy.matrix );
			bush.setColorAt( i * 2 + k, color.setHex( LEAF[ ( s.h + k ) % LEAF.length ] ) );

		}

	}

	box.castShadow = castShadows;
	bush.castShadow = castShadows;
	box.receiveShadow = true;
	box.instanceMatrix.needsUpdate = true;
	bush.instanceMatrix.needsUpdate = true;
	if ( bush.instanceColor ) bush.instanceColor.needsUpdate = true;
	group.add( box, bush );
	return group;

}
