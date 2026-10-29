import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function colorize( geometry, hex ) {

	const color = new THREE.Color( hex );
	const count = geometry.attributes.position.count;
	const colors = new Float32Array( count * 3 );

	for ( let i = 0; i < count; i ++ ) {

		colors[ i * 3 ] = color.r;
		colors[ i * 3 + 1 ] = color.g;
		colors[ i * 3 + 2 ] = color.b;

	}

	geometry.setAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
	return geometry;

}

function box( w, h, d, x, y, z, color ) {

	const geometry = new THREE.BoxGeometry( w, h, d );
	geometry.translate( x, y, z );
	return colorize( geometry, color );

}

function benchGeometry() {

	const wood = 0x9d6f45;
	const woodLight = 0xb18152;
	const metal = 0x2c2e2d;

	const parts = [];

	// asiento
	for ( let i = 0; i < 4; i ++ ) {

		parts.push( box( 1.9, 0.055, 0.11, 0, 0.46, - 0.18 + i * 0.12, i % 2 ? woodLight : wood ) );

	}

	// respaldo inclinado
	for ( let i = 0; i < 3; i ++ ) {

		const back = box( 1.9, 0.09, 0.1, 0, 0.7 + i * 0.13, - 0.34 - i * 0.045, i % 2 ? woodLight : wood );
		back.rotateX( - 0.12 );
		back.translate( 0, 0.0, 0 );
		parts.push( back );

	}

	// patas y brazos
	for ( const sx of [ - 0.82, 0.82 ] ) {

		parts.push( box( 0.08, 0.46, 0.08, sx, 0.23, 0.18, metal ) );
		parts.push( box( 0.08, 0.46, 0.08, sx, 0.23, - 0.3, metal ) );
		parts.push( box( 0.07, 0.07, 0.58, sx, 0.56, - 0.05, metal ) );

	}

	return mergeGeometries( parts );

}

function binGeometry() {

	const body = new THREE.CylinderGeometry( 0.28, 0.24, 0.85, 10 );
	body.translate( 0, 0.43, 0 );
	colorize( body, 0x3e4a3f );

	const rim = new THREE.CylinderGeometry( 0.3, 0.3, 0.06, 10 );
	rim.translate( 0, 0.87, 0 );
	colorize( rim, 0x262b26 );

	return mergeGeometries( [ body, rim ] );

}

export function createFurniture( { promenade, coastField, pointAlong, castShadows = true } ) {

	const group = new THREE.Group();
	group.name = 'promenade-furniture';

	if ( ! promenade ) return { group };

	const benchSpots = [];
	const binSpots = [];
	let travelled = 0;

	for ( let i = 0; i < promenade.length - 1; i ++ ) {

		const a = promenade[ i ];
		const b = promenade[ i + 1 ];
		const segment = Math.hypot( b[ 0 ] - a[ 0 ], b[ 1 ] - a[ 1 ] );
		travelled += segment;

		if ( travelled < 46 ) continue;
		travelled = 0;

		const p = pointAlong( promenade, ( i + 0.5 ) / ( promenade.length - 1 ) );
		const q = coastField.query( p.x, p.z );
		const x = p.x + q.nx * 1.9;
		const z = p.z + q.nz * 1.9;
		const yaw = Math.atan2( - q.nx, - q.nz );

		benchSpots.push( { x, z, yaw } );
		if ( benchSpots.length % 2 === 0 ) binSpots.push( { x: x + q.nx * 1.4, z: z + q.nz * 1.4 } );

	}

	const benchGeo = benchGeometry();
	const benchMat = new THREE.MeshStandardMaterial( { vertexColors: true, roughness: 0.82, metalness: 0.05 } );
	const benches = new THREE.InstancedMesh( benchGeo, benchMat, benchSpots.length );
	const matrix = new THREE.Matrix4();
	const position = new THREE.Vector3();
	const quaternion = new THREE.Quaternion();
	const scale = new THREE.Vector3( 1, 1, 1 );
	const euler = new THREE.Euler();

	benchSpots.forEach( ( spot, i ) => {

		position.set( spot.x, 0.075, spot.z );
		euler.set( 0, spot.yaw, 0 );
		quaternion.setFromEuler( euler );
		matrix.compose( position, quaternion, scale );
		benches.setMatrixAt( i, matrix );

	} );

	benches.castShadow = castShadows;
	benches.receiveShadow = true;
	benches.name = 'promenade-benches';
	group.add( benches );

	if ( binSpots.length ) {

		const binGeo = binGeometry();
		const binMat = new THREE.MeshStandardMaterial( { vertexColors: true, roughness: 0.8, metalness: 0.1 } );
		const bins = new THREE.InstancedMesh( binGeo, binMat, binSpots.length );

		binSpots.forEach( ( spot, i ) => {

			position.set( spot.x, 0.075, spot.z );
			quaternion.identity();
			matrix.compose( position, quaternion, scale );
			bins.setMatrixAt( i, matrix );

		} );

		bins.castShadow = castShadows;
		bins.receiveShadow = true;
		group.add( bins );

	}

	return {
		group,
		benches: benchSpots.length,
		bins: binSpots.length
	};

}
