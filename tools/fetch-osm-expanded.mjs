/**
 * Descarga toda Las Palmas (La Isleta → Vegueta, incluyendo Tamaraceite)
 * en teselas de ~1 km desde la API de OpenStreetMap.
 *
 * Uso: node tools/fetch-osm-expanded.mjs
 * Salida: tools/cache/osm-expanded.json
 *
 * Datos © OpenStreetMap contributors (ODbL).
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const CACHE_DIR = path.resolve( 'tools/cache' );
const BBOX = {
	south: 28.072,
	north: 28.172,
	west: - 15.478,
	east: - 15.382
};
const TILES_X = 10;
const TILES_Y = 11;
const API = 'https://api.openstreetmap.org/api/0.6/map';
const UA = 'slop-las-palmas/2.0 (offline city bake; contact: local)';

function decode( value ) {

	return value
		.replace( /&amp;/g, '&' )
		.replace( /&quot;/g, '"' )
		.replace( /&apos;/g, "'" )
		.replace( /&lt;/g, '<' )
		.replace( /&gt;/g, '>' );

}

function attrs( source ) {

	const result = {};

	for ( const match of source.matchAll( /([\w:-]+)="([^"]*)"/g ) ) result[ match[ 1 ] ] = decode( match[ 2 ] );
	return result;

}

function parseOsm( xml, nodes, ways ) {

	for ( const match of xml.matchAll( /<node\b([^>]*?)\/?>/g ) ) {

		const a = attrs( match[ 1 ] );
		if ( a.id && a.lat && a.lon ) nodes.set( a.id, [ Number( a.lon ), Number( a.lat ) ] );

	}

	for ( const match of xml.matchAll( /<way\b([^>]*)>([\s\S]*?)<\/way>/g ) ) {

		const a = attrs( match[ 1 ] );
		const body = match[ 2 ];
		const refs = [ ...body.matchAll( /<nd\s+ref="(-?\d+)"/g ) ].map( m => m[ 1 ] );
		const tags = {};

		for ( const tag of body.matchAll( /<tag\s+k="([^"]*)"\s+v="([^"]*)"\s*\/?>/g ) ) tags[ decode( tag[ 1 ] ) ] = decode( tag[ 2 ] );
		ways.set( a.id, { id: a.id, refs, tags } );

	}

}

async function fetchTile( south, west, north, east, label ) {

	const url = `${API}?bbox=${west.toFixed( 6 )},${south.toFixed( 6 )},${east.toFixed( 6 )},${north.toFixed( 6 )}`;

	for ( let attempt = 0; attempt < 4; attempt ++ ) {

		try {

			const response = await fetch( url, { headers: { 'User-Agent': UA } } );

			if ( response.ok ) {

				const xml = await response.text();
				if ( ! xml.includes( '<osm' ) ) throw new Error( 'respuesta no OSM' );
				return xml;

			}

			if ( response.status === 400 && attempt === 0 ) {

				// tesela demasiado densa: dividir en cuatro
				const midLat = ( south + north ) / 2;
				const midLon = ( west + east ) / 2;
				const parts = await Promise.all( [
					fetchTile( south, west, midLat, midLon, label + '.1' ),
					fetchTile( south, midLon, midLat, east, label + '.2' ),
					fetchTile( midLat, west, north, midLon, label + '.3' ),
					fetchTile( midLat, midLon, north, east, label + '.4' )
				] );
				return parts.join( '' );

			}

			console.warn( `  ${label}: HTTP ${response.status}` );

		} catch ( error ) {

			console.warn( `  ${label}: ${error.message}` );

		}

		await new Promise( r => setTimeout( r, 1200 * ( attempt + 1 ) ) );

	}

	throw new Error( `No se pudo descargar ${label}` );

}

async function main() {

	await fs.mkdir( CACHE_DIR, { recursive: true } );

	const nodes = new Map();
	const ways = new Map();
	const dLat = ( BBOX.north - BBOX.south ) / TILES_Y;
	const dLon = ( BBOX.east - BBOX.west ) / TILES_X;
	let tile = 0;
	const total = TILES_X * TILES_Y;
	const started = Date.now();

	for ( let y = 0; y < TILES_Y; y ++ ) {

		for ( let x = 0; x < TILES_X; x ++ ) {

			tile ++;
			const south = BBOX.south + y * dLat;
			const north = south + dLat;
			const west = BBOX.west + x * dLon;
			const east = west + dLon;
			const xml = await fetchTile( south, west, north, east, `${tile}/${total}` );
			parseOsm( xml, nodes, ways );
			const elapsed = ( ( Date.now() - started ) / 1000 ).toFixed( 0 );
			console.log( `  ${tile}/${total} · ${nodes.size} nodos / ${ways.size} vías · ${elapsed}s` );
			await new Promise( r => setTimeout( r, 320 ) );

		}

	}

	const payload = {
		meta: {
			bbox: BBOX,
			fetchedAt: new Date().toISOString(),
			attribution: '© OpenStreetMap contributors (ODbL)'
		},
		nodes: Object.fromEntries( nodes ),
		ways: [ ...ways.values() ]
	};

	await fs.writeFile( path.join( CACHE_DIR, 'osm-expanded.json' ), JSON.stringify( payload ) );
	console.log( `Listo: ${nodes.size} nodos, ${ways.size} vías · tools/cache/osm-expanded.json` );

}

main().catch( error => {

	console.error( error );
	process.exit( 1 );

} );
