import * as THREE from 'three';

const PALETTE = [
	0xd8c9b5,
	0xcdb69e,
	0xe4d5c1,
	0xbe8f73,
	0xd5a58b,
	0xc4b29e,
	0xb4a794,
	0x9faeaa,
	0xe0cbb2,
	0xc9a98b
];

function signedArea( poly ) {

	let sum = 0;

	for ( let i = 0, j = poly.length - 1; i < poly.length; j = i ++ ) {

		sum += poly[ j ][ 0 ] * poly[ i ][ 1 ] - poly[ i ][ 0 ] * poly[ j ][ 1 ];

	}

	return sum / 2;

}

function hash( value ) {

	let h = 2166136261;

	for ( let i = 0; i < value.length; i ++ ) {

		h ^= value.charCodeAt( i );
		h = Math.imul( h, 16777619 );

	}

	return ( h >>> 0 );

}

function pushVertex( target, x, y, z, nx, ny, nz, color ) {

	target.positions.push( x, y, z );
	target.normals.push( nx, ny, nz );
	target.colors.push( color.r, color.g, color.b );

}

function addBox( target, cx, cy, cz, sx, sy, sz, color ) {

	const hx = sx / 2, hz = sz / 2;

	const faces = [
		[ [ - hx, 0, - hz ], [ hx, 0, - hz ], [ hx, sy, - hz ], [ - hx, sy, - hz ], 0, 0, - 1 ],
		[ [ hx, 0, hz ], [ - hx, 0, hz ], [ - hx, sy, hz ], [ hx, sy, hz ], 0, 0, 1 ],
		[ [ - hx, 0, hz ], [ - hx, 0, - hz ], [ - hx, sy, - hz ], [ - hx, sy, hz ], - 1, 0, 0 ],
		[ [ hx, 0, - hz ], [ hx, 0, hz ], [ hx, sy, hz ], [ hx, sy, - hz ], 1, 0, 0 ],
		[ [ - hx, sy, - hz ], [ hx, sy, - hz ], [ hx, sy, hz ], [ - hx, sy, hz ], 0, 1, 0 ]
	];

	for ( const face of faces ) {

		const base = target.positions.length / 3;
		const [ a, b, c, d ] = face;
		const nx = face[ 4 ], ny = face[ 5 ], nz = face[ 6 ];

		for ( const v of [ a, b, c, d ] ) {

			pushVertex( target, cx + v[ 0 ], cy + v[ 1 ], cz + v[ 2 ], nx, ny, nz, color );

		}

		target.indices.push( base, base + 2, base + 1, base, base + 3, base + 2 );

	}

}

function makeGeometry( target ) {

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( target.positions, 3 ) );
	geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( target.normals, 3 ) );
	geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( target.colors, 3 ) );
	geometry.setIndex( target.indices );
	geometry.computeBoundingSphere();
	return geometry;

}

const windowShader = {
	uniforms: {
		uLit: { value: 0.17 },
		uGlow: { value: 0.55 }
	},
	apply( shader, values ) {

		shader.uniforms.uLit = { value: values.lit };
		shader.uniforms.uGlow = { value: values.emissive };

		shader.vertexShader = shader.vertexShader
			.replace( '#include <common>', `#include <common>
				varying vec3 vWPos;
				varying vec3 vWNormal;
			` )
			.replace( '#include <begin_vertex>', `#include <begin_vertex>
				vWPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
				vWNormal = normalize( mat3( modelMatrix ) * normal );
			` );

		shader.fragmentShader = shader.fragmentShader
			.replace( '#include <common>', `#include <common>
				uniform float uLit;
				uniform float uGlow;
				varying vec3 vWPos;
				varying vec3 vWNormal;

				float facadeHash( vec2 p ) {

					p = fract( p * vec2( 123.34, 456.21 ) );
					p += dot( p, p + 45.32 );
					return fract( p.x * p.y );

				}
			` )
			.replace( '#include <color_fragment>', `#include <color_fragment>
				vec3 wn = normalize( vWNormal );
				float wallMask = 1.0 - smoothstep( 0.32, 0.58, abs( wn.y ) );
				vec2 facadeUv = abs( wn.x ) > abs( wn.z )
					? vec2( vWPos.z, vWPos.y )
					: vec2( vWPos.x, vWPos.y );

				vec2 cellUv = facadeUv / vec2( 3.15, 3.05 );
				vec2 cell = fract( cellUv );
				vec2 cellId = floor( cellUv );

				float win = smoothstep( 0.16, 0.24, cell.x ) * smoothstep( 0.84, 0.76, cell.x );
				win *= smoothstep( 0.20, 0.28, cell.y ) * smoothstep( 0.82, 0.74, cell.y );
				win *= wallMask;

				// escaparates de planta baja
				vec2 shopUv = facadeUv / vec2( 4.0, 4.2 );
				vec2 shopCell = fract( shopUv );
				float shop = smoothstep( 0.05, 0.1, shopCell.x ) * smoothstep( 0.95, 0.9, shopCell.x );
				shop *= smoothstep( 0.1, 0.2, shopCell.y ) * smoothstep( 0.95, 0.85, shopCell.y );
				shop *= wallMask * ( 1.0 - smoothstep( 3.4, 4.4, vWPos.y ) );

				float opening = max( win, shop * 0.85 );
				diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.035, 0.05, 0.058 ), opening * 0.82 );

				float floorLine = smoothstep( 0.0, 0.025, abs( fract( facadeUv.y / 3.05 ) - 0.02 ) );
				diffuseColor.rgb *= 1.0 - 0.05 * wallMask * ( 1.0 - floorLine );
			` )
			.replace( '#include <emissivemap_fragment>', `#include <emissivemap_fragment>
				float litCell = step( 0.82, facadeHash( cellId + vec2( floor( vWPos.y / 3.05 ), 0.0 ) ) );
				float litShop = step( 0.78, facadeHash( cellId * 1.7 + 11.0 ) );
				totalEmissiveRadiance += vec3( 1.0, 0.56, 0.27 ) * ( litCell * win + litShop * shop * 0.7 ) * uLit * uGlow;
			` );

	}

};

export function createBuildings( data, { castShadows = true } = {} ) {

	const walls = { positions: [], normals: [], colors: [], indices: [] };
	const roofs = { positions: [], normals: [], colors: [], indices: [] };
	const collisionBoxes = [];
	const palette = PALETTE.map( hex => new THREE.Color( hex ) );

	for ( const building of data.buildings ) {

		let poly = building.p;

		if ( poly.length < 3 ) continue;
		if ( signedArea( poly ) < 0 ) poly = [ ...poly ].reverse();

		const color = palette[ building.c % palette.length ].clone();
		const shade = 0.92 + ( building.c % 5 ) * 0.025;
		color.multiplyScalar( shade );

		const roofColor = color.clone().multiplyScalar( 0.68 );
		roofColor.offsetHSL( 0, - 0.04, - 0.02 );

		const height = building.h;
		let minX = Infinity, maxX = - Infinity, minZ = Infinity, maxZ = - Infinity;

		for ( let i = 0; i < poly.length; i ++ ) {

			const a = poly[ i ];
			const b = poly[ ( i + 1 ) % poly.length ];
			const dx = b[ 0 ] - a[ 0 ];
			const dz = b[ 1 ] - a[ 1 ];
			const len = Math.hypot( dx, dz );
			if ( len < 0.01 ) continue;
			const nx = dz / len;
			const nz = - dx / len;

			minX = Math.min( minX, a[ 0 ], b[ 0 ] );
			maxX = Math.max( maxX, a[ 0 ], b[ 0 ] );
			minZ = Math.min( minZ, a[ 1 ], b[ 1 ] );
			maxZ = Math.max( maxZ, a[ 1 ], b[ 1 ] );

			const base = walls.positions.length / 3;

			pushVertex( walls, a[ 0 ], 0, a[ 1 ], nx, 0, nz, color );
			pushVertex( walls, a[ 0 ], height, a[ 1 ], nx, 0, nz, color );
			pushVertex( walls, b[ 0 ], height, b[ 1 ], nx, 0, nz, color );
			pushVertex( walls, b[ 0 ], 0, b[ 1 ], nx, 0, nz, color );

			walls.indices.push( base, base + 2, base + 3, base, base + 1, base + 2 );

		}

		const contour = poly.map( p => new THREE.Vector2( p[ 0 ], p[ 1 ] ) );
		let faces = [];

		try {

			faces = THREE.ShapeUtils.triangulateShape( contour, [] );

		} catch {

			faces = [];

		}

		const roofBase = roofs.positions.length / 3;

		for ( const point of contour ) {

			pushVertex( roofs, point.x, height, point.y, 0, 1, 0, roofColor );

		}

		for ( const face of faces ) {

			roofs.indices.push( roofBase + face[ 0 ], roofBase + face[ 2 ], roofBase + face[ 1 ] );

		}

		if ( maxX - minX > 0.4 && maxZ - minZ > 0.4 ) {

			collisionBoxes.push( { minX, maxX, minZ, maxZ } );

		}

	}

	const wallGeometry = makeGeometry( walls );
	const roofGeometry = makeGeometry( roofs );

	const wallMaterial = new THREE.MeshStandardMaterial( {
		vertexColors: true,
		roughness: 0.94,
		metalness: 0.02
	} );

	let compiledShader = null;
	let litValue = 0.17;
	let glowValue = 0.55;

	wallMaterial.onBeforeCompile = shader => {

		compiledShader = shader;
		windowShader.apply( shader, { lit: litValue, emissive: glowValue } );

	};

	const roofMaterial = new THREE.MeshStandardMaterial( {
		vertexColors: true,
		roughness: 0.98,
		metalness: 0
	} );

	const wallMesh = new THREE.Mesh( wallGeometry, wallMaterial );
	wallMesh.name = 'building-walls';
	wallMesh.castShadow = castShadows;
	wallMesh.receiveShadow = true;

	const roofMesh = new THREE.Mesh( roofGeometry, roofMaterial );
	roofMesh.name = 'building-roofs';
	roofMesh.castShadow = castShadows;
	roofMesh.receiveShadow = true;

	const group = new THREE.Group();
	group.name = 'buildings';
	group.add( wallMesh, roofMesh );

	// rejilla espacial para colisiones
	const CELL = 48;
	const grid = new Map();

	for ( let i = 0; i < collisionBoxes.length; i ++ ) {

		const b = collisionBoxes[ i ];
		const gx0 = Math.floor( b.minX / CELL );
		const gx1 = Math.floor( b.maxX / CELL );
		const gz0 = Math.floor( b.minZ / CELL );
		const gz1 = Math.floor( b.maxZ / CELL );

		for ( let gx = gx0; gx <= gx1; gx ++ ) {

			for ( let gz = gz0; gz <= gz1; gz ++ ) {

				const key = gx + ':' + gz;
				let list = grid.get( key );
				if ( ! list ) grid.set( key, list = [] );
				list.push( i );

			}

		}

	}

	function blocked( x, z, radius = 0.55 ) {

		const gx = Math.floor( x / CELL );
		const gz = Math.floor( z / CELL );

		for ( let ix = gx - 1; ix <= gx + 1; ix ++ ) {

			for ( let iz = gz - 1; iz <= gz + 1; iz ++ ) {

				const list = grid.get( ix + ':' + iz );
				if ( ! list ) continue;

				for ( const index of list ) {

					const b = collisionBoxes[ index ];
					const cx = Math.max( b.minX, Math.min( x, b.maxX ) );
					const cz = Math.max( b.minZ, Math.min( z, b.maxZ ) );
					const dx = x - cx;
					const dz = z - cz;

					if ( dx * dx + dz * dz < radius * radius ) return true;

				}

			}

		}

		return false;

	}

	return {
		group,
		wallMesh,
		roofMesh,
		blocked,
		setLighting( preset ) {

			litValue = preset.windows.lit;
			glowValue = preset.windows.emissive;

			if ( compiledShader ) {

				compiledShader.uniforms.uLit.value = litValue;
				compiledShader.uniforms.uGlow.value = glowValue;

			}

		}
	};

}
