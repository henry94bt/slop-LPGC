/**
 * Descarga la base geográfica de Las Canteras / Guanarteme / Auditorio
 * desde la API de OpenStreetMap en teselas de ~0,8 km y la guarda en
 * tools/cache/osm-raw.json.
 *
 * Uso: npm run fetch:osm
 * Datos © OpenStreetMap contributors (ODbL).
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const CACHE_DIR = path.resolve( 'tools/cache' );
const BBOX = {
	south: 28.1085,
	north: 28.1475,
	west: -15.4655,
	east: -15.4255
};
const TILES_X = 5;
const TILES_Y = 5;
const API = 'https://api.openstreetmap.org/api/0.6/map';
const UA = 'slop-las-palmas/1.0 (offline city bake; contact: local)';

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

	for ( const match of source.matchAll( /([\w:-]+)="([^"]*)"/g ) ) {

		result[ match[ 1 ] ] = decode( match[ 2 ] );

	}

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

		for ( const tag of body.matchAll( /<tag\s+k="([^"]*)"\s+v="([^"]*)"\s*\/?>/g ) ) {

			tags[ decode( tag[ 1 ] ) ] = decode( tag[ 2 ] );

		}

		ways.set( a.id, { id: a.id, refs, tags } );

	}

}

async function main() {

	await fs.mkdir( CACHE_DIR, { recursive: true } );

	const nodes = new Map();
	const ways = new Map();
	const dLat = ( BBOX.north - BBOX.south ) / TILES_Y;
	const dLon = ( BBOX.east - BBOX.west ) / TILES_X;

	let tile = 0;
	const total = TILES_X * TILES_Y;

	for ( let y = 0; y < TILES_Y; y ++ ) {

		for ( let x = 0; x < TILES_X; x ++ ) {

			tile ++;
			const south = BBOX.south + y * dLat;
			const north = south + dLat;
			const west = BBOX.west + x * dLon;
			const east = west + dLon;
			const url = `${API}?bbox=${west.toFixed( 6 )},${south.toFixed( 6 )},${east.toFixed( 6 )},${north.toFixed( 6 )}`;

			let ok = false;

			for ( let attempt = 0; attempt < 3 && ! ok; attempt ++ ) {

				try {

					const response = await fetch( url, { headers: { 'User-Agent': UA } } );

					if ( ! response.ok ) {

						console.warn( `  tesela ${tile}/${total}: HTTP ${response.status}` );
						await new Promise( r => setTimeout( r, 1500 * ( attempt + 1 ) ) );
						continue;

					}

					const xml = await response.text();

					if ( ! xml.includes( '<osm' ) ) {

						console.warn( `  tesela ${tile}/${total}: respuesta inesperada` );
						continue;

					}

					parseOsm( xml, nodes, ways );
					console.log( `  tesela ${tile}/${total} · ${( xml.length / 1048576 ).toFixed( 2 )} MB · ${nodes.size} nodos / ${ways.size} vías` );
					ok = true;

				} catch ( error ) {

					console.warn( `  tesela ${tile}/${total}: ${error.message}` );
					await new Promise( r => setTimeout( r, 1500 * ( attempt + 1 ) ) );

				}

			}

			if ( ! ok ) throw new Error( `No se pudo descargar la tesela ${tile}` );

			await new Promise( r => setTimeout( r, 350 ) );

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

	await fs.writeFile( path.join( CACHE_DIR, 'osm-raw.json' ), JSON.stringify( payload ) );
	console.log( `Listo: ${nodes.size} nodos, ${ways.size} vías · tools/cache/osm-raw.json` );

}

main().catch( error => {

	console.error( error );
	process.exit( 1 );

} );
