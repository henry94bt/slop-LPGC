import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
	asphaltTexture,
	pavingTexture,
	sandTexture,
	urbanTexture,
	grassTexture,
	foamTexture
} from '../utils/textures.js';

const ROAD_COLORS = {
	motorway: 0x5a514d,
	trunk: 0x554c48,
	primary: 0x514845,
	secondary: 0x4b4340,
	tertiary: 0x463e3c,
	unclassified: 0x403a38,
	residential: 0x3d3735,
	living_street: 0x49403b,
	pedestrian: 0xb7a48c,
	footway: 0xa8947c,
	cycleway: 0x9e8a72,
	service: 0x393432,
	track: 0x655646,
	steps: 0x8d7c68
};

const ROAD_WIDTH_CLASS = new Set( [ 'motorway', 'trunk', 'primary', 'secondary', 'tertiary' ] );

export class CoastField {

	constructor( coast ) {

		this.points = coast;
		this.segments = [];

		for ( let i = 0; i < coast.length - 1; i ++ ) {

			const a = coast[ i ];
			const b = coast[ i + 1 ];
			const dx = b[ 0 ] - a[ 0 ];
			const dz = b[ 1 ] - a[ 1 ];
			const len = Math.hypot( dx, dz );

			if ( len < 0.001 ) continue;

			let nx = dz / len;
			let nz = - dx / len;
			const mx = ( a[ 0 ] + b[ 0 ] ) * 0.5;
			const mz = ( a[ 1 ] + b[ 1 ] ) * 0.5;

			// la normal tierra adentro es la que mira hacia Guanarteme (0, 0)
			if ( nx * ( 0 - mx ) + nz * ( 0 - mz ) < 0 ) {

				nx = - nx;
				nz = - nz;

			}

			this.segments.push( {
				ax: a[ 0 ], az: a[ 1 ],
				bx: b[ 0 ], bz: b[ 1 ],
				dx, dz, len,
				nx, nz
			} );

		}

	}

	query( x, z ) {

		let best = null;
		let bestDist = Infinity;

		for ( const s of this.segments ) {

			let t = ( ( x - s.ax ) * s.dx + ( z - s.az ) * s.dz ) / ( s.len * s.len );
			t = Math.max( 0, Math.min( 1, t ) );
			const px = s.ax + s.dx * t;
			const pz = s.az + s.dz * t;
			const d = ( x - px ) ** 2 + ( z - pz ) ** 2;

			if ( d < bestDist ) {

				bestDist = d;
				best = { ...s, px, pz, t };

			}

		}

		if ( ! best ) return { signed: 0, distance: 0, x, z, nx: 0, nz: 1 };
		const signed = ( x - best.px ) * best.nx + ( z - best.pz ) * best.nz;
		return { ...best, signed, distance: Math.sqrt( bestDist ) };

	}

	normalAt( x, z ) {

		const hit = this.query( x, z );
		return { x: hit.nx, z: hit.nz, signed: hit.signed };

	}

	isLand( x, z, margin = 0 ) {

		return this.query( x, z ).signed > margin;

	}

	isWater( x, z, margin = 0 ) {

		return this.query( x, z ).signed < - margin;

	}

}

function polygonGeometry( polygons, y, uvScale, color ) {

	const positions = [];
	const normals = [];
	const uvs = [];
	const colors = [];
	const indices = [];
	let offset = 0;
	const tint = new THREE.Color( color ?? 0xffffff );

	for ( const poly of polygons ) {

		if ( poly.length < 3 ) continue;
		const contour = poly.map( p => new THREE.Vector2( p[ 0 ], p[ 1 ] ) );

		let faces;

		try {

			faces = THREE.ShapeUtils.triangulateShape( contour, [] );

		} catch {

			continue;

		}

		for ( const point of contour ) {

			positions.push( point.x, y, point.y );
			normals.push( 0, 1, 0 );
			uvs.push( point.x / uvScale, point.y / uvScale );
			colors.push( tint.r, tint.g, tint.b );

		}

		for ( const face of faces ) {

			// ShapeUtils devuelve triángulos en el plano x/z; los invertimos para que miren a +Y
			indices.push( offset + face[ 0 ], offset + face[ 2 ], offset + face[ 1 ] );

		}

		offset += contour.length;

	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
	geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
	geometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );
	geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
	geometry.setIndex( indices );
	geometry.computeBoundingSphere();
	return geometry;

}

function appendRibbon( target, points, width, y, uvScale = 8, color = 0xffffff, startUv = 0 ) {

	const { positions, normals, uvs, colors, indices } = target;
	const base = positions.length / 3;
	const tint = new THREE.Color( color );
	let distance = startUv;

	const left = [];
	const right = [];

	for ( let i = 0; i < points.length; i ++ ) {

		const p = points[ i ];
		const prev = points[ Math.max( 0, i - 1 ) ];
		const next = points[ Math.min( points.length - 1, i + 1 ) ];
		let dx = next[ 0 ] - prev[ 0 ];
		let dz = next[ 1 ] - prev[ 1 ];
		const len = Math.hypot( dx, dz ) || 1;
		dx /= len;
		dz /= len;
		const nx = - dz;
		const nz = dx;

		left.push( [ p[ 0 ] + nx * width * 0.5, p[ 1 ] + nz * width * 0.5, distance ] );
		right.push( [ p[ 0 ] - nx * width * 0.5, p[ 1 ] - nz * width * 0.5, distance ] );

		if ( i < points.length - 1 ) {

			const q = points[ i + 1 ];
			distance += Math.hypot( q[ 0 ] - p[ 0 ], q[ 1 ] - p[ 1 ] );

		}

	}

	for ( let i = 0; i < points.length; i ++ ) {

		const pair = [ left[ i ], right[ i ] ];

		for ( let j = 0; j < 2; j ++ ) {

			const item = pair[ j ];
			positions.push( item[ 0 ], y, item[ 1 ] );
			normals.push( 0, 1, 0 );
			uvs.push( j, item[ 2 ] / uvScale );
			colors.push( tint.r, tint.g, tint.b );

		}

	}

	for ( let i = 0; i < points.length - 1; i ++ ) {

		const a = base + i * 2;
		const b = a + 1;
		const c = a + 2;
		const d = a + 3;
		indices.push( a, c, b, b, c, d );

	}

	return distance;

}

function makeBuffer( target ) {

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( target.positions, 3 ) );
	geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( target.normals, 3 ) );
	geometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( target.uvs, 2 ) );
	geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( target.colors, 3 ) );
	geometry.setIndex( target.indices );
	geometry.computeBoundingSphere();
	return geometry;

}

function createRibbon( points, width, y, uvScale, color ) {

	const target = { positions: [], normals: [], uvs: [], colors: [], indices: [] };
	appendRibbon( target, points, width, y, uvScale, color );
	return makeBuffer( target );

}

function pointAlong( points, t ) {

	if ( points.length === 0 ) return { x: 0, z: 0, tx: 0, tz: - 1, length: 0 };
	if ( points.length === 1 ) return { x: points[ 0 ][ 0 ], z: points[ 0 ][ 1 ], tx: 0, tz: - 1, length: 0 };

	let total = 0;
	const lengths = [];

	for ( let i = 0; i < points.length - 1; i ++ ) {

		const l = Math.hypot( points[ i + 1 ][ 0 ] - points[ i ][ 0 ], points[ i + 1 ][ 1 ] - points[ i ][ 1 ] );
		lengths.push( l );
		total += l;

	}

	let target = Math.max( 0, Math.min( 1, t ) ) * total;
	let i = 0;

	while ( i < lengths.length - 1 && target > lengths[ i ] ) {

		target -= lengths[ i ];
		i ++;

	}

	const a = points[ i ];
	const b = points[ i + 1 ];
	const l = lengths[ i ] || 1;
	const f = Math.min( 1, target / l );
	const tx = ( b[ 0 ] - a[ 0 ] ) / l;
	const tz = ( b[ 1 ] - a[ 1 ] ) / l;

	return {
		x: a[ 0 ] + ( b[ 0 ] - a[ 0 ] ) * f,
		z: a[ 1 ] + ( b[ 1 ] - a[ 1 ] ) * f,
		tx,
		tz,
		length: total
	};

}

export function buildTerrain( data ) {

	const group = new THREE.Group();
	group.name = 'terrain';

	const coastField = new CoastField( data.coast );
	const promenade = data.promenade.length > 4 ? data.promenade : null;

	// ---------- suelo ----------

	const landGeo = polygonGeometry( [ data.land ], 0, 13, 0xffffff );

	const urbanMap = urbanTexture();
	const landMat = new THREE.MeshStandardMaterial( {
		map: urbanMap,
		vertexColors: true,
		roughness: 0.98,
		metalness: 0,
		side: THREE.DoubleSide
	} );

	const land = new THREE.Mesh( landGeo, landMat );
	land.receiveShadow = true;
	land.name = 'land';
	group.add( land );

	// ---------- playa ----------

	if ( data.beach.length ) {

		const beachGeo = polygonGeometry( data.beach, 0.045, 9, 0xffffff );
		const beachMat = new THREE.MeshStandardMaterial( {
			map: sandTexture(),
			vertexColors: true,
			roughness: 1,
			metalness: 0,
			side: THREE.DoubleSide
		} );
		const beach = new THREE.Mesh( beachGeo, beachMat );
		beach.receiveShadow = true;
		beach.name = 'beach';
		group.add( beach );

	}

	// ---------- parques ----------

	if ( data.parks.length ) {

		const parkGeo = polygonGeometry( data.parks.map( p => p.p ), 0.055, 7, 0xffffff );
		const parkMat = new THREE.MeshStandardMaterial( {
			map: grassTexture(),
			vertexColors: true,
			roughness: 1,
			metalness: 0,
			side: THREE.DoubleSide
		} );
		const parks = new THREE.Mesh( parkGeo, parkMat );
		parks.receiveShadow = true;
		parks.name = 'parks';
		group.add( parks );

	}

	// ---------- aparcamientos ----------

	if ( data.parking.length ) {

		const parkingGeo = polygonGeometry( data.parking, 0.025, 6, 0x5b5754 );
		const parkingMat = new THREE.MeshStandardMaterial( {
			color: 0x5b5754,
			vertexColors: true,
			roughness: 1,
			side: THREE.DoubleSide
		} );
		const parking = new THREE.Mesh( parkingGeo, parkingMat );
		parking.receiveShadow = true;
		group.add( parking );

	}

	// ---------- viario ----------

	const roadTarget = { positions: [], normals: [], uvs: [], colors: [], indices: [] };
	const pathTarget = { positions: [], normals: [], uvs: [], colors: [], indices: [] };
	const markTarget = { positions: [], normals: [], uvs: [], colors: [], indices: [] };

	const pedestrianTypes = new Set( [ 'pedestrian', 'footway', 'cycleway', 'steps' ] );

	for ( const road of data.roads ) {

		if ( road.p.length < 2 ) continue;
		const isPath = pedestrianTypes.has( road.k );
		const target = isPath ? pathTarget : roadTarget;
		const y = isPath ? 0.032 : 0.038;
		const color = ROAD_COLORS[ road.k ] ?? 0x3d3735;
		appendRibbon( target, road.p, road.w, y, isPath ? 2.5 : 7, color );

		// línea central discontinua en las avenidas
		if ( ! isPath && ROAD_WIDTH_CLASS.has( road.k ) && road.w >= 9 ) {

			const total = road.p.reduce( ( acc, p, i ) => i === 0 ? 0 : acc + Math.hypot( p[ 0 ] - road.p[ i - 1 ][ 0 ], p[ 1 ] - road.p[ i - 1 ][ 1 ] ), 0 );
			const dash = 4.2;
			const gap = 6.2;

			for ( let s = 4; s < total - 4; s += dash + gap ) {

				const a = pointAlong( road.p, s / total );
				const b = pointAlong( road.p, Math.min( 1, ( s + dash ) / total ) );
				const nx = - a.tz;
				const nz = a.tx;
				const yMark = y + 0.014;
				const w = 0.16;
				const base = markTarget.positions.length / 3;
				const verts = [
					[ a.x + nx * w, yMark, a.z + nz * w ],
					[ a.x - nx * w, yMark, a.z - nz * w ],
					[ b.x - nx * w, yMark, b.z - nz * w ],
					[ b.x + nx * w, yMark, b.z + nz * w ]
				];

				for ( const v of verts ) {

					markTarget.positions.push( v[ 0 ], v[ 1 ], v[ 2 ] );
					markTarget.normals.push( 0, 1, 0 );
					markTarget.uvs.push( 0, 0 );
					markTarget.colors.push( 1, 0.93, 0.78 );

				}

				markTarget.indices.push( base, base + 2, base + 1, base, base + 3, base + 2 );

			}

		}

	}

	const roadGeo = makeBuffer( roadTarget );
	const roadMat = new THREE.MeshStandardMaterial( {
		map: asphaltTexture(),
		vertexColors: true,
		roughness: 0.96,
		metalness: 0,
		side: THREE.DoubleSide
	} );
	const roads = new THREE.Mesh( roadGeo, roadMat );
	roads.receiveShadow = true;
	roads.name = 'roads';
	group.add( roads );

	if ( pathTarget.positions.length ) {

		const pathGeo = makeBuffer( pathTarget );
		const pathMat = new THREE.MeshStandardMaterial( {
			map: pavingTexture(),
			vertexColors: true,
			roughness: 1,
			metalness: 0,
			side: THREE.DoubleSide
		} );
		const paths = new THREE.Mesh( pathGeo, pathMat );
		paths.receiveShadow = true;
		paths.name = 'paths';
		group.add( paths );

	}

	if ( markTarget.positions.length ) {

		const markGeo = makeBuffer( markTarget );
		const markMat = new THREE.MeshStandardMaterial( {
			color: 0xf2e6cf,
			vertexColors: true,
			roughness: 0.8,
			metalness: 0
		} );
		const marks = new THREE.Mesh( markGeo, markMat );
		marks.receiveShadow = true;
		marks.name = 'road-marks';
		group.add( marks );

	}

	// ---------- paseo marítimo ----------

	if ( promenade ) {

		const promGeo = createRibbon( promenade, 8.6, 0.075, 3.2, 0xe3cfb3 );
		const promMat = new THREE.MeshStandardMaterial( {
			map: pavingTexture(),
			color: 0xe8d5ba,
			vertexColors: true,
			roughness: 1,
			metalness: 0,
			side: THREE.DoubleSide
		} );
		const prom = new THREE.Mesh( promGeo, promMat );
		prom.receiveShadow = true;
		prom.name = 'promenade';
		group.add( prom );

	}

	// ---------- arena mojada y espuma de la orilla ----------

	const foamLayers = [];

	if ( promenade && data.coast.length > 30 ) {

		let beachStartIndex = 0;
		let best = Infinity;

		for ( let i = 0; i < data.coast.length; i ++ ) {

			const d = Math.hypot( data.coast[ i ][ 0 ] - promenade[ 0 ][ 0 ], data.coast[ i ][ 1 ] - promenade[ 0 ][ 1 ] );
			if ( d < best ) {

				best = d;
				beachStartIndex = i;

			}

		}

		const start = Math.max( 0, beachStartIndex - 1 );
		const end = data.coast.length;

		// tres líneas de rompiente
		for ( const [ offshore, width, opacity, speed, y ] of [
			[ 48, 40, 0.34, 0.014, 0.012 ],
			[ 24, 18, 0.32, 0.022, 0.008 ],
			[ 7, 9, 0.42, 0.038, 0.004 ]
		] ) {

			const points = [];

			for ( let i = start; i < end; i ++ ) {

				const q = coastField.query( data.coast[ i ][ 0 ], data.coast[ i ][ 1 ] );
				points.push( [ data.coast[ i ][ 0 ] - q.nx * offshore, data.coast[ i ][ 1 ] - q.nz * offshore ] );

			}

			if ( points.length < 4 ) continue;
			const geo = createRibbon( points, width, y, 22, 0xffffff );
			const map = foamTexture();
			map.repeat.set( 13, 1 );
			const mat = new THREE.MeshBasicMaterial( {
				map,
				color: 0xfff3e1,
				transparent: true,
				opacity,
				depthWrite: false,
				blending: THREE.AdditiveBlending,
				side: THREE.DoubleSide
			} );
			const mesh = new THREE.Mesh( geo, mat );
			mesh.renderOrder = 4;
			mesh.name = 'shore-foam';
			group.add( mesh );
			foamLayers.push( { map, speed } );

		}

	}

	// ---------- farolas del paseo ----------

	const lamps = [];

	if ( promenade ) {

		const poleGeo = new THREE.CylinderGeometry( 0.075, 0.115, 4.6, 6 );
		const poleMat = new THREE.MeshStandardMaterial( { color: 0x2b2a28, roughness: 0.7, metalness: 0.55 } );
		const globeGeo = new THREE.SphereGeometry( 0.23, 10, 8 );
		const globeMat = new THREE.MeshStandardMaterial( {
			color: 0xffd7a0,
			emissive: 0xffb36b,
			emissiveIntensity: 2.6,
			roughness: 0.35
		} );

		const spacing = 38;
		let travelled = 0;

		for ( let i = 0; i < promenade.length - 1; i ++ ) {

			const a = promenade[ i ];
			const b = promenade[ i + 1 ];
			const seg = Math.hypot( b[ 0 ] - a[ 0 ], b[ 1 ] - a[ 1 ] );
			travelled += seg;

			if ( travelled < spacing ) continue;
			travelled = 0;

			const q = coastField.query( a[ 0 ], a[ 1 ] );
			const x = a[ 0 ] + q.nx * 5.0;
			const z = a[ 1 ] + q.nz * 5.0;
			lamps.push( { x, z } );

		}

		const poleMesh = new THREE.InstancedMesh( poleGeo, poleMat, lamps.length );
		const globeMesh = new THREE.InstancedMesh( globeGeo, globeMat, lamps.length );
		const matrix = new THREE.Matrix4();
		const position = new THREE.Vector3();
		const quaternion = new THREE.Quaternion();
		const scale = new THREE.Vector3( 1, 1, 1 );

		lamps.forEach( ( lamp, index ) => {

			position.set( lamp.x, 2.3, lamp.z );
			matrix.compose( position, quaternion, scale );
			poleMesh.setMatrixAt( index, matrix );
			position.set( lamp.x, 4.62, lamp.z );
			matrix.compose( position, quaternion, scale );
			globeMesh.setMatrixAt( index, matrix );

		} );

		poleMesh.castShadow = true;
		poleMesh.receiveShadow = true;
		poleMesh.name = 'promenade-lamps';
		globeMesh.name = 'promenade-lamp-globes';
		group.add( poleMesh, globeMesh );

	}

	return {
		group,
		coastField,
		promenade,
		pointAlong,
		foamLayers,
		update( delta ) {

			for ( const layer of foamLayers ) {

				layer.map.offset.x -= delta * layer.speed;

			}

		}
	};

}
