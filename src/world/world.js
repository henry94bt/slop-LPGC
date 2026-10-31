import * as THREE from 'three';
import { CITY, BILLBOARD_SITES, BRANDS } from '../config/city.js';
import { yawTowards } from '../utils/geo.js';
import { buildTerrain } from './terrain.js';
import { createBuildings } from './buildings.js';
import { createPalms } from './palms.js';
import { createBillboards } from './billboards.js';
import { createAuditorio } from './auditorio.js';
import { createReef } from './reef.js';
import { createBeachProps } from './beach-props.js';
import { createFurniture } from './furniture.js';
import { createBusStops, createFacadeAds, createPromenadeMupis, createLocalBoards } from './street-ads.js';
import { createTraffic } from './traffic.js';
import { createCrowd } from './crowd.js';
import { createTrees } from './trees.js';
import { createPlanters } from './planters.js';
import { createShopSigns } from './shop-signs.js';

function polylineLength( points ) {

	let total = 0;

	for ( let i = 1; i < points.length; i ++ ) {

		total += Math.hypot( points[ i ][ 0 ] - points[ i - 1 ][ 0 ], points[ i ][ 1 ] - points[ i - 1 ][ 1 ] );

	}

	return total;

}

export function buildWorld( { data, renderer, scene, preset, textures, castShadows = true } ) {

	const terrain = buildTerrain( data );
	scene.add( terrain.group );

	const buildings = createBuildings( data, { castShadows } );
	scene.add( buildings.group );

	const landmark = createAuditorio( {
		x: CITY.landmark.x,
		z: CITY.landmark.z,
		coastField: terrain.coastField,
		castShadows
	} );
	scene.add( landmark.group );

	function insideLandmark( x, z, margin = 0 ) {

		const c = landmark.collider;
		return x > c.minX - margin && x < c.maxX + margin && z > c.minZ - margin && z < c.maxZ + margin;

	}

	function blocked( x, z, radius = 0.55 ) {

		if ( insideLandmark( x, z, 0.8 ) ) return true;
		return buildings.blocked( x, z, radius );

	}

	// ---------- vallas ----------

	function findStreetSite( config ) {

		const candidates = data.roads
			.filter( road => road.n === config.street && road.p.length > 1 )
			.sort( ( a, b ) => {

				const ma = a.p[ Math.floor( a.p.length / 2 ) ];
				const mb = b.p[ Math.floor( b.p.length / 2 ) ];
				const da = Math.hypot( ma[ 0 ] - 520, ma[ 1 ] + 420 );
				const db = Math.hypot( mb[ 0 ] - 520, mb[ 1 ] + 420 );
				return da - db || polylineLength( b.p ) - polylineLength( a.p );

			} );

		for ( const road of candidates ) {

			const baseOffsets = [
				road.w / 2 + 1.6,
				road.w / 2 + 3.4,
				road.w / 2 + 6,
				12,
				16
			];

			for ( const t of [ config.t, 0.5, 0.64, 0.36, 0.78, 0.22, 0.86 ] ) {

				const p = terrain.pointAlong( road.p, t );

				for ( const side of [ 1, - 1 ] ) {

					const nx = - p.tz * side;
					const nz = p.tx * side;

					for ( const offset of baseOffsets ) {

						const x = p.x + nx * offset;
						const z = p.z + nz * offset;

						if ( ! terrain.coastField.isLand( x, z, 5 ) ) continue;
						if ( blocked( x, z, 1.5 ) ) continue;
						if ( insideLandmark( x, z, 20 ) ) continue;

						return {
							brand: config.brand,
							x,
							z,
							yaw: Math.atan2( - nx, - nz ),
							width: config.width,
							anchor: config.street
						};

					}

				}

			}

			// si la calle está completamente construida, busca un hueco en la manzana
			const p = terrain.pointAlong( road.p, config.t );

			for ( let ring = 1; ring <= 4; ring ++ ) {

				for ( let i = 0; i < 8; i ++ ) {

					const angle = i / 8 * Math.PI * 2;
					const x = p.x + Math.cos( angle ) * ring * 4.2;
					const z = p.z + Math.sin( angle ) * ring * 4.2;

					if ( ! terrain.coastField.isLand( x, z, 5 ) ) continue;
					if ( blocked( x, z, 1.4 ) ) continue;
					if ( insideLandmark( x, z, 20 ) ) continue;

					return {
						brand: config.brand,
						x,
						z,
						yaw: Math.atan2( p.x - x, p.z - z ),
						width: config.width,
						anchor: config.street
					};

				}

			}

		}

		return null;

	}

	function findPromenadeSite( config ) {

		if ( ! terrain.promenade ) return null;

		for ( const t of [ config.t, config.t + 0.025, config.t - 0.025, config.t + 0.05 ] ) {

			const p = terrain.pointAlong( terrain.promenade, t );
			const q = terrain.coastField.query( p.x, p.z );

			for ( const offset of [ config.offset, 2, - 3, 8 ] ) {

				const x = p.x + q.nx * offset;
				const z = p.z + q.nz * offset;

				if ( ! terrain.coastField.isLand( x, z, 5 ) ) continue;
				if ( blocked( x, z, 2.2 ) ) continue;

				let nx, nz;

				if ( config.facing === 'sea' ) {

					nx = - q.nx;
					nz = - q.nz;

				} else if ( config.facing === 'path-forward' ) {

					nx = p.tx;
					nz = p.tz;

				} else {

					nx = - p.tx;
					nz = - p.tz;

				}

				return {
					brand: config.brand,
					x,
					z,
					yaw: Math.atan2( nx, nz ),
					width: config.width,
					anchor: 'paseo'
				};

			}

		}

		return null;

	}

	const sites = [];

	for ( const config of BILLBOARD_SITES ) {

		const site = config.anchor === 'street'
			? findStreetSite( config )
			: findPromenadeSite( config );

		if ( site ) sites.push( site );

	}

	const billboards = createBillboards( sites, textures, preset );
	scene.add( billboards.group );

	// ---------- palmeras ----------

	const spawnAnchor = terrain.promenade
		? terrain.pointAlong( terrain.promenade, CITY.spawn.t )
		: { x: 0, z: 0 };

	const palms = createPalms( data, {
		promenade: terrain.promenade,
		coastField: terrain.coastField,
		blocked,
		exclusions: [
			...sites.map( site => ( { x: site.x, z: site.z, r: 17 } ) ),
			{ x: CITY.landmark.x, z: CITY.landmark.z, r: 82 },
			{ x: spawnAnchor.x, z: spawnAnchor.z, r: 11 }
		],
		castShadows
	} );
	scene.add( palms.mesh );

	// ---------- La Barra ----------

	const reef = createReef( {
		promenade: terrain.promenade,
		coastField: terrain.coastField,
		pointAlong: terrain.pointAlong
	} );
	scene.add( reef.group );

	// ---------- sombrillas, toallas y torres de socorrista ----------

	const beachProps = createBeachProps( {
		promenade: terrain.promenade,
		coastField: terrain.coastField,
		pointAlong: terrain.pointAlong,
		exclusions: [
			...sites.map( site => ( { x: site.x, z: site.z, r: 10 } ) ),
			{ x: spawnAnchor.x, z: spawnAnchor.z, r: 22 },
			{ x: CITY.landmark.x, z: CITY.landmark.z, r: 70 }
		],
		castShadows
	} );
	scene.add( beachProps.group );

	// ---------- mobiliario del paseo ----------

	const furniture = createFurniture( {
		promenade: terrain.promenade,
		coastField: terrain.coastField,
		pointAlong: terrain.pointAlong,
		castShadows
	} );
	scene.add( furniture.group );

	const planters = createPlanters( {
		promenade: terrain.promenade,
		pointAlong: terrain.pointAlong,
		coastField: terrain.coastField,
		castShadows
	} );
	scene.add( planters );

	const shopSigns = createShopSigns( {
		data,
		coastField: terrain.coastField
	} );
	scene.add( shopSigns );

	// ---------- paradas de guagua y publicidad de fachada ----------

	const busStops = createBusStops( {
		data,
		textures,
		coastField: terrain.coastField,
		castShadows
	} );
	scene.add( busStops );

	const facadeAds = createFacadeAds( {
		textures,
		pointAlong: terrain.pointAlong,
		promenade: terrain.promenade,
		coastField: terrain.coastField
	} );
	scene.add( facadeAds );

	const mupis = createPromenadeMupis( {
		textures,
		pointAlong: terrain.pointAlong,
		promenade: terrain.promenade,
		coastField: terrain.coastField
	} );
	scene.add( mupis );

	const localBoards = createLocalBoards( {
		textures,
		pointAlong: terrain.pointAlong,
		promenade: terrain.promenade,
		coastField: terrain.coastField
	} );
	scene.add( localBoards );

	// ---------- tráfico y gente ----------

	const trees = createTrees( {
		data,
		coastField: terrain.coastField,
		castShadows
	} );
	scene.add( trees );

	const traffic = createTraffic( {
		data,
		coastField: terrain.coastField,
		castShadows
	} );
	scene.add( traffic );

	let elapsed = 0;

	// ---------- posiciones ----------

	function promenadeSpot( t, offset = 0 ) {

		const p = terrain.pointAlong( terrain.promenade, t );
		const q = terrain.coastField.query( p.x, p.z );
		return {
			x: p.x + q.nx * offset,
			z: p.z + q.nz * offset,
			tx: p.tx,
			tz: p.tz,
			nx: q.nx,
			nz: q.nz
		};

	}

	function inCityGround( x, z ) {

		return ( data.cityGround || [] ).some( rect => x > rect.minX && x < rect.maxX && z > rect.minZ && z < rect.maxZ );

	}

	function groundOk( x, z, margin = 3 ) {

		return inCityGround( x, z ) || terrain.coastField.isLand( x, z, margin );

	}

	function clearSpot( x, z, radius = 1.2 ) {

		if ( ! blocked( x, z, radius ) && groundOk( x, z, 3 ) ) return { x, z, adjusted: false };

		for ( let ring = 1; ring <= 10; ring ++ ) {

			const distance = ring * 2.2;

			for ( let i = 0; i < 12; i ++ ) {

				const angle = i / 12 * Math.PI * 2;
				const nx = x + Math.cos( angle ) * distance;
				const nz = z + Math.sin( angle ) * distance;

				if ( ! blocked( nx, nz, radius ) && groundOk( nx, nz, 3 ) ) return { x: nx, z: nz, adjusted: true };

			}

		}

		return { x, z, adjusted: false };

	}

	const spawnBase = promenadeSpot( CITY.spawn.t, CITY.spawn.offset );
	const spawnAhead = promenadeSpot( Math.min( 0.98, CITY.spawn.t + CITY.spawn.lookAhead ), CITY.spawn.offset );
	const spawnYaw = Math.atan2( - ( spawnAhead.x - spawnBase.x ), - ( spawnAhead.z - spawnBase.z ) ) + ( CITY.spawn.lookOffset || 0 );
	const spawn = {
		x: spawnBase.x,
		z: spawnBase.z,
		yaw: spawnYaw,
		pitch: CITY.spawn.pitch ?? - 0.035
	};

	const kayakBase = promenadeSpot( CITY.kayak.t );
	const kayakAhead = promenadeSpot( Math.min( 0.98, CITY.kayak.t + 0.05 ) );
	const kayakSpawn = {
		x: kayakBase.x - kayakBase.nx * CITY.kayak.offshore,
		z: kayakBase.z - kayakBase.nz * CITY.kayak.offshore,
		yaw: Math.atan2( - ( kayakAhead.x - kayakBase.x ), - ( kayakAhead.z - kayakBase.z ) ) - 0.62
	};

	const crowd = createCrowd( {
		data,
		promenade: terrain.promenade,
		pointAlong: terrain.pointAlong,
		coastField: terrain.coastField,
		spawn,
		castShadows
	} );
	scene.add( crowd.group );

	function resolvePlace( name ) {

		const place = CITY.places[ name ];
		if ( ! place ) return null;

		if ( place.anchor === 'promenade' ) {

			const p = promenadeSpot( place.t, place.offset || 0 );

			if ( place.mode === 'kayak' ) {

				return {
					mode: 'kayak',
					x: p.x - p.nx * place.offshore,
					z: p.z - p.nz * place.offshore,
					yaw: Math.atan2( - p.tx, - p.tz )
				};

			}

			return {
				mode: 'walk',
				x: p.x,
				z: p.z,
				yaw: Math.atan2( - p.tx, - p.tz )
			};

		}

		const spot = clearSpot( place.x, place.z, 1.2 );
		const yaw = place.lookAt
			? yawTowards( spot.x, spot.z, place.lookAt[ 0 ], place.lookAt[ 1 ] )
			: 0;

		return { mode: place.mode || 'walk', x: spot.x, z: spot.z, yaw };

	}

	// ---------- zonas ----------

	function distanceToPromenade( x, z ) {

		if ( ! terrain.promenade ) return Infinity;
		let best = Infinity;

		for ( let i = 0; i < terrain.promenade.length - 1; i ++ ) {

			const a = terrain.promenade[ i ];
			const b = terrain.promenade[ i + 1 ];
			const dx = b[ 0 ] - a[ 0 ];
			const dz = b[ 1 ] - a[ 1 ];
			const len = dx * dx + dz * dz || 1;
			let t = ( ( x - a[ 0 ] ) * dx + ( z - a[ 1 ] ) * dz ) / len;
			t = Math.max( 0, Math.min( 1, t ) );
			const px = a[ 0 ] + dx * t;
			const pz = a[ 1 ] + dz * t;
			best = Math.min( best, ( x - px ) ** 2 + ( z - pz ) ** 2 );

		}

		return Math.sqrt( best );

	}

	function zoneAt( x, z, mode ) {

		if ( mode === 'kayak' ) {

			return terrain.coastField.query( x, z ).distance > 300 ? 'La Barra · Las Canteras' : 'Bahía de Las Canteras';

		}

		if ( Math.hypot( x - CITY.landmark.x, z - CITY.landmark.z ) < 165 ) return 'Auditorio Alfredo Kraus';
		if ( distanceToPromenade( x, z ) < 34 ) return 'Paseo de Las Canteras';
		if ( x > 1800 && z > 1800 ) return 'Vegueta · Triana';
		if ( z > 1200 ) return 'Ciudad Jardín';
		if ( x > 2400 && z < 1200 ) return 'Puerto · La Isleta';

		const mesa = CITY.zones.find( zone => zone.id === 'mesa' );
		if ( mesa && Math.hypot( x - mesa.x, z - mesa.z ) < mesa.radius ) return 'Av. José Mesa y López';

		if ( z > - 620 && x < 900 ) return 'Guanarteme';
		return 'Las Canteras';

	}

	function walkable( x, z ) {

		return groundOk( x, z, 0.9 ) && ! blocked( x, z, 0.5 );

	}

	function kayakable( x, z ) {

		return terrain.coastField.isWater( x, z, 8 ) && Math.hypot( x, z ) < 2150;

	}

	return {
		data,
		terrain,
		buildings,
		palms,
		billboards,
		landmark,
		reef,
		sites,
		trees,
		planters,
		shopSigns,
		traffic,
		crowd,
		busStops,
		facadeAds,
		mupis,
		localBoards,
		spawn,
		kayakSpawn,
		blocked,
		walkable,
		kayakable,
		zoneAt,
		resolvePlace,
		promenadeSpot,
		insideLandmark,
		update( delta ) {

			elapsed += delta;
			terrain.update( delta );
			palms.update( delta );
			crowd.update( delta, elapsed );

		},
		setLighting( next ) {

			buildings.setLighting( next );
			billboards.setLighting( next );

		}
	};

}
