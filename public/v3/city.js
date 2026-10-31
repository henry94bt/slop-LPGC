import * as THREE from 'three/webgpu';
import { pass, vec4 } from 'three/tsl';
import { LightingSystem } from './lib/lighting.js';
import { createPostProcessing } from './lib/post-processing.js';
import {
	createPreWarBuildingMaterial,
	createCurtainWallMaterial,
	createRoadSurfaceMaterial,
	createSidewalkMaterial
} from './lib/tsl-materials.js';
import { createBuildingFootprints } from './lib/building-footprints.js';
import { CITY } from './city-data.js';
import { buildCityLife } from './city-life.js';

const canvas = document.getElementById( 'scene' );
const loading = document.getElementById( 'loading' );
const status = document.getElementById( 'loading-status' );
const errorBox = document.getElementById( 'error' );

function fail( error ) {

	console.error( error );
	errorBox.style.display = 'block';
	errorBox.textContent = error?.stack || String( error );
	loading.classList.add( 'hidden' );

}

function ribbonGeometry( roads, offset, halfWidth, y, filter = () => true ) {

	const positions = [];
	const normals = [];
	const indices = [];

	for ( const road of roads ) {

		if ( ! filter( road ) ) continue;
		const points = road.p;
		if ( points.length < 2 ) continue;
		const rings = [];
		const roadOffset = typeof offset === 'function' ? offset( road ) : offset;
		const roadHalf = typeof halfWidth === 'function' ? halfWidth( road ) : halfWidth;

		for ( let i = 0; i < points.length; i ++ ) {

			const prev = points[ Math.max( 0, i - 1 ) ];
			const next = points[ Math.min( points.length - 1, i + 1 ) ];
			const dx = next[ 0 ] - prev[ 0 ];
			const dz = next[ 1 ] - prev[ 1 ];
			const len = Math.hypot( dx, dz ) || 1;
			const nx = - dz / len;
			const nz = dx / len;
			const cx = points[ i ][ 0 ] + nx * roadOffset;
			const cz = points[ i ][ 1 ] + nz * roadOffset;
			rings.push( [
				[ cx + nx * roadHalf, cz + nz * roadHalf ],
				[ cx - nx * roadHalf, cz - nz * roadHalf ]
			] );

		}

		const base = positions.length / 3;

		for ( const ring of rings ) {

			for ( const [ x, z ] of ring ) {

				positions.push( x, y, z );
				normals.push( 0, 1, 0 );

			}

		}

		for ( let i = 1; i < rings.length; i ++ ) {

			const a = base + ( i - 1 ) * 2;
			const b = base + i * 2;
			indices.push( a, a + 1, b, b, a + 1, b + 1 );

		}

	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
	geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
	geometry.setIndex( indices );
	geometry.computeBoundingSphere();
	return geometry;

}

function shapeMesh( polygon, y, material ) {

	const shape = new THREE.Shape();
	polygon.forEach( ( [ x, z ], i ) => {

		if ( i === 0 ) shape.moveTo( x, - z );
		else shape.lineTo( x, - z );

	} );
	const geometry = new THREE.ShapeGeometry( shape );
	geometry.rotateX( - Math.PI / 2 );
	geometry.translate( 0, y, 0 );
	const mesh = new THREE.Mesh( geometry, material );
	mesh.receiveShadow = true;
	return mesh;

}

async function main() {

	const renderer = new THREE.WebGPURenderer( {
		canvas,
		antialias: true,
		powerPreference: 'high-performance',
		reversedDepthBuffer: true
	} );
	renderer.setPixelRatio( Math.min( 1.5, window.devicePixelRatio || 1 ) );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.shadowMap.enabled = true;
	await renderer.init();
	status.textContent = 'Cielo y luz…';

	const scene = new THREE.Scene();
	const lighting = new LightingSystem( scene, renderer );

	const camera = new THREE.PerspectiveCamera( 58, window.innerWidth / window.innerHeight, 0.12, 16000 );
	const aerial = new URLSearchParams( location.search ).has( 'aerial' );

	if ( aerial ) {

		camera.position.set( 600, 210, - 1950 );
		camera.lookAt( 1800, 0, 500 );

	} else {

		camera.position.set( 534, 2.15, - 229 );
		camera.lookAt( 674, 5.5, - 360 );

	}

	const yawPitch = new THREE.Euler().setFromQuaternion( camera.quaternion, 'YXZ' );
	let yaw = yawPitch.y;
	let pitch = yawPitch.x;

	status.textContent = 'Mar y suelo…';

	const ocean = new THREE.Mesh(
		new THREE.PlaneGeometry( 22000, 22000 ),
		new THREE.MeshStandardNodeMaterial( { color: 0x1c4652, roughness: 0.28, metalness: 0.12 } )
	);
	ocean.rotation.x = - Math.PI / 2;
	ocean.position.y = - 0.24;
	scene.add( ocean );

	const groundMat = new THREE.MeshStandardNodeMaterial( { color: 0x8e8371, roughness: 0.98 } );
	const sandMat = new THREE.MeshStandardNodeMaterial( { color: 0xbca77e, roughness: 1 } );

	for ( const rect of CITY.cityGround || [] ) {

		const mesh = new THREE.Mesh(
			new THREE.PlaneGeometry( rect.maxX - rect.minX, rect.maxZ - rect.minZ ),
			groundMat
		);
		mesh.rotation.x = - Math.PI / 2;
		mesh.position.set( ( rect.minX + rect.maxX ) / 2, - 0.06, ( rect.minZ + rect.maxZ ) / 2 );
		mesh.receiveShadow = true;
		scene.add( mesh );

	}

	const land = shapeMesh( CITY.land, 0, groundMat );
	scene.add( land );

	for ( const beach of CITY.beach ) {

		const mesh = shapeMesh( beach, 0.055, sandMat );
		scene.add( mesh );

	}

	status.textContent = `Asfalto y aceras (${CITY.stats.roads.toLocaleString( 'es-ES' )})…`;

	const roadMat = createRoadSurfaceMaterial();
	roadMat.side = THREE.DoubleSide;
	const sidewalkMat = createSidewalkMaterial();
	sidewalkMat.side = THREE.DoubleSide;

	const roadMesh = new THREE.Mesh(
		ribbonGeometry(
			CITY.roads,
			() => 0,
			road => road.w * 0.5,
			0.025,
			road => road.w >= 2.2
		),
		roadMat
	);
	roadMesh.receiveShadow = true;
	scene.add( roadMesh );

	for ( const side of [ - 1, 1 ] ) {

		const sidewalkMesh = new THREE.Mesh(
			ribbonGeometry(
				CITY.roads,
				road => side * ( road.w / 2 + 2.1 ),
				() => 2.1,
				0.012,
				road => road.w >= 5 && ! [ 'footway', 'steps', 'cycleway' ].includes( road.k )
			),
			sidewalkMat
		);
		sidewalkMesh.receiveShadow = true;
		scene.add( sidewalkMesh );

	}

	status.textContent = `Edificios (${CITY.stats.buildings.toLocaleString( 'es-ES' )})…`;

	const facades = [
		createPreWarBuildingMaterial( {
			footprintLocal: true, stoneColor: 0xe1d4bc, trimColor: 0xb2a189,
			windowGlassColor: 0x1c2a33, windowWidth: 2.5, floorHeight: 3.4,
			litProbability: 0.22, warmth: 0.76, seed: 3.1
		} ),
		createPreWarBuildingMaterial( {
			footprintLocal: true, stoneColor: 0xc77d61, trimColor: 0xe5d4b8,
			windowGlassColor: 0x19242b, windowWidth: 2.35, floorHeight: 3.3,
			litProbability: 0.28, warmth: 0.9, seed: 19.4
		} ),
		createPreWarBuildingMaterial( {
			footprintLocal: true, stoneColor: 0xd9c59f, trimColor: 0x9f8967,
			windowGlassColor: 0x1b2a34, windowWidth: 2.65, floorHeight: 3.55,
			litProbability: 0.2, warmth: 0.7, seed: 41.8
		} ),
		createPreWarBuildingMaterial( {
			footprintLocal: true, stoneColor: 0xf0e6d3, trimColor: 0xb8ab94,
			windowGlassColor: 0x22313b, windowWidth: 2.4, floorHeight: 3.25,
			litProbability: 0.26, warmth: 0.82, seed: 58.2
		} ),
		createCurtainWallMaterial( {
			footprintLocal: true, glassTint: 0x2b4b51, frameTint: 0x88938f,
			windowWidth: 2.8, floorHeight: 3.8, litProbability: 0.25,
			reflectivity: 0.7, seed: 74.6
		} )
	];

	const groups = facades.map( () => [] );

	for ( const b of CITY.buildings ) {

		groups[ b.s % facades.length ].push( {
			height: b.h,
			seed: b.seed,
			tone: b.tone,
			storefronts: !! b.sf,
			cx: b.cx,
			cz: b.cz,
			x0: b.x0,
			x1: b.x1,
			z0: b.z0,
			z1: b.z1,
			polygons: [ {
				outer: b.p.map( ( [ x, z ] ) => ( { x, z } ) ),
				holes: []
			} ]
		} );

	}

	for ( let i = 0; i < facades.length; i ++ ) {

		if ( ! groups[ i ].length ) continue;
		const group = createBuildingFootprints( facades[ i ], groups[ i ] );
		scene.add( group );

	}

	status.textContent = 'Farolas, árboles, coches y gente…';
	const life = buildCityLife( CITY.roads );
	scene.add( life.group );

	const scenePass = pass( scene, camera );
	const sceneColor = scenePass.getTextureNode( 'output' );
	const colorGrade = createPostProcessing( renderer, sceneColor, vec4( 0, 0, 0, 1 ) );
	const pipeline = new THREE.RenderPipeline( renderer, colorGrade.outputNode );

	status.textContent = 'Compilando shaders…';
	let frames = 0;
	let lastFrame = performance.now();
	const keys = new Set();

	window.addEventListener( 'keydown', e => keys.add( e.code ) );
	window.addEventListener( 'keyup', e => keys.delete( e.code ) );
	canvas.addEventListener( 'click', () => canvas.requestPointerLock() );
	document.addEventListener( 'mousemove', e => {

		if ( document.pointerLockElement !== canvas ) return;
		yaw -= e.movementX * 0.0022;
		pitch = Math.max( - 1.3, Math.min( 1.3, pitch - e.movementY * 0.0022 ) );

	} );
	let dragging = false;
	canvas.addEventListener( 'pointerdown', e => {

		if ( e.pointerType === 'mouse' && document.pointerLockElement !== canvas ) dragging = true;

	} );
	window.addEventListener( 'pointerup', () => dragging = false );
	window.addEventListener( 'pointermove', e => {

		if ( ! dragging ) return;
		yaw -= e.movementX * 0.003;
		pitch = Math.max( - 1.3, Math.min( 1.3, pitch - e.movementY * 0.003 ) );

	} );

	function loop() {

		const now = performance.now();
		const dt = Math.min( 0.05, ( now - lastFrame ) / 1000 );
		lastFrame = now;
		const speed = ( keys.has( 'ShiftLeft' ) ? 42 : 12 ) * dt;
		const forward = new THREE.Vector3( - Math.sin( yaw ), 0, - Math.cos( yaw ) );
		const right = new THREE.Vector3( Math.cos( yaw ), 0, - Math.sin( yaw ) );

		if ( keys.has( 'KeyW' ) ) camera.position.addScaledVector( forward, speed );
		if ( keys.has( 'KeyS' ) ) camera.position.addScaledVector( forward, - speed );
		if ( keys.has( 'KeyD' ) ) camera.position.addScaledVector( right, speed );
		if ( keys.has( 'KeyA' ) ) camera.position.addScaledVector( right, - speed );
		if ( keys.has( 'KeyQ' ) ) camera.position.y += speed;
		if ( keys.has( 'KeyE' ) ) camera.position.y -= speed;
		camera.position.y = Math.max( 1.4, camera.position.y );
		camera.rotation.set( pitch, yaw, 0, 'YXZ' );

		lighting.update( camera.position );
		pipeline.render();
		frames ++;
		if ( frames === 3 ) loading.classList.add( 'hidden' );
		requestAnimationFrame( loop );

	}

	requestAnimationFrame( loop );

	window.addEventListener( 'resize', () => {

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize( window.innerWidth, window.innerHeight );

	} );

	console.log( 'street life', JSON.stringify( life.counts ) );
	window.__CIUDAD__ = { scene, camera, renderer, CITY, lighting, life };

}

main().catch( fail );



