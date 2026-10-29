/**
 * Convierte la descarga de OSM en la base compacta que consume la app:
 * costa, playa, viario, edificios, parques y paseo marítimo, ya proyectados
 * a metros locales (x = esta, z = sur) con origen en Guanarteme.
 *
 * Uso: npm run bake:osm
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve( import.meta.dirname, '..' );
const RAW = path.join( ROOT, 'tools/cache/osm-raw.json' );
const OUT = path.join( ROOT, 'public/data' );
const CENTER = { lat: 28.1272, lon: -15.4468 };
const WORLD = 2500; // metros de radio que conservamos
const M_PER_DEG_LAT = 110574;
const M_PER_DEG_LON = 111320 * Math.cos( CENTER.lat * Math.PI / 180 );

const raw = JSON.parse( await fs.readFile( RAW, 'utf8' ) );
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
		if ( ! node ) continue;
		result.push( project( node[ 0 ], node[ 1 ] ) );

	}

	return result;

}

function area( poly ) {

	let sum = 0;

	for ( let i = 0, j = poly.length - 1; i < poly.length; j = i ++ ) {

		sum += poly[ j ][ 0 ] * poly[ i ][ 1 ] - poly[ i ][ 0 ] * poly[ j ][ 1 ];

	}

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

function bitHash( value ) {

	let h = 2166136261;

	for ( let i = 0; i < value.length; i ++ ) {

		h ^= value.charCodeAt( i );
		h = Math.imul( h, 16777619 );

	}

	return ( h >>> 0 );

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

			if ( len === 0 ) {

				dist = ( x - x1 ) ** 2 + ( z - z1 ) ** 2;

			} else {

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

function insideWorld( poly ) {

	return poly.some( p => Math.abs( p[ 0 ] ) < WORLD + 200 && Math.abs( p[ 1 ] ) < WORLD + 200 );

}

// ---------- clasificación ----------

const buildingsRaw = [];
const roads = [];
const beach = [];
const parks = [];
const water = [];
const coastlineWays = [];
const reefs = [];
const piers = [];
const parking = [];
const roadNames = new Map();

for ( const way of ways ) {

	const tags = way.tags;
	const refs = way.refs;
	if ( refs.length < 2 ) continue;
	const pts = points( way );
	if ( pts.length < 2 ) continue;

	if ( tags.building && tags.building !== 'no' ) {

		if ( pts.length < 4 ) continue;
		const poly = dedupe( simplify( pts, 0.65 ) );
		if ( poly.length < 3 ) continue;
		const a = area( poly );
		if ( a < 12 || a > 22000 ) continue;
		if ( ! insideWorld( poly ) ) continue;
		const levels = Number.parseFloat( tags[ 'building:levels' ] );
		let height = Number.parseFloat( tags.height );

		if ( ! Number.isFinite( height ) ) {

			if ( Number.isFinite( levels ) && levels > 0 ) {

				height = levels * 3.1 + 1;

			} else {

				const h = bitHash( way.id );
				const kind = tags.building;
				let base = 7 + ( h % 9 );

				if ( kind === 'apartments' || kind === 'residential' ) base += 4;
				if ( kind === 'hotel' ) base += 14;
				if ( kind === 'office' || kind === 'commercial' ) base += 6;
				if ( a > 1200 ) base += 5;
				if ( tags[ 'building:levels' ] ) base = Math.max( base, 5 );
				height = base;

				// un puñado de torres reconocibles, siempre fuera del casco antiguo
				if ( h % 97 === 0 ) height += 22;

			}

		}

		height = Math.max( 3.2, Math.min( 58, height ) );

		const [ cx, cz ] = centroid( poly );
		const dist = Math.hypot( cx, cz );
		const hash = bitHash( way.id );

		// el borde costero de Guanarteme es más bajo y doméstico
		if ( dist < 700 && height > 30 ) height = 18 + ( hash % 10 );

		buildingsRaw.push( {
			p: poly,
			h: Math.round( height * 10 ) / 10,
			c: hash % 7,
			cx: Math.round( cx ),
			cz: Math.round( cz )
		} );

	} else if ( tags.highway ) {

		const hw = tags.highway;
		const allowed = [ 'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street', 'pedestrian', 'footway', 'cycleway', 'service', 'track', 'steps' ];
		if ( ! allowed.includes( hw ) ) continue;
		if ( tags.area === 'yes' ) continue;
		if ( tags.tunnel || tags.covered ) continue;
		if ( tags.access === 'private' && hw === 'service' ) continue;

		const line = dedupe( simplify( pts, 0.9 ) );
		if ( line.length < 2 ) continue;
		if ( ! insideWorld( line ) ) continue;

		let width = Number.parseFloat( tags.width );

		if ( ! Number.isFinite( width ) ) {

			width = {
				motorway: 24, trunk: 22, primary: 20, secondary: 15, tertiary: 11,
				unclassified: 8, residential: 8, living_street: 7, pedestrian: 6,
				footway: 2.4, cycleway: 2.8, service: 4.5, track: 4, steps: 2.2
			}[ hw ] || 6;

		}

		width = Math.max( 1.8, Math.min( 30, width ) );
		const name = tags.name || '';
		if ( name ) roadNames.set( name, ( roadNames.get( name ) || 0 ) + 1 );

		roads.push( {
			k: hw,
			w: Math.round( width * 10 ) / 10,
			n: name,
			b: tags.bridge === 'yes' ? 1 : 0,
			p: line
		} );

	} else if ( tags.natural === 'coastline' ) {

		coastlineWays.push( way );

	} else if ( tags.natural === 'beach' ) {

		const poly = dedupe( simplify( pts, 1 ) );
		if ( poly.length >= 3 && area( poly ) > 120 && insideWorld( poly ) ) beach.push( poly );

	} else if ( tags.natural === 'water' ) {

		const poly = dedupe( simplify( pts, 1 ) );
		if ( poly.length >= 3 && area( poly ) > 200 && insideWorld( poly ) ) water.push( poly );

	} else if ( tags.leisure === 'park' || tags.leisure === 'garden' || tags.leisure === 'pitch' || tags.leisure === 'playground' || tags.landuse === 'grass' || tags.landuse === 'recreation_ground' || tags.landuse === 'village_green' ) {

		const poly = dedupe( simplify( pts, 1 ) );
		if ( poly.length >= 3 && area( poly ) > 90 && insideWorld( poly ) ) parks.push( { p: poly, t: tags.leisure || tags.landuse } );

	} else if ( tags.natural === 'reef' ) {

		reefs.push( simplify( pts, 1 ) );

	} else if ( tags.man_made === 'pier' || tags.man_made === 'breakwater' ) {

		piers.push( { p: simplify( pts, 0.8 ), w: tags.man_made === 'pier' ? 8 : 12 } );

	} else if ( tags.amenity === 'parking' ) {

		const poly = dedupe( simplify( pts, 1 ) );
		if ( poly.length >= 3 && area( poly ) > 300 && insideWorld( poly ) ) parking.push( poly );

	}

}

// ---------- ensamblado de la costa ----------

function buildCoastChains( waysIn ) {

	const endpointMap = new Map();
	const visited = new Set();
	const chains = [];

	for ( const way of waysIn ) {

		if ( way.refs.length < 2 ) continue;

		for ( const id of [ way.refs[ 0 ], way.refs[ way.refs.length - 1 ] ] ) {

			if ( ! endpointMap.has( id ) ) endpointMap.set( id, [] );
			endpointMap.get( id ).push( way );

		}

	}

	function walk( start, startAtEnd ) {

		const chain = [];
		let current = start;
		let atEnd = startAtEnd;

		while ( current && ! visited.has( current.id ) ) {

			visited.add( current.id );
			let refs = current.refs.slice();
			if ( atEnd ) refs = refs.reverse();

			if ( chain.length === 0 ) {

				chain.push( ...refs );

			} else {

				chain.push( ...refs.slice( 1 ) );

			}

			const endId = refs[ refs.length - 1 ];
			const candidates = ( endpointMap.get( endId ) || [] ).filter( w => ! visited.has( w.id ) );
			current = candidates[ 0 ];
			if ( current ) atEnd = current.refs[ 0 ] !== endId;

		}

		return chain;

	}

	for ( const [ id, list ] of endpointMap ) {

		if ( list.length === 1 ) {

			const chain = walk( list[ 0 ], list[ 0 ].refs[ 0 ] !== id );
			if ( chain.length > 1 ) chains.push( chain );

		}

	}

	for ( const way of waysIn ) {

		if ( visited.has( way.id ) ) continue;
		const chain = walk( way, false );
		if ( chain.length > 1 ) chains.push( chain );

	}

	return chains;

}

function refsToPoints( refs ) {

	const pts = [];

	for ( const id of refs ) {

		const node = nodes[ id ];
		if ( node ) pts.push( project( node[ 0 ], node[ 1 ] ) );

	}

	return pts;

}

function longestRun( pts, limit ) {

	let best = [];
	let run = [];

	for ( const p of pts ) {

		if ( Math.abs( p[ 0 ] ) < limit && Math.abs( p[ 1 ] ) < limit ) {

			run.push( p );
			if ( run.length > best.length ) best = run.slice();

		} else {

			run = [];

		}

	}

	return best;

}

const chains = buildCoastChains( coastlineWays ).map( refsToPoints ).filter( pts => pts.length > 2 );

// la cadena de Las Canteras es la que más puntos aporta junto a la playa
const lasCanterasBox = { x0: - 700, x1: 1900, z0: - 2700, z1: - 100 };
let coastRaw = [];
let bestCoastScore = - 1;

for ( const pts of chains ) {

	const score = pts.filter( p => p[ 0 ] > lasCanterasBox.x0 && p[ 0 ] < lasCanterasBox.x1 && p[ 1 ] > lasCanterasBox.z0 && p[ 1 ] < lasCanterasBox.z1 ).length;
	const run = longestRun( pts, 2750 );

	if ( score > 4 && run.length > 10 && ( score > bestCoastScore || ( score === bestCoastScore && run.length > coastRaw.length ) ) ) {

		coastRaw = run;
		bestCoastScore = score;

	}

}

console.log( 'Cadenas de costa:', chains.length, '· elegida con', bestCoastScore, 'puntos en Las Canteras' );

// recorta al tramo Auditorio → La Puntilla, que es el que se recorre
const bayCoast = coastRaw.filter( p => p[ 0 ] > - 850 && p[ 1 ] < - 220 );

if ( bayCoast.length > 20 ) coastRaw = bayCoast;

const coast = simplify( dedupe( coastRaw ), 2 );

// lado tierra local: en cada punto la normal apunta hacia el casco de Guanarteme
const inlandReference = [ 0, 0 ];

function landNormal( index ) {

	const p = coast[ Math.max( 0, index - 1 ) ];
	const q = coast[ Math.min( coast.length - 1, index + 1 ) ];
	const dx = q[ 0 ] - p[ 0 ], dz = q[ 1 ] - p[ 1 ];
	const len = Math.hypot( dx, dz ) || 1;
	let nx = dz / len;
	let nz = - dx / len;
	const cx = inlandReference[ 0 ] - coast[ index ][ 0 ];
	const cz = inlandReference[ 1 ] - coast[ index ][ 1 ];

	if ( nx * cx + nz * cz < 0 ) {

		nx = - nx;
		nz = - nz;

	}

	return [ nx, nz ];

}

function offsetLine( line, distance, from = 0, to = line.length ) {

	const out = [];

	for ( let i = from; i < to; i ++ ) {

		const [ nx, nz ] = landNormal( i );
		out.push( [ Math.round( ( line[ i ][ 0 ] + nx * distance ) * 10 ) / 10, Math.round( ( line[ i ][ 1 ] + nz * distance ) * 10 ) / 10 ] );

	}

	return out;

}

const last = coast[ coast.length - 1 ];
const first = coast[ 0 ];

// cierre tierra adentro: un polígono simple al este/sur de la costa
const landPolygon = coast.concat( [
	[ last[ 0 ] + 6000, last[ 1 ] ],
	[ last[ 0 ] + 6000, 6000 ],
	[ first[ 0 ] + 6000, 6000 ]
] );


// paseo marítimo: desde el inicio de la playa hasta La Puntilla
const beachStart = coast.findIndex( p => p[ 0 ] > - 120 && p[ 1 ] < - 400 );
const promenadeFull = offsetLine( coast, 70 );
const rawPromenade = promenadeFull.slice( beachStart >= 0 ? beachStart : 0 );

// suavizado ligero para que el paseo no herede el ruido de la costa
const promenade = rawPromenade.map( ( p, i ) => {

	if ( i === 0 || i === rawPromenade.length - 1 ) return p;
	const a = rawPromenade[ i - 1 ];
	const b = rawPromenade[ i + 1 ];
	return [
		Math.round( ( ( a[ 0 ] + p[ 0 ] * 2 + b[ 0 ] ) / 4 ) * 10 ) / 10,
		Math.round( ( ( a[ 1 ] + p[ 1 ] * 2 + b[ 1 ] ) / 4 ) * 10 ) / 10
	];

} );

console.log( 'Paseo marítimo: desde índice', beachStart, '·', promenade.length, 'puntos' );

console.log( 'Costa:', coast.length, 'puntos · normales locales hacia Guanarteme' );
console.log( 'Playas:', beach.length, '· parques:', parks.length, '· agua:', water.length, '· arrecifes:', reefs.length, '· muelles:', piers.length );
console.log( 'Viario:', roads.length, '· edificios:', buildingsRaw.length, '· nombres de calle:', roadNames.size );
console.log( 'Paseo marítimo:', promenade.length, 'puntos' );

const streets = [ ...roadNames.entries() ].sort( ( a, b ) => b[ 1 ] - a[ 1 ] ).slice( 0, 40 );
console.log( 'Calles principales:', streets.map( s => s[ 0 ] ).join( ' · ' ) );

const payload = {
	meta: {
		city: 'las-palmas',
		center: CENTER,
		attribution: '© OpenStreetMap contributors (ODbL)',
		generatedAt: new Date().toISOString()
	},
	coast,
	land: landPolygon,
	promenade,
	beach,
	parks,
	water,
	reefs,
	piers,
	parking,
	roads,
	buildings: buildingsRaw
};

await fs.mkdir( OUT, { recursive: true } );
await fs.writeFile( path.join( OUT, 'las-palmas.json' ), JSON.stringify( payload ) );
console.log( `Escrito public/data/las-palmas.json · ${( ( await fs.stat( path.join( OUT, 'las-palmas.json' ) ) ).size / 1048576 ).toFixed( 2 )} MB` );
