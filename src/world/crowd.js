import * as THREE from 'three';

const SHIRTS = [ 0xf2eadb, 0x2d4d68, 0xb84a3f, 0x5d7352, 0xd9a441, 0x6c5c7a, 0xe4e2dc, 0x2f3437 ];
const SKIN = [ 0xd8a77e, 0xb97c52, 0x8b5a3c, 0xe3b892, 0x6d432c ];
const PANTS = [ 0x27313a, 0x4b4f51, 0xb9b2a5, 0x2f3f4a, 0x6b5a47 ];

function torsoGeometry() {

	const geometry = new THREE.BoxGeometry( 0.34, 0.62, 0.2 );
	geometry.translate( 0, 1.13, 0 );
	return geometry;

}

function headGeometry() {

	const geometry = new THREE.SphereGeometry( 0.145, 8, 6 );
	geometry.translate( 0, 1.61, 0 );
	return geometry;

}

function legGeometry() {

	const geometry = new THREE.BoxGeometry( 0.13, 0.72, 0.15 );
	geometry.translate( 0, 0.42, 0 );
	return geometry;

}

function sampleRoad( road, step, onPoint ) {

	let distance = 0;
	let next = 12;

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
			onPoint( { x: a[ 0 ] + dx * k, z: a[ 1 ] + dz * k, tx, tz } );
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

export function createCrowd( { data, promenade, pointAlong, coastField, spawn = null, castShadows = false } ) {

	const group = new THREE.Group();
	group.name = 'gente';

	const placements = [];
	const walkers = [];
	let promenadeLength = 0;

	for ( let i = 1; i < promenade.length; i ++ ) promenadeLength += Math.hypot( promenade[ i ][ 0 ] - promenade[ i - 1 ][ 0 ], promenade[ i ][ 1 ] - promenade[ i - 1 ][ 1 ] );

	for ( let i = 0; i < 95; i ++ ) {

		const t = ( i * 0.6180339887 ) % 1;
		const offset = ( ( i % 2 ) ? 4.2 : - 3.4 ) + ( ( i * 7 ) % 5 ) * 0.55;
		const p = pointAlong( promenade, t );
		const q = coastField.query( p.x, p.z );
		const x = p.x + q.nx * offset;
		const z = p.z + q.nz * offset;
		if ( ! coastField.isLand( x, z, 0.4 ) ) continue;
		if ( spawn && Math.hypot( x - spawn.x, z - spawn.z ) < 28 ) continue;
		const index = placements.length;
		placements.push( {
			x, z,
			yaw: Math.atan2( p.tx, p.tz ),
			shirt: SHIRTS[ i % SHIRTS.length ],
			skin: SKIN[ i % SKIN.length ],
			pants: PANTS[ i % PANTS.length ]
		} );
		walkers.push( { index, t, offset, speed: ( i % 3 === 0 ? - 1 : 1 ) * ( 0.60 + ( i % 5 ) * 0.07 ) } );

	}

	// grupo cercano al punto de inicio, para que el paseo no salga vacío
	for ( let i = 0; i < 9; i ++ ) {

		const t = 0.198 + i * 0.004;
		const offset = i % 2 === 0 ? 3.2 + ( i % 3 ) * 0.8 : - 3.8 - ( i % 3 ) * 0.6;
		const p = pointAlong( promenade, t );
		const q = coastField.query( p.x, p.z );
		const x = p.x + q.nx * offset;
		const z = p.z + q.nz * offset;
		if ( ! coastField.isLand( x, z, 0.4 ) ) continue;
		const index = placements.length;
		placements.push( {
			x, z,
			yaw: Math.atan2( p.tx, p.tz ),
			shirt: SHIRTS[ ( i + 2 ) % SHIRTS.length ],
			skin: SKIN[ ( i + 1 ) % SKIN.length ],
			pants: PANTS[ ( i + 3 ) % PANTS.length ]
		} );
		walkers.push( { index, t, offset, speed: ( i % 2 ? 0.72 : - 0.52 ) } );

	}

	let roadPeople = 0;

	for ( const road of data.roads ) {

		if ( roadPeople >= 75 ) break;
		if ( ! [ 'pedestrian', 'residential', 'tertiary', 'secondary' ].includes( road.k ) ) continue;
		if ( road.w < 5 ) continue;
		const h = hash( road.n + road.p[ 0 ][ 0 ] );
		sampleRoad( road, 72 + ( h % 28 ), ( p ) => {

			if ( roadPeople >= 75 ) return;
			const nx = p.tz;
			const nz = - p.tx;
			const side = h % 2 === 0 ? 1 : - 1;
			const offset = road.w / 2 + 1.15;
			const x = p.x + nx * offset * side;
			const z = p.z + nz * offset * side;
			if ( ! coastField.isLand( x, z, 0.4 ) ) return;
			if ( Math.hypot( x, z ) > 5200 ) return;
			if ( spawn && Math.hypot( x - spawn.x, z - spawn.z ) < 24 ) return;
			roadPeople ++;
			placements.push( {
				x, z,
				yaw: Math.atan2( p.tx, p.tz ) + ( side > 0 ? 0 : Math.PI ),
				shirt: SHIRTS[ ( h + roadPeople ) % SHIRTS.length ],
				skin: SKIN[ ( h + roadPeople * 3 ) % SKIN.length ],
				pants: PANTS[ ( h + roadPeople * 5 ) % PANTS.length ]
			} );

		} );

	}

	const count = placements.length;
	const torsoMat = new THREE.MeshStandardMaterial( { color: 0xffffff, roughness: 0.85 } );
	const headMat = new THREE.MeshStandardMaterial( { color: 0xffffff, roughness: 0.9 } );
	const legMat = new THREE.MeshStandardMaterial( { color: 0xffffff, roughness: 0.95 } );
	const torso = new THREE.InstancedMesh( torsoGeometry(), torsoMat, count );
	const head = new THREE.InstancedMesh( headGeometry(), headMat, count );
	const leftLeg = new THREE.InstancedMesh( legGeometry(), legMat, count );
	const rightLeg = new THREE.InstancedMesh( legGeometry(), legMat, count );

	torso.castShadow = castShadows;
	head.castShadow = castShadows;

	const dummy = new THREE.Object3D();
	const color = new THREE.Color();

	function write( i, x, z, yaw, bob = 0 ) {

		dummy.position.set( x, 0.04 + bob, z );
		dummy.rotation.set( 0, yaw, 0 );
		dummy.updateMatrix();
		torso.setMatrixAt( i, dummy.matrix );
		head.setMatrixAt( i, dummy.matrix );
		dummy.position.x += Math.cos( yaw ) * 0.09;
		dummy.position.z -= Math.sin( yaw ) * 0.09;
		dummy.updateMatrix();
		leftLeg.setMatrixAt( i, dummy.matrix );
		dummy.position.x -= Math.cos( yaw ) * 0.18;
		dummy.position.z += Math.sin( yaw ) * 0.18;
		dummy.updateMatrix();
		rightLeg.setMatrixAt( i, dummy.matrix );

	}

	for ( let i = 0; i < count; i ++ ) {

		const p = placements[ i ];
		write( i, p.x, p.z, p.yaw );
		torso.setColorAt( i, color.setHex( p.shirt ) );
		head.setColorAt( i, color.setHex( p.skin ) );
		leftLeg.setColorAt( i, color.setHex( p.pants ) );
		rightLeg.setColorAt( i, color.setHex( p.pants ) );

	}

	for ( const mesh of [ torso, head, leftLeg, rightLeg ] ) {

		mesh.instanceMatrix.needsUpdate = true;
		if ( mesh.instanceColor ) mesh.instanceColor.needsUpdate = true;
		group.add( mesh );

	}

	function update( dt, time ) {

		for ( let w = 0; w < walkers.length; w ++ ) {

			const walker = walkers[ w ];
			const p = placements[ walker.index ];
			walker.t = ( walker.t + walker.speed * dt / promenadeLength + 1 ) % 1;
			const q = pointAlong( promenade, walker.t );
			const n = coastField.query( q.x, q.z );
			p.x = q.x + n.nx * walker.offset;
			p.z = q.z + n.nz * walker.offset;
			p.yaw = Math.atan2( q.tx, q.tz ) + ( walker.speed < 0 ? Math.PI : 0 );
			const bob = Math.sin( time * 5.6 + w ) * 0.018;
			write( walker.index, p.x, p.z, p.yaw, bob );

		}

		torso.instanceMatrix.needsUpdate = true;
		head.instanceMatrix.needsUpdate = true;
		leftLeg.instanceMatrix.needsUpdate = true;
		rightLeg.instanceMatrix.needsUpdate = true;

	}

	return { group, update, count };

}
