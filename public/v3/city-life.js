import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function walkRoad( road, step, cb ) {

	let distance = 0;
	let next = 4;

	for ( let i = 1; i < road.p.length; i ++ ) {

		const a = road.p[ i - 1 ];
		const b = road.p[ i ];
		const dx = b[ 0 ] - a[ 0 ];
		const dz = b[ 1 ] - a[ 1 ];
		const length = Math.hypot( dx, dz );
		if ( length < 0.001 ) continue;
		const tx = dx / length;
		const tz = dz / length;

		while ( next <= distance + length ) {

			const k = ( next - distance ) / length;
			cb( a[ 0 ] + dx * k, a[ 1 ] + dz * k, tx, tz, road );
			next += step;

		}

		distance += length;

	}

}

function hash( value ) {

	let h = 2166136261;
	for ( let i = 0; i < value.length; i ++ ) {

		h ^= value.charCodeAt( i );
		h = Math.imul( h, 16777619 );

	}

	return h >>> 0;

}

const CAR_COLORS = [ 0xe8b62e, 0xdedbd2, 0x9d2f2a, 0x1f3f62, 0x3e4a45, 0x6f7376, 0xc8c3b6 ];
const SHIRTS = [ 0x9d3b34, 0x294c68, 0x396347, 0xc59b4c, 0x6a4f39, 0xd7d2c6 ];

export function buildCityLife( roads ) {

	const group = new THREE.Group();
	group.name = 'vida-calle';

	// marcas viales
	const positions = [];
	const normals = [];
	const indices = [];
	const paintRoads = roads.filter( r => [ 'primary', 'secondary', 'tertiary' ].includes( r.k ) && r.w >= 8 );

	for ( const road of paintRoads ) {

		walkRoad( road, 9, ( x, z, tx, tz, r ) => {

			const nx = - tz;
			const nz = tx;
			const half = 0.075;
			const dash = 3.2;
			const ax = x - tx * dash / 2;
			const az = z - tz * dash / 2;
			const bx = x + tx * dash / 2;
			const bz = z + tz * dash / 2;
			const base = positions.length / 3;
			positions.push(
				ax + nx * half, 0.033, az + nz * half,
				ax - nx * half, 0.033, az - nz * half,
				bx + nx * half, 0.033, bz + nz * half,
				bx - nx * half, 0.033, bz - nz * half
			);
			for ( let k = 0; k < 4; k ++ ) normals.push( 0, 1, 0 );
			indices.push( base, base + 1, base + 2, base + 2, base + 1, base + 3 );

		} );

	}

	const paintGeo = new THREE.BufferGeometry();
	paintGeo.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
	paintGeo.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
	paintGeo.setIndex( indices );
	paintGeo.computeBoundingSphere();
	const paint = new THREE.Mesh( paintGeo, new THREE.MeshStandardNodeMaterial( {
		color: 0xe4d8c0,
		roughness: 0.9,
		side: THREE.DoubleSide
	} ) );
	paint.receiveShadow = true;
	group.add( paint );

	// farolas
	const lampSpots = [];
	const lampRoads = roads.filter( r => [ 'primary', 'secondary', 'tertiary', 'residential' ].includes( r.k ) && r.w >= 8 );

	for ( const road of lampRoads ) {

		if ( lampSpots.length >= 380 ) break;
		walkRoad( road, 34, ( x, z, tx, tz ) => {

			if ( lampSpots.length >= 380 ) return;
			const side = lampSpots.length % 2 === 0 ? 1 : - 1;
			const nx = - tz;
			const nz = tx;
			lampSpots.push( {
				x: x + nx * side * ( road.w / 2 + 1.2 ),
				z: z + nz * side * ( road.w / 2 + 1.2 ),
				yaw: Math.atan2( tx, tz )
			} );

		} );

	}

	const poleGeo = new THREE.CylinderGeometry( 0.07, 0.1, 5.6, 7 );
	poleGeo.translate( 0, 2.8, 0 );
	const globeGeo = new THREE.SphereGeometry( 0.22, 8, 6 );
	const lampPole = new THREE.InstancedMesh(
		poleGeo,
		new THREE.MeshStandardNodeMaterial( { color: 0x20282b, roughness: 0.4, metalness: 0.7 } ),
		lampSpots.length
	);
	const lampGlobe = new THREE.InstancedMesh(
		globeGeo,
		new THREE.MeshStandardNodeMaterial( { color: 0xfff1d4, emissive: 0xffdfae, emissiveIntensity: 2.2, roughness: 0.3 } ),
		lampSpots.length
	);
	const dummy = new THREE.Object3D();
	lampSpots.forEach( ( p, i ) => {

		dummy.position.set( p.x, 0, p.z );
		dummy.rotation.set( 0, p.yaw, 0 );
		dummy.scale.set( 1, 1, 1 );
		dummy.updateMatrix();
		lampPole.setMatrixAt( i, dummy.matrix );
		dummy.position.y = 5.65;
		dummy.updateMatrix();
		lampGlobe.setMatrixAt( i, dummy.matrix );

	} );
	lampPole.castShadow = true;
	lampPole.frustumCulled = false;
	lampGlobe.frustumCulled = false;
	group.add( lampPole, lampGlobe );

	// árboles
	const treeSpots = [];
	const treeRoads = roads.filter( r => [ 'primary', 'secondary', 'tertiary', 'residential' ].includes( r.k ) && r.w >= 8 );

	for ( const road of treeRoads ) {

		if ( treeSpots.length >= 420 ) break;
		walkRoad( road, 28, ( x, z, tx, tz ) => {

			if ( treeSpots.length >= 420 ) return;
			const side = treeSpots.length % 2 === 0 ? 1 : - 1;
			const nx = - tz;
			const nz = tx;
			treeSpots.push( {
				x: x + nx * side * ( road.w / 2 + 2.6 ),
				z: z + nz * side * ( road.w / 2 + 2.6 ),
				scale: 0.8 + ( treeSpots.length % 5 ) * 0.08
			} );

		} );

	}

	const trunkGeo = new THREE.CylinderGeometry( 0.14, 0.21, 3.1, 7 );
	trunkGeo.translate( 0, 1.55, 0 );
	const trunk = new THREE.InstancedMesh(
		trunkGeo,
		new THREE.MeshStandardNodeMaterial( { color: 0x584331, roughness: 0.95 } ),
		treeSpots.length
	);
	const canopyGeo = new THREE.IcosahedronGeometry( 1.55, 1 );
	const canopy = new THREE.InstancedMesh(
		canopyGeo,
		new THREE.MeshStandardNodeMaterial( { color: 0xffffff, roughness: 0.92, flatShading: true } ),
		treeSpots.length
	);
	const green = new THREE.Color();
	treeSpots.forEach( ( p, i ) => {

		dummy.position.set( p.x, 0, p.z );
		dummy.rotation.set( 0, i, 0 );
		dummy.scale.set( p.scale, p.scale, p.scale );
		dummy.updateMatrix();
		trunk.setMatrixAt( i, dummy.matrix );
		dummy.position.y = 3.7 * p.scale;
		dummy.updateMatrix();
		canopy.setMatrixAt( i, dummy.matrix );
		canopy.setColorAt( i, green.setHex( [ 0x3f6238, 0x4e7242, 0x345534, 0x5b7a45 ][ i % 4 ] ) );

	} );
	trunk.castShadow = true;
	canopy.castShadow = true;
	trunk.frustumCulled = false;
	canopy.frustumCulled = false;
	group.add( trunk, canopy );

	// coches aparcados
	const carSpots = [];
	const carRoads = roads.filter( r => [ 'primary', 'secondary', 'tertiary', 'residential' ].includes( r.k ) && r.w >= 7 );

	for ( const road of carRoads ) {

		if ( carSpots.length >= 420 ) break;
		walkRoad( road, 58, ( x, z, tx, tz ) => {

			if ( carSpots.length >= 420 ) return;
			const side = carSpots.length % 2 === 0 ? 1 : - 1;
			const nx = - tz;
			const nz = tx;
			carSpots.push( {
				x: x + nx * side * ( road.w / 2 - 1.4 ),
				z: z + nz * side * ( road.w / 2 - 1.4 ),
				yaw: Math.atan2( tx, tz ) + ( side > 0 ? 0 : Math.PI )
			} );

		} );

	}

	const body = new THREE.InstancedMesh(
		new THREE.BoxGeometry( 1.8, 0.55, 4.2 ),
		new THREE.MeshStandardNodeMaterial( { color: 0xffffff, roughness: 0.35, metalness: 0.5 } ),
		carSpots.length
	);
	const cabin = new THREE.InstancedMesh(
		new THREE.BoxGeometry( 1.55, 0.55, 2.05 ),
		new THREE.MeshStandardNodeMaterial( { color: 0x18262b, roughness: 0.2, metalness: 0.4 } ),
		carSpots.length
	);
	const wheelParts = [];
	for ( const wx of [ - 0.9, 0.9 ] ) {

		for ( const wz of [ - 1.35, 1.35 ] ) {

			const wheel = new THREE.CylinderGeometry( 0.31, 0.31, 0.18, 8 );
			wheel.rotateZ( Math.PI / 2 );
			wheel.translate( wx, 0, wz );
			wheelParts.push( wheel );

		}

	}

	const wheels = new THREE.InstancedMesh(
		mergeGeometries( wheelParts ),
		new THREE.MeshStandardNodeMaterial( { color: 0x17191a, roughness: 0.95 } ),
		carSpots.length
	);
	carSpots.forEach( ( p, i ) => {

		dummy.position.set( p.x, 0.64, p.z );
		dummy.rotation.set( 0, p.yaw, 0 );
		dummy.scale.set( 1, 1, 1 );
		dummy.updateMatrix();
		body.setMatrixAt( i, dummy.matrix );
		body.setColorAt( i, green.setHex( CAR_COLORS[ i % CAR_COLORS.length ] ) );
		dummy.position.y = 1.16;
		dummy.updateMatrix();
		cabin.setMatrixAt( i, dummy.matrix );
		dummy.position.y = 0.33;
		dummy.updateMatrix();
		wheels.setMatrixAt( i, dummy.matrix );

	} );
	body.castShadow = true;
	cabin.castShadow = true;
	body.frustumCulled = false;
	cabin.frustumCulled = false;
	wheels.frustumCulled = false;
	group.add( body, cabin, wheels );

	// gente en las aceras
	const people = [];
	const peopleRoads = roads.filter( r => [ 'pedestrian', 'residential', 'tertiary', 'secondary' ].includes( r.k ) && r.w >= 5 );

	for ( const road of peopleRoads ) {

		if ( people.length >= 360 ) break;
		walkRoad( road, 64, ( x, z, tx, tz ) => {

			if ( people.length >= 360 ) return;
			const side = people.length % 2 === 0 ? 1 : - 1;
			const nx = - tz;
			const nz = tx;
			people.push( {
				x: x + nx * side * ( road.w / 2 + 1.7 ),
				z: z + nz * side * ( road.w / 2 + 1.7 ),
				yaw: Math.atan2( tx, tz )
			} );

		} );

	}

	const personBody = new THREE.InstancedMesh(
		new THREE.CylinderGeometry( 0.19, 0.23, 0.72, 7 ),
		new THREE.MeshStandardNodeMaterial( { color: 0xffffff, roughness: 0.9 } ),
		people.length
	);
	const personHead = new THREE.InstancedMesh(
		new THREE.SphereGeometry( 0.145, 7, 5 ),
		new THREE.MeshStandardNodeMaterial( { color: 0xc6976f, roughness: 0.9 } ),
		people.length
	);
	people.forEach( ( p, i ) => {

		dummy.position.set( p.x, 1.08, p.z );
		dummy.rotation.set( 0, p.yaw, 0 );
		dummy.scale.set( 1, 1, 1 );
		dummy.updateMatrix();
		personBody.setMatrixAt( i, dummy.matrix );
		personBody.setColorAt( i, green.setHex( SHIRTS[ i % SHIRTS.length ] ) );
		dummy.position.y = 1.6;
		dummy.updateMatrix();
		personHead.setMatrixAt( i, dummy.matrix );

	} );
	personBody.frustumCulled = false;
	personHead.frustumCulled = false;
	group.add( personBody, personHead );

	return { group, counts: { lamps: lampSpots.length, trees: treeSpots.length, cars: carSpots.length, people: people.length } };

}
