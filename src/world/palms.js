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

function pushVertex( target, x, y, z, color ) {

	target.positions.push( x, y, z );
	target.colors.push( color.r, color.g, color.b );

}

function pushTri( target, a, b, c ) {

	target.indices.push( a, b, c );

}

function palmGeometry( random ) {

	const target = {
		positions: [],
		colors: [],
		indices: []
	};

	const trunkBase = new THREE.Color( 0x7b5b40 );
	const trunkLight = new THREE.Color( 0x9b7754 );
	const trunkDark = new THREE.Color( 0x5d432f );
	const frondBase = new THREE.Color( 0x3c5c2b );
	const frondTip = new THREE.Color( 0x84954e );
	const skirtColor = new THREE.Color( 0x6c4a2e );
	const dateColor = new THREE.Color( 0xb96f2f );

	const trunkHeight = 8.6;
	const radial = 8;
	const rings = 14;
	const lean = 0.55;

	// tronco
	const ringStarts = [];

	for ( let r = 0; r <= rings; r ++ ) {

		const t = r / rings;
		const y = t * trunkHeight;
		const radius = 0.24 + 0.28 * Math.pow( 1 - t, 1.8 ) + 0.045 * Math.sin( t * 34 );
		const cx = lean * t * t;
		const start = target.positions.length / 3;

		for ( let s = 0; s < radial; s ++ ) {

			const angle = ( s / radial ) * Math.PI * 2;
			const color = t < 0.08 ? trunkDark : ( r % 2 === 0 ? trunkBase : trunkLight );
			pushVertex( target, cx + Math.cos( angle ) * radius, y, Math.sin( angle ) * radius, color );

		}

		ringStarts.push( start );

	}

	for ( let r = 0; r < rings; r ++ ) {

		for ( let s = 0; s < radial; s ++ ) {

			const a = ringStarts[ r ] + s;
			const b = ringStarts[ r ] + ( s + 1 ) % radial;
			const c = ringStarts[ r + 1 ] + ( s + 1 ) % radial;
			const d = ringStarts[ r + 1 ] + s;
			pushTri( target, a, b, c );
			pushTri( target, a, c, d );

		}

	}

	// base de la corona
	const crownCenter = new THREE.Vector3( lean, trunkHeight, 0 );
	const crownStart = target.positions.length / 3;

	for ( let s = 0; s < 8; s ++ ) {

		const angle = ( s / 8 ) * Math.PI * 2;
		pushVertex( target, crownCenter.x, crownCenter.y - 0.15, 0, trunkDark );
		pushVertex( target, crownCenter.x + Math.cos( angle ) * 0.55, crownCenter.y + 0.35, Math.sin( angle ) * 0.55, skirtColor );

	}

	for ( let s = 0; s < 8; s ++ ) {

		const a = crownStart + s * 2;
		const b = crownStart + ( ( s + 1 ) % 8 ) * 2;
		pushTri( target, a, b, a + 1 );
		pushTri( target, a + 1, b, b + 1 );

	}

	// frondas
	const fronds = 17;

	for ( let f = 0; f < fronds; f ++ ) {

		const upper = f < 10;
		const angle = ( f / fronds ) * Math.PI * 2 + random() * 0.28;
		const dirX = Math.cos( angle );
		const dirZ = Math.sin( angle );
		const length = ( upper ? 4.4 : 3.7 ) + random() * 0.85;
		const lift = upper ? 0.95 : 0.2;
		const droop = upper ? 2.2 : 2.9;
		const width = upper ? 0.62 : 0.5;
		const segments = 7;
		const baseColor = frondBase.clone().lerp( frondTip, 0.12 + random() * 0.2 );

		let prevLeft = - 1;
		let prevCenter = - 1;
		let prevRight = - 1;

		for ( let s = 0; s <= segments; s ++ ) {

			const t = s / segments;
			const radialDistance = 0.42 + length * t;
			const y = crownCenter.y + lift * Math.sin( t * Math.PI * 0.52 ) - droop * t * t;
			const taper = Math.sin( Math.min( 1, t * 1.12 ) * Math.PI * 0.78 );
			const halfWidth = width * ( 0.12 + 0.88 * taper ) * 0.5;
			const centerLift = 0.1 * ( 1 - t );
			const x = crownCenter.x + dirX * radialDistance;
			const z = crownCenter.z + dirZ * radialDistance;
			const px = - dirZ;
			const pz = dirX;
			const color = baseColor.clone().lerp( frondTip, t * 0.8 );

			const left = target.positions.length / 3;
			pushVertex( target, x + px * halfWidth, y, z + pz * halfWidth, color );
			const center = target.positions.length / 3;
			pushVertex( target, x, y + centerLift, z, color.clone().multiplyScalar( 1.04 ) );
			const right = target.positions.length / 3;
			pushVertex( target, x - px * halfWidth, y, z - pz * halfWidth, color );

			if ( s > 0 ) {

				pushTri( target, prevLeft, left, prevCenter );
				pushTri( target, prevCenter, left, center );
				pushTri( target, prevCenter, center, prevRight );
				pushTri( target, prevRight, center, right );

			}

			prevLeft = left;
			prevCenter = center;
			prevRight = right;

		}

	}

	// faldón de frondas secas
	for ( let f = 0; f < 7; f ++ ) {

		const angle = ( f / 7 ) * Math.PI * 2 + 0.3;
		const dirX = Math.cos( angle );
		const dirZ = Math.sin( angle );
		const length = 1.9 + random() * 0.5;
		const segments = 3;

		for ( let s = 0; s <= segments; s ++ ) {

			const t = s / segments;
			const x = crownCenter.x + dirX * ( 0.25 + length * t );
			const z = crownCenter.z + dirZ * ( 0.25 + length * t );
			const y = crownCenter.y - 0.2 - t * 1.7;
			const width = 0.34 * ( 1 - t * 0.7 );
			const px = - dirZ;
			const pz = dirX;
			const index = target.positions.length / 3;
			const color = skirtColor.clone().multiplyScalar( 0.82 + t * 0.2 );
			pushVertex( target, x + px * width, y, z + pz * width, color );
			pushVertex( target, x - px * width, y, z - pz * width, color );
			if ( s > 0 ) pushTri( target, index - 2, index, index - 1 ), pushTri( target, index - 1, index, index + 1 );

		}

	}

	// dátiles
	for ( let d = 0; d < 4; d ++ ) {

		const angle = random() * Math.PI * 2;
		const radius = 0.5 + random() * 0.35;
		const cx = crownCenter.x + Math.cos( angle ) * radius;
		const cz = crownCenter.z + Math.sin( angle ) * radius;
		const cy = crownCenter.y - 0.45 - random() * 0.2;
		const start = target.positions.length / 3;
		const size = 0.16 + random() * 0.07;

		for ( let i = 0; i < 6; i ++ ) {

			const a = i / 6 * Math.PI * 2;
			pushVertex( target, cx, cy + size, cz, dateColor );
			pushVertex( target, cx + Math.cos( a ) * size, cy - size * 0.4, cz + Math.sin( a ) * size, dateColor );

		}

		for ( let i = 0; i < 6; i ++ ) {

			const a = start + 1 + i * 2;
			const b = start + 1 + ( ( i + 1 ) % 6 ) * 2;
			pushTri( target, start, a, b );
			pushTri( target, start + 1 + ( ( i + 1 ) % 6 ) * 2, a, start + 1 );

		}

	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( target.positions, 3 ) );
	geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( target.colors, 3 ) );
	geometry.setIndex( target.indices );
	geometry.computeVertexNormals();
	geometry.computeBoundingSphere();
	return geometry;

}

function pointInPolygon( x, z, poly ) {

	let inside = false;

	for ( let i = 0, j = poly.length - 1; i < poly.length; j = i ++ ) {

		const xi = poly[ i ][ 0 ], zi = poly[ i ][ 1 ];
		const xj = poly[ j ][ 0 ], zj = poly[ j ][ 1 ];
		const intersect = ( ( zi > z ) !== ( zj > z ) ) && ( x < ( xj - xi ) * ( z - zi ) / ( zj - zi ) + xi );
		if ( intersect ) inside = ! inside;

	}

	return inside;

}

function polygonArea( poly ) {

	let sum = 0;

	for ( let i = 0, j = poly.length - 1; i < poly.length; j = i ++ ) {

		sum += poly[ j ][ 0 ] * poly[ i ][ 1 ] - poly[ i ][ 0 ] * poly[ j ][ 1 ];

	}

	return Math.abs( sum ) / 2;

}

function sampleAlong( points, spacing, callback, random ) {

	let carry = 0;

	for ( let i = 0; i < points.length - 1; i ++ ) {

		const a = points[ i ];
		const b = points[ i + 1 ];
		const length = Math.hypot( b[ 0 ] - a[ 0 ], b[ 1 ] - a[ 1 ] );

		if ( length < 0.01 ) continue;
		let travelled = carry;

		while ( travelled < length ) {

			const t = travelled / length;
			callback(
				a[ 0 ] + ( b[ 0 ] - a[ 0 ] ) * t,
				a[ 1 ] + ( b[ 1 ] - a[ 1 ] ) * t,
				( b[ 0 ] - a[ 0 ] ) / length,
				( b[ 1 ] - a[ 1 ] ) / length,
				random
			);
			travelled += spacing;

		}

		carry = travelled - length;

	}

}

export function createPalms( data, {
	promenade,
	coastField,
	blocked,
	exclusions = [],
	castShadows = true
} ) {

	const random = mulberry32( 80213 );
	const geometry = palmGeometry( random );
	const material = new THREE.MeshStandardMaterial( {
		vertexColors: true,
		roughness: 0.88,
		metalness: 0,
		side: THREE.DoubleSide
	} );

	const uniforms = { uTime: { value: 0 } };

	material.onBeforeCompile = shader => {

		shader.uniforms.uTime = uniforms.uTime;
		shader.vertexShader = shader.vertexShader
			.replace( '#include <common>', `#include <common>
				uniform float uTime;
			` )
			.replace( '#include <begin_vertex>', `#include <begin_vertex>
				float sway = smoothstep( 2.0, 8.0, position.y );
				transformed.x += sin( uTime * 1.15 + instanceMatrix[ 3 ].x * 0.12 ) * 0.12 * sway;
				transformed.z += cos( uTime * 0.93 + instanceMatrix[ 3 ].z * 0.1 ) * 0.1 * sway;
			` );

	};

	const placements = [];

	function isFree( x, z, radius = 1.2 ) {

		if ( ! coastField.isLand( x, z, 2.5 ) ) return false;
		if ( blocked( x, z, radius ) ) return false;

		for ( const ex of exclusions ) {

			if ( Math.hypot( x - ex.x, z - ex.z ) < ex.r ) return false;

		}

		return true;

	}

	if ( promenade ) {

		sampleAlong( promenade, 20, ( x, z, tx, tz, rnd ) => {

			const q = coastField.query( x, z );
			const offset = 3.1 + rnd() * 1.3;
			const px = x + q.nx * offset + ( rnd() - 0.5 ) * 1.4;
			const pz = z + q.nz * offset + ( rnd() - 0.5 ) * 1.4;

			if ( isFree( px, pz, 1.5 ) ) placements.push( { x: px, z: pz, s: 0.86 + rnd() * 0.32, r: rnd() * Math.PI * 2 } );

		}, random );

	}

	// palmeras en parques y jardines
	for ( const park of data.parks ) {

		if ( placements.length > 195 ) break;
		if ( polygonArea( park.p ) < 700 ) continue;

		const xs = park.p.map( p => p[ 0 ] );
		const zs = park.p.map( p => p[ 1 ] );
		const minX = Math.min( ...xs ), maxX = Math.max( ...xs );
		const minZ = Math.min( ...zs ), maxZ = Math.max( ...zs );
		const count = 1 + Math.floor( random() * 3 );

		for ( let i = 0; i < count; i ++ ) {

			const x = minX + random() * ( maxX - minX );
			const z = minZ + random() * ( maxZ - minZ );
			if ( ! pointInPolygon( x, z, park.p ) ) continue;
			if ( Math.hypot( x, z ) > 2100 ) continue;
			if ( isFree( x, z, 1.4 ) ) placements.push( { x, z, s: 0.85 + random() * 0.4, r: random() * Math.PI * 2 } );

		}

	}

	// una alineación en la avenida principal
	for ( const road of data.roads ) {

		if ( road.n !== 'Avenida José Mesa y López' || road.p.length < 3 ) continue;
		if ( placements.length > 225 ) break;

		sampleAlong( road.p, 31, ( x, z, tx, tz, rnd ) => {

			const nx = - tz;
			const nz = tx;

			for ( const side of [ 1, - 1 ] ) {

				if ( placements.length > 225 ) break;
				const px = x + nx * side * ( road.w / 2 + 2.4 );
				const pz = z + nz * side * ( road.w / 2 + 2.4 );
				if ( isFree( px, pz, 1.3 ) ) placements.push( { x: px, z: pz, s: 0.82 + rnd() * 0.3, r: rnd() * Math.PI * 2 } );

			}

		}, random );

	}

	// plaza del Auditorio
	for ( let i = 0; i < 7; i ++ ) {

		const angle = ( i / 7 ) * Math.PI * 2;
		const x = - 217 + Math.cos( angle ) * ( 58 + random() * 15 );
		const z = - 333 + Math.sin( angle ) * ( 42 + random() * 10 );
		if ( isFree( x, z, 2 ) ) placements.push( { x, z, s: 0.95 + random() * 0.3, r: random() * Math.PI * 2 } );

	}

	const count = Math.min( placements.length, 260 );
	const mesh = new THREE.InstancedMesh( geometry, material, count );
	mesh.name = 'palms';
	mesh.castShadow = castShadows;
	mesh.receiveShadow = true;
	mesh.frustumCulled = false;

	const matrix = new THREE.Matrix4();
	const position = new THREE.Vector3();
	const quaternion = new THREE.Quaternion();
	const scale = new THREE.Vector3();
	const euler = new THREE.Euler( 0, 0, 0 );

	for ( let i = 0; i < count; i ++ ) {

		const p = placements[ i ];
		position.set( p.x, 0, p.z );
		euler.set( 0, p.r, 0 );
		quaternion.setFromEuler( euler );
		scale.set( p.s, p.s * ( 0.94 + ( i % 5 ) * 0.02 ), p.s );
		matrix.compose( position, quaternion, scale );
		mesh.setMatrixAt( i, matrix );
		mesh.setColorAt( i, new THREE.Color().setHSL( 0.08, 0.05, 0.92 + ( i % 7 ) * 0.012 ) );

	}

	mesh.instanceMatrix.needsUpdate = true;
	if ( mesh.instanceColor ) mesh.instanceColor.needsUpdate = true;

	return {
		mesh,
		count,
		placements,
		update( delta ) {

			uniforms.uTime.value += delta;

		}
	};

}
