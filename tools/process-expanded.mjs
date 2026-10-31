/**
 * Hornea la base ampliada de Las Palmas conservando la costa y el paseo
 * de Las Canteras ya construidos.
 *
 * Uso: node tools/process-expanded.mjs
 * Entrada: tools/cache/osm-expanded.json + public/data/las-palmas.json
 * Salida: public/data/las-palmas.json
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve( import.meta.dirname, '..' );
const RAW = path.join( ROOT, 'tools/cache/osm-expanded.json' );
const CORE = path.join( ROOT, 'public/data/las-palmas.json' );
const OUT = path.join( ROOT, 'public/data' );
const CENTER = { lat: 28.1272, lon: -15.4468 };
const M_PER_DEG_LAT = 110574;
const M_PER_DEG_LON = 111320 * Math.cos( CENTER.lat * Math.PI / 180 );
const LIMITS = { minX: - 4500, maxX: 7500, minZ: - 6000, maxZ: 7500 };

const raw = JSON.parse( await fs.readFile( RAW, 'utf8' ) );
const core = JSON.parse( await fs.readFile( CORE, 'utf8' ) );
const nodes = raw.nodes;
const ways = raw.ways;

const project = ( lon, lat ) => [
	Math.round( ( lon - CENTER.lon ) * M_PER_DEG_LON * 10 ) / 10,
	Math.round( ( CENTER.lat - lat ) * M_PER_DEG_LAT * 10 ) / 10
];

function points( way ) {

	const result = [];

	for ( const ref of way.refs ) {

		const node = nodes[ ref ];
		if ( node ) result.push( project( node[ 0 ], node[ 1 ] ) );

	}

	return result;

}

function inside( x, z ) {

	return x > LIMITS.minX && x < LIMITS.maxX && z > LIMITS.minZ && z < LIMITS.maxZ;

}

function insidePoly( poly ) {

	return poly.some( p => inside( p[ 0 ], p[ 1 ] ) );

}

function area( poly ) {

	let sum = 0;

	for ( let i = 0, j = poly.length - 1; i < poly.length; j = i ++ ) sum += poly[ j ][ 0 ] * poly[ i ][ 1 ] - poly[ i ][ 0 ] * poly[ j ][ 1 ];
	return Math.abs( sum ) / 2;

}

function centroid( poly ) {

	let x = 0, z = 0, a = 0;

	for ( let i = 0, j = poly.length - 1; i < poly.length; j = i ++ ) {

		const f = poly[ j ][ 0 ] * poly[ i ][ 1 ] - poly[ i ][ 0 ] * poly[ j ][ 1 ];
		a += f;
		x += ( poly[ j ][ 0 ] + poly[ i ][ 0 ] ) * f;
		z += ( poly[ j ][ 1 ] + poly[ i ][ 1 ] ) * f;

	}

	if ( Math.abs( a ) < 0.001 ) return [ poly[ 0 ][ 0 ], poly[ 0 ][ 1 ] ];
	return [ x / ( 3 * a ), z / ( 3 * a ) ];

}

function hash( value ) {

	let h = 2166136261;

	for ( let i = 0; i < value.length; i ++ ) {

		h ^= value.charCodeAt( i );
		h = Math.imul( h, 16777619 );

	}

	return h >>> 0;

}

function dedupe( poly ) {

	const out = [];

	for ( const p of poly ) {

		const last = out[ out.length - 1 ];
		if ( ! last || Math.abs( last[ 0 ] - p[ 0 ] ) > 0.05 || Math.abs( last[ 1 ] - p[ 1 ] ) > 0.05 ) out.push( p );

	}

	if ( out.length > 1 ) {

		const first = out[ 0 ], last = out[ out.length - 1 ];
		if ( Math.abs( first[ 0 ] - last[ 0 ] ) < 0.05 && Math.abs( first[ 1 ] - last[ 1 ] ) < 0.05 ) out.pop();

	}

	return out;

}

function simplify( pointsIn, epsilon ) {

	if ( pointsIn.length < 3 ) return pointsIn;
	const sq = epsilon * epsilon;

	function rdp( first, last, out ) {

		let maxDist = 0, index = - 1;
		const [ x1, z1 ] = pointsIn[ first ];
		const [ x2, z2 ] = pointsIn[ last ];
		const dx = x2 - x1, dz = z2 - z1;
		const len = dx * dx + dz * dz;

		for ( let i = first + 1; i < last; i ++ ) {

			const [ x, z ] = pointsIn[ i ];
			let dist;

			if ( len === 0 ) dist = ( x - x1 ) ** 2 + ( z - z1 ) ** 2;
			else {

				const t = Math.max( 0, Math.min( 1, ( ( x - x1 ) * dx + ( z - z1 ) * dz ) / len ) );
				dist = ( x - ( x1 + t * dx ) ) ** 2 + ( z - ( z1 + t * dz ) ) ** 2;

			}

			if ( dist > maxDist ) {

				maxDist = dist;
				index = i;

			}

		}

		if ( maxDist > sq ) {

			rdp( first, index, out );
			out.push( pointsIn[ index ] );
			rdp( index, last, out );

		}

	}

	const out = [ pointsIn[ 0 ] ];
	rdp( 0, pointsIn.length - 1, out );
	out.push( pointsIn[ pointsIn.length - 1 ] );
	return out;

}

const buildings = [];
const roads = [];
const parks = [];
const roadNames = new Map();

for ( const way of ways ) {

	const tags = way.tags;
	if ( way.refs.length < 2 ) continue;
	const pts = points( way );
	if ( pts.length < 2 ) continue;

	if ( tags.building && tags.building !== 'no' && tags.building !== 'roof' ) {

		if ( pts.length < 4 ) continue;
		const poly = dedupe( simplify( pts, 0.8 ) );
		if ( poly.length < 3 ) continue;
		const a = area( poly );
		if ( a < 10 || a > 30000 || ! insidePoly( poly ) ) continue;

		const levels = Number.parseFloat( tags[ 'building:levels' ] );
		let height = Number.parseFloat( tags.height );

		if ( ! Number.isFinite( height ) ) {

			const h = hash( way.id );
			const kind = tags.building;
			let base = 6 + ( h % 9 );

			if ( Number.isFinite( levels ) && levels > 0 ) height = levels * 3.1 + 1;
			else {

				if ( kind === 'apartments' || kind === 'residential' ) base += 4;
				if ( kind === 'hotel' ) base += 12;
				if ( kind === 'office' || kind === 'commercial' ) base += 8;
				if ( a > 1200 ) base += 4;
				if ( h % 127 === 0 ) base += 18;
				height = base;

			}

		}

		height = Math.max( 3.2, Math.min( 62, height ) );
		const [ cx, cz ] = centroid( poly );
		const h2 = hash( way.id );

		buildings.push( {
			p: poly,
			h: Math.round( height * 10 ) / 10,
			c: h2 % 10,
			cx: Math.round( cx ),
			cz: Math.round( cz )
		} );

	} else if ( tags.highway ) {

		const allowed = [ 'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street', 'pedestrian', 'footway', 'cycleway', 'service', 'track', 'steps' ];
		if ( ! allowed.includes( tags.highway ) ) continue;
		if ( tags.area === 'yes' || tags.tunnel || tags.covered ) continue;
		const line = dedupe( simplify( pts, 1.0 ) );
		if ( line.length < 2 || ! insidePoly( line ) ) continue;

		let width = Number.parseFloat( tags.width );

		if ( ! Number.isFinite( width ) ) {

			width = {
				motorway: 24, trunk: 22, primary: 20, secondary: 15, tertiary: 11,
				unclassified: 8, residential: 8, living_street: 7, pedestrian: 6,
				footway: 2.4, cycleway: 2.8, service: 4.5, track: 4, steps: 2.2
			}[ tags.highway ] || 6;

		}

		width = Math.max( 1.8, Math.min( 32, width ) );
		const name = tags.name || '';
		if ( name ) roadNames.set( name, ( roadNames.get( name ) || 0 ) + 1 );

		roads.push( {
			k: tags.highway,
			w: Math.round( width * 10 ) / 10,
			n: name,
			b: tags.bridge === 'yes' ? 1 : 0,
			p: line
		} );

	} else if ( tags.leisure === 'park' || tags.leisure === 'garden' || tags.leisure === 'pitch' || tags.leisure === 'playground' || tags.landuse === 'grass' || tags.landuse === 'recreation_ground' || tags.landuse === 'village_green' ) {

		const poly = dedupe( simplify( pts, 1.5 ) );
		if ( poly.length >= 3 && area( poly ) > 120 && insidePoly( poly ) ) parks.push( { p: poly, t: tags.leisure || tags.landuse } );

	}

}

buildings.sort( ( a, b ) => ( Math.abs( a.cx ) + Math.abs( a.cz ) ) - ( Math.abs( b.cx ) + Math.abs( b.cz ) ) );

const cityGround = [
	{ minX: - 3200, maxX: 7000, minZ: - 350, maxZ: 6600 },
	{ minX: 1500, maxX: 7000, minZ: - 3500, maxZ: - 350 },
	{ minX: 150, maxX: 1500, minZ: - 5400, maxZ: - 2200 },
	{ minX: 1500, maxX: 2300, minZ: - 5400, maxZ: - 3500 }
];

const payload = {
	...core,
	meta: {
		...core.meta,
		expanded: true,
		bbox: raw.meta.bbox,
		generatedAt: new Date().toISOString(),
		attribution: '© OpenStreetMap contributors (ODbL)'
	},
	buildings,
	roads,
	parks,
	cityGround,
	stats: {
		buildings: buildings.length,
		roads: roads.length,
		parks: parks.length
	}
};

await fs.mkdir( OUT, { recursive: true } );
await fs.writeFile( path.join( OUT, 'las-palmas.json' ), JSON.stringify( payload ) );
console.log( `Edificios: ${buildings.length} · viario: ${roads.length} · parques: ${parks.length}` );
console.log( `cityGround: ${JSON.stringify( cityGround )}` );
console.log( `Escrito public/data/las-palmas.json · ${( ( await fs.stat( path.join( OUT, 'las-palmas.json' ) ) ).size / 1048576 ).toFixed( 2 )} MB` );
console.log( 'Calles:', [ ...roadNames.entries() ].sort( ( a, b ) => b[ 1 ] - a[ 1 ] ).slice( 0, 12 ).map( x => x[ 0 ] ).join( ' · ' ) );
