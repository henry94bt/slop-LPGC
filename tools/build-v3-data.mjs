/**
 * Convierte la base OSM de la v2 en datos compactos para el renderer v3.
 * Salida: v3/city-data.js
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve( import.meta.dirname, '..' );
const data = JSON.parse( await fs.readFile( path.join( ROOT, 'public/data/las-palmas.json' ), 'utf8' ) );

const buildings = [];
const styles = [ 0, 1, 2, 3, 4 ];

for ( const b of data.buildings ) {

	let minX = Infinity, maxX = - Infinity, minZ = Infinity, maxZ = - Infinity;

	for ( const [ x, z ] of b.p ) {

		minX = Math.min( minX, x );
		maxX = Math.max( maxX, x );
		minZ = Math.min( minZ, z );
		maxZ = Math.max( maxZ, z );

	}

	const cx = ( minX + maxX ) / 2;
	const cz = ( minZ + maxZ ) / 2;
	const w = maxX - minX;
	const d = maxZ - minZ;
	if ( w < 2.5 || d < 2.5 || w > 120 || d > 120 ) continue;
	if ( b.h < 2.5 || b.h > 85 ) continue;

	buildings.push( {
		cx: Math.round( cx * 10 ) / 10,
		cz: Math.round( cz * 10 ) / 10,
		x0: Math.round( minX * 10 ) / 10,
		x1: Math.round( maxX * 10 ) / 10,
		z0: Math.round( minZ * 10 ) / 10,
		z1: Math.round( maxZ * 10 ) / 10,
		h: Math.round( b.h * 10 ) / 10,
		s: styles[ b.c % styles.length ],
		seed: ( Math.abs( Math.round( cx * 13 + cz * 7 ) ) % 997 ) + 1,
		tone: ( b.c % 7 ) / 7,
		sf: b.h < 45 ? 1 : 0,
		p: b.p.map( ( [ x, z ] ) => [ Math.round( x * 10 ) / 10, Math.round( z * 10 ) / 10 ] )
	} );

}

const roads = data.roads
	.filter( r => r.w >= 2.2 && r.p.length >= 2 )
	.map( r => ( {
		p: r.p.map( ( [ x, z ] ) => [ Math.round( x * 10 ) / 10, Math.round( z * 10 ) / 10 ] ),
		w: Math.round( r.w * 10 ) / 10,
		k: r.k
	} ) );

const payload = {
	buildings,
	roads,
	land: data.land,
	beach: data.beach,
	cityGround: data.cityGround,
	stats: { buildings: buildings.length, roads: roads.length }
};

const js = `// Generado por tools/build-v3-data.mjs. © OpenStreetMap contributors (ODbL).\nexport const CITY = ${JSON.stringify( payload )};\n`;
await fs.writeFile( path.join( ROOT, 'v3/city-data.js' ), js );
console.log( `v3/city-data.js · ${( Buffer.byteLength( js ) / 1048576 ).toFixed( 2 )} MB · ${buildings.length} edificios · ${roads.length} calles` );
