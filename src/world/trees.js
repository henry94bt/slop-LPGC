import * as THREE from 'three';

const GREENS = [ 0x3f5f34, 0x4c6b3a, 0x35562f, 0x577543, 0x2f4b2c ];

function hash( value ) {

	let h = 2166136261;
	for ( let i = 0; i < value.length; i ++ ) {

		h ^= value.charCodeAt( i );
		h = Math.imul( h, 16777619 );

	}

	return h >>> 0;

}

function sample( road, step, onPoint ) {

	let distance = 0;
	let next = 18;

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

export function createTrees( { data, coastField, castShadows = true } ) {

	const group = new THREE.Group();
	group.name = 'arbolado';
	const transforms = [];
	const colors = [];
	const allowed = new Set( [ 'primary', 'secondary', 'tertiary', 'residential', 'pedestrian' ] );

	for ( const road of data.roads ) {

		if ( transforms.length >= 190 ) break;
		if ( ! allowed.has( road.k ) || road.w < 8 ) continue;
		const h = hash( road.n + road.p[ 0 ][ 0 ] );
		if ( h % 4 === 0 ) continue;

		sample( road, 62 + ( h % 22 ), ( p ) => {

			if ( transforms.length >= 190 ) return;
			if ( Math.hypot( p.x, p.z ) > 5000 ) return;
			const nx = p.tz;
			const nz = - p.tx;
			const offset = road.w / 2 + 2.1;
			const side = h % 2 === 0 ? 1 : - 1;
			const x = p.x + nx * offset * side;
			const z = p.z + nz * offset * side;
			if ( ! coastField.isLand( x, z, 0.5 ) ) return;
			if ( Math.hypot( x - 334, z + 570 ) < 14 ) return;
			const scale = 0.8 + ( ( h + transforms.length ) % 7 ) * 0.07;
			const matrix = new THREE.Matrix4();
			matrix.compose(
				new THREE.Vector3( x, 0.03, z ),
				new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), ( h % 360 ) * Math.PI / 180 ),
				new THREE.Vector3( scale, scale, scale )
			);
			transforms.push( matrix );
			colors.push( GREENS[ ( h + transforms.length ) % GREENS.length ] );

		} );

	}

	const count = transforms.length;
	const trunkGeometry = new THREE.CylinderGeometry( 0.16, 0.24, 3.1, 7 );
	trunkGeometry.translate( 0, 1.55, 0 );
	const trunk = new THREE.InstancedMesh(
		trunkGeometry,
		new THREE.MeshStandardMaterial( { color: 0x4b3a2a, roughness: 0.95 } ),
		count
	);
	const canopy = new THREE.InstancedMesh(
		new THREE.IcosahedronGeometry( 1.8, 1 ),
		new THREE.MeshStandardMaterial( { color: 0xffffff, roughness: 0.9, flatShading: true } ),
		count
	);
	const canopy2 = new THREE.InstancedMesh(
		new THREE.IcosahedronGeometry( 1.25, 1 ),
		canopy.material,
		count
	);

	for ( let i = 0; i < count; i ++ ) {

		const m = transforms[ i ];
		trunk.setMatrixAt( i, m );

		const position = new THREE.Vector3();
		const quaternion = new THREE.Quaternion();
		const scale = new THREE.Vector3();
		m.decompose( position, quaternion, scale );

		const p1 = new THREE.Matrix4().compose(
			new THREE.Vector3( position.x, 3.7 * scale.y, position.z ),
			quaternion,
			new THREE.Vector3( scale.x, scale.y * 0.9, scale.z )
		);
		canopy.setMatrixAt( i, p1 );

		const p2 = new THREE.Matrix4().compose(
			new THREE.Vector3( position.x + 0.5, 4.35 * scale.y, position.z - 0.2 ),
			quaternion,
			new THREE.Vector3( scale.x * 0.72, scale.y * 0.7, scale.z * 0.72 )
		);
		canopy2.setMatrixAt( i, p2 );
		canopy.setColorAt( i, new THREE.Color( colors[ i ] ) );
		canopy2.setColorAt( i, new THREE.Color( colors[ i ] ) );

	}

	trunk.castShadow = castShadows;
	canopy.castShadow = castShadows;
	canopy2.castShadow = castShadows;
	trunk.instanceMatrix.needsUpdate = true;
	canopy.instanceMatrix.needsUpdate = true;
	canopy2.instanceMatrix.needsUpdate = true;
	if ( canopy.instanceColor ) canopy.instanceColor.needsUpdate = true;
	if ( canopy2.instanceColor ) canopy2.instanceColor.needsUpdate = true;
	group.add( trunk, canopy, canopy2 );
	return group;

}
