import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const COLORS = [ 0xf2f0e9, 0xd8d5cc, 0x2b3035, 0x8e1f24, 0x1f466b, 0x7c8a7a, 0xc9a24a, 0xe8e3d5 ];

function carBodyGeometry() {

	const parts = [];
	const body = new THREE.BoxGeometry( 1.78, 0.52, 4.1 );
	body.translate( 0, 0.62, 0 );
	parts.push( body );

	const hood = new THREE.BoxGeometry( 1.7, 0.18, 1.2 );
	hood.translate( 0, 0.9, 1.35 );
	parts.push( hood );

	const trunk = new THREE.BoxGeometry( 1.7, 0.16, 0.9 );
	trunk.translate( 0, 0.9, - 1.5 );
	parts.push( trunk );

	return mergeGeometries( parts );

}

function carCabinGeometry() {

	const geometry = new THREE.BoxGeometry( 1.52, 0.56, 1.95 );
	geometry.translate( 0, 1.14, - 0.18 );
	return geometry;

}

function carWheelsGeometry() {

	const parts = [];

	for ( const x of [ - 0.88, 0.88 ] ) {

		for ( const z of [ - 1.28, 1.28 ] ) {

			const wheel = new THREE.CylinderGeometry( 0.32, 0.32, 0.18, 10 );
			wheel.rotateZ( Math.PI / 2 );
			wheel.translate( x, 0.33, z );
			parts.push( wheel );

		}

	}

	return mergeGeometries( parts );

}

function hash( value ) {

	let h = 2166136261;

	for ( let i = 0; i < value.length; i ++ ) {

		h ^= value.charCodeAt( i );
		h = Math.imul( h, 16777619 );

	}

	return h >>> 0;

}

function sampleRoad( road, step, onPoint ) {

	let distance = 0;
	let next = 8;

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
			onPoint( {
				x: a[ 0 ] + dx * k,
				z: a[ 1 ] + dz * k,
				tx, tz
			} );
			next += step;

		}

		distance += length;

	}

}

export function createTraffic( { data, coastField, castShadows = true } ) {

	const group = new THREE.Group();
	group.name = 'trafico';

	const transforms = [];
	const colors = [];
	const allowed = new Set( [ 'primary', 'secondary', 'tertiary', 'residential', 'unclassified' ] );

	for ( const road of data.roads ) {

		if ( ! allowed.has( road.k ) || road.w < 6.5 ) continue;
		const h = hash( road.n + road.p[ 0 ][ 0 ] );
		if ( h % 3 === 0 ) continue;

		sampleRoad( road, 52 + ( h % 20 ), ( p ) => {

			if ( transforms.length >= 260 ) return;
			if ( Math.hypot( p.x, p.z ) > 5400 ) return;
			const nx = p.tz;
			const nz = - p.tx;
			const offset = road.w / 2 - 1.35;
			let side = h % 2 === 0 ? 1 : - 1;

			if ( ! coastField.isLand( p.x + nx * offset * side, p.z + nz * offset * side, 2 ) ) side *= - 1;
			if ( ! coastField.isLand( p.x + nx * offset * side, p.z + nz * offset * side, 2 ) ) return;

			const yaw = Math.atan2( p.tx, p.tz ) + ( side > 0 ? 0 : Math.PI );
			const matrix = new THREE.Matrix4();
			matrix.compose(
				new THREE.Vector3( p.x + nx * offset * side, 0.02, p.z + nz * offset * side ),
				new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), yaw ),
				new THREE.Vector3( 1, 1, 1 )
			);
			transforms.push( matrix );
			colors.push( COLORS[ ( h + transforms.length * 7 ) % COLORS.length ] );

		} );

	}

	const count = transforms.length;
	const body = new THREE.InstancedMesh(
		carBodyGeometry(),
		new THREE.MeshStandardMaterial( { color: 0xffffff, roughness: 0.34, metalness: 0.55 } ),
		count
	);
	const cabin = new THREE.InstancedMesh(
		carCabinGeometry(),
		new THREE.MeshStandardMaterial( { color: 0x182126, roughness: 0.18, metalness: 0.4 } ),
		count
	);
	const wheels = new THREE.InstancedMesh(
		carWheelsGeometry(),
		new THREE.MeshStandardMaterial( { color: 0x161616, roughness: 0.9 } ),
		count
	);

	body.name = 'coches';
	body.castShadow = castShadows;
	body.receiveShadow = true;
	cabin.castShadow = castShadows;
	wheels.castShadow = castShadows;

	for ( let i = 0; i < count; i ++ ) {

		body.setMatrixAt( i, transforms[ i ] );
		cabin.setMatrixAt( i, transforms[ i ] );
		wheels.setMatrixAt( i, transforms[ i ] );
		body.setColorAt( i, new THREE.Color( colors[ i ] ) );

	}

	body.instanceMatrix.needsUpdate = true;
	cabin.instanceMatrix.needsUpdate = true;
	wheels.instanceMatrix.needsUpdate = true;
	if ( body.instanceColor ) body.instanceColor.needsUpdate = true;

	group.add( body, cabin, wheels );
	return group;

}
