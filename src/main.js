import './style.css';
import * as THREE from 'three';

import { CITY, LIGHTING_PRESETS, BRANDS } from './config/city.js';
import { createEngine } from './core/engine.js';
import { createSky } from './world/sky.js';
import { createLighting } from './world/lighting.js';
import { createOcean } from './world/ocean.js';
import { buildWorld } from './world/world.js';
import { loadBillboardTextures } from './world/billboards.js';
import { createPlayer } from './player/player.js';
import { createInput } from './player/input.js';
import { createHud } from './ui/hud.js';
import { createMinimap } from './ui/minimap.js';
import { createAmbience } from './audio/ambience.js';
import { setMaxAnisotropy } from './utils/textures.js';
import { assetUrl } from './utils/assets.js';

const PRESET_ORDER = [ 'golden-hour', 'blue-hour', 'noche' ];

async function boot() {

	const canvas = document.getElementById( 'scene' );

	const hud = createHud( {
		onMode: mode => handleMode( mode ),
		onPlace: place => handlePlace( place ),
		onLight: () => cycleLighting(),
		onSound: () => toggleSound()
	} );

	let engine;

	try {

		engine = createEngine( canvas );

	} catch ( error ) {

		console.error( error );
		hud.showError( error.message );
		return;

	}

	setMaxAnisotropy( engine.renderer.capabilities.getMaxAnisotropy() );

	const { scene, camera, renderer, lowPower } = engine;
	const castShadows = ! lowPower;

	let preset = LIGHTING_PRESETS[ CITY.defaultLighting ];
	engine.renderer.toneMappingExposure = preset.exposure;
	engine.setBloom( preset.bloom );

	hud.setLoading( 0.06, 'Leyendo la costa…' );

	// tipografía local para los rótulos 3D
	await Promise.race( [
		document.fonts.ready,
		new Promise( resolve => setTimeout( resolve, 1600 ) )
	] );

	let data;

	try {

		const response = await fetch( assetUrl( 'data/las-palmas.json' ) );

		if ( ! response.ok ) throw new Error( `No se pudo cargar la base de la ciudad (HTTP ${response.status})` );
		hud.setLoading( 0.2, 'Trazando Las Canteras…' );
		data = await response.json();

	} catch ( error ) {

		console.error( error );
		hud.showError( error.message );
		return;

	}

	hud.setLoading( 0.42, 'Cargando creatividades…' );

	let textures;

	try {

		textures = await loadBillboardTextures( renderer );

	} catch ( error ) {

		console.error( error );
		textures = Object.fromEntries( Object.entries( BRANDS ).map( ( [ id ] ) => [ id, null ] ) );

	}

	hud.setLoading( 0.6, 'Levantando la ciudad…' );
	await new Promise( resolve => requestAnimationFrame( resolve ) );

	const sky = createSky( scene );
	const lighting = createLighting( scene, preset );
	const ocean = createOcean( scene, preset );

	let world;

	try {

		world = buildWorld( { data, renderer, scene, preset, textures, castShadows } );

	} catch ( error ) {

		console.error( error );
		hud.showError( `Error construyendo la ciudad: ${error.message}` );
		return;

	}

	hud.setLoading( 0.82, 'Colocando palmeras y vallas…' );

	const input = createInput( canvas );
	const player = createPlayer( { world, camera, ocean, input, scene } );
	const minimap = createMinimap( document.getElementById( 'minimap' ), data, world.sites );
	const ambience = createAmbience();

	world.setLighting( preset );
	hud.setPreset( preset );
	hud.setMode( 'walk' );
	hud.bind();

	// calentar shaders antes de quitar la pantalla de carga
	hud.setLoading( 0.92, 'Cocinando la hora dorada…' );
	await new Promise( resolve => requestAnimationFrame( resolve ) );

	try {

		renderer.compile( scene, camera );

	} catch ( error ) {

		console.warn( 'No se pudieron precompilar los shaders', error );

	}

	player.update( 0.016 );
	engine.render();

	hud.setLoading( 1, 'Listo' );
	setTimeout( () => hud.hideLoading(), 420 );

	let currentPresetId = preset.id;
	let fpsFrames = 0;
	let fpsTime = 0;
	let telemetryTime = 0;
	let zoneTime = 0;
	let lastZone = '';
	let nearestBillboard = null;
	let billboardCooldown = 0;
	let lastFrame = performance.now();

	function applyPreset( next ) {

		preset = next;
		currentPresetId = next.id;
		engine.renderer.toneMappingExposure = next.exposure;
		engine.setBloom( next.bloom );
		lighting.apply( next );
		ocean.apply( next );
		world.setLighting( next );
		hud.setPreset( next );

	}

	applyPreset( preset );

	function cycleLighting() {

		const index = PRESET_ORDER.indexOf( currentPresetId );
		const next = LIGHTING_PRESETS[ PRESET_ORDER[ ( index + 1 ) % PRESET_ORDER.length ] ];
		applyPreset( next );
		hud.toast( `Luz: ${next.label} · ${next.clock}` );

	}

	function handleMode( mode ) {

		if ( mode === player.mode ) return;
		player.setMode( mode );
		hud.setMode( mode );
		hud.setZone( world.zoneAt( player.position.x, player.position.z, player.mode ) );
		hud.toast( mode === 'kayak' ? 'Kayak desplegado · Las Canteras' : 'De vuelta en el paseo' );

	}

	function handlePlace( place ) {

		if ( ! player.teleport( place ) ) return;
		hud.setMode( player.mode );
		hud.setZone( world.zoneAt( player.position.x, player.position.z, player.mode ) );

		const names = {
			auditorio: 'Auditorio Alfredo Kraus',
			paseo: 'Paseo de Las Canteras',
			barra: 'La Barra · kayak',
			guanarteme: 'Guanarteme'
		};

		hud.toast( names[ place ] || place );

	}

	async function toggleSound() {

		const enabled = await ambience.toggle();
		hud.setSound( enabled );

	}

	// atajos
	window.addEventListener( 'keydown', event => {

		if ( event.repeat ) return;

		if ( event.code === 'KeyK' ) handleMode( player.mode === 'kayak' ? 'walk' : 'kayak' );
		else if ( event.code === 'KeyL' ) cycleLighting();
		else if ( event.code === 'KeyM' ) toggleSound();
		else if ( event.code === 'Digit1' ) handlePlace( 'auditorio' );
		else if ( event.code === 'Digit2' ) handlePlace( 'paseo' );
		else if ( event.code === 'Digit3' ) handlePlace( 'barra' );
		else if ( event.code === 'Digit4' ) handlePlace( 'guanarteme' );

	} );

	function updateHud( delta ) {

		telemetryTime += delta;

		if ( telemetryTime > 0.12 ) {

			telemetryTime = 0;
			const position = player.position;
			hud.setTelemetry( position.x, position.z, player.speedKmh, player.mode );
			minimap.update( position.x, position.z, player.yaw, player.mode );

		}

		zoneTime += delta;

		if ( zoneTime > 0.45 ) {

			zoneTime = 0;
			const zone = world.zoneAt( player.position.x, player.position.z, player.mode );

			if ( zone !== lastZone ) {

				lastZone = zone;
				hud.setZone( zone );

			}

			// aviso al pasar junto a una valla
			billboardCooldown = Math.max( 0, billboardCooldown - 0.45 );

			if ( billboardCooldown === 0 ) {

				for ( const site of world.sites ) {

					const distance = Math.hypot( site.x - player.position.x, site.z - player.position.z );

					if ( distance < 16 && nearestBillboard !== site ) {

						nearestBillboard = site;
						const brand = BRANDS[ site.brand ];
						hud.toast( `${brand.name} · ${brand.tagline}` );
						billboardCooldown = 10;
						break;

					}

				}

			}

		}

	}

	function animate( now ) {

		requestAnimationFrame( animate );

		const delta = Math.min( ( now - lastFrame ) / 1000, 0.05 );
		lastFrame = now;
		player.update( delta );
		lighting.follow( player.position );
		world.update( delta );
		ocean.update( delta, lighting.sunDirection );
		sky.update( delta, preset, lighting.sunDirection, camera );

		updateHud( delta );

		engine.render();

		fpsFrames ++;
		fpsTime += delta;

		if ( fpsTime > 0.8 ) {

			hud.setFps( fpsFrames / fpsTime );
			fpsFrames = 0;
			fpsTime = 0;

		}

	}

	document.addEventListener( 'visibilitychange', () => {

		if ( ! document.hidden ) lastFrame = performance.now();

	} );

	window.__LAS_PALMAS__ = {
		THREE,
		engine,
		world,
		player,
		input,
		hud,
		preset,
		applyPreset: id => {

			if ( LIGHTING_PRESETS[ id ] ) applyPreset( LIGHTING_PRESETS[ id ] );

		},
		cycleLighting,
		handleMode,
		handlePlace
	};

	requestAnimationFrame( animate );

}

boot().catch( error => {

	console.error( error );
	const fallback = document.getElementById( 'fallback' );
	const detail = document.getElementById( 'fallback-detail' );
	if ( fallback ) fallback.hidden = false;
	if ( detail ) detail.textContent = error.stack || error.message;
	const loading = document.getElementById( 'loading' );
	if ( loading ) loading.style.display = 'none';

} );
