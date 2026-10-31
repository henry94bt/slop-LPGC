import * as THREE from 'three/webgpu';
import { pass, vec4 } from 'three/tsl';
import { LightingSystem } from './lib/lighting.js';
import { createPostProcessing } from './lib/post-processing.js';
import {
	createPreWarBuildingMaterial,
	createCurtainWallMaterial,
	createRoadSurfaceMaterial,
	createSidewalkMaterial,
	createCurbMaterial,
	createFacadeBoxes
} from './lib/tsl-materials.js';

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
	status.textContent = 'Creando cielo y luz…';

	const scene = new THREE.Scene();
	const lighting = new LightingSystem( scene, renderer );

	const camera = new THREE.PerspectiveCamera( 54, window.innerWidth / window.innerHeight, 0.08, 1400 );
	camera.position.set( 0, 1.68, 48 );
	camera.lookAt( 0, 8, - 48 );

	status.textContent = 'Levantando calle y fachadas…';

	const road = new THREE.Mesh(
		new THREE.PlaneGeometry( 16, 240 ),
		createRoadSurfaceMaterial()
	);
	road.rotation.x = - Math.PI / 2;
	road.receiveShadow = true;
	scene.add( road );

	const sidewalkMat = createSidewalkMaterial();
	const curbMat = createCurbMaterial();

	for ( const side of [ - 1, 1 ] ) {

		const sidewalk = new THREE.Mesh( new THREE.PlaneGeometry( 5.4, 240 ), sidewalkMat );
		sidewalk.rotation.x = - Math.PI / 2;
		sidewalk.position.set( side * 10.7, 0.155, 0 );
		sidewalk.receiveShadow = true;
		scene.add( sidewalk );

		const curb = new THREE.Mesh( new THREE.BoxGeometry( 0.28, 0.16, 240 ), curbMat );
		curb.position.set( side * 8.14, 0.08, 0 );
		curb.receiveShadow = true;
		curb.castShadow = true;
		scene.add( curb );

	}

	// ---------- paletas de fachada ----------

	const facadeMaterials = [
		createPreWarBuildingMaterial( {
			boxLocal: true,
			stoneColor: 0xe2d5be,
			trimColor: 0xb5a68e,
			windowGlassColor: 0x1d2a33,
			windowWidth: 2.5,
			floorHeight: 3.4,
			litProbability: 0.28,
			warmth: 0.75,
			seed: 4.2
		} ),
		createPreWarBuildingMaterial( {
			boxLocal: true,
			stoneColor: 0xc47a5e,
			trimColor: 0xe3d3b7,
			windowGlassColor: 0x1a252d,
			windowWidth: 2.35,
			floorHeight: 3.3,
			litProbability: 0.34,
			warmth: 0.9,
			seed: 18.7
		} ),
		createPreWarBuildingMaterial( {
			boxLocal: true,
			stoneColor: 0xd8c49d,
			trimColor: 0x9b8665,
			windowGlassColor: 0x1b2a34,
			windowWidth: 2.7,
			floorHeight: 3.55,
			litProbability: 0.26,
			warmth: 0.68,
			seed: 39.1
		} ),
		createPreWarBuildingMaterial( {
			boxLocal: true,
			stoneColor: 0xf0e7d6,
			trimColor: 0xb6aa93,
			windowGlassColor: 0x22313b,
			windowWidth: 2.4,
			floorHeight: 3.25,
			litProbability: 0.32,
			warmth: 0.8,
			seed: 55.4
		} ),
		createCurtainWallMaterial( {
			boxLocal: true,
			glassTint: 0x2c4a50,
			frameTint: 0x87928e,
			windowWidth: 2.8,
			floorHeight: 3.8,
			litProbability: 0.3,
			reflectivity: 0.7,
			seed: 71.6
		} )
	];

	const awningColors = [ 0x8c2f2c, 0x285a42, 0x2d4f73, 0xc58a37, 0x702f4a ];
	const wallMat = new THREE.MeshStandardNodeMaterial( { color: 0x8f8578, roughness: 0.9 } );

	const buildingSpecs = [
		// lado izquierdo: z, ancho, alto, retranqueo, paleta
		[ - 48, 15, 18.5, 0.4, 0 ],
		[ - 30, 12, 24.0, 0, 1 ],
		[ - 14, 14, 20.5, 0.7, 3 ],
		[ 3, 13, 26.0, 0, 2 ],
		[ 20, 16, 17.0, 0.3, 1 ],
		[ 39, 12, 21.0, 0, 0 ],
		// lado derecho
		[ - 52, 16, 21.0, 0.6, 2 ],
		[ - 32, 14, 17.5, 0, 3 ],
		[ - 15, 13, 27.0, 0.2, 0 ],
		[ 2, 15, 22.0, 0, 1 ],
		[ 21, 12, 18.0, 0.5, 4 ],
		[ 39, 14, 23.0, 0, 0 ]
	];

	const boxesByPalette = facadeMaterials.map( () => [] );
	const buildingRecords = [];
	let buildingIndex = 0;

	for ( const side of [ - 1, 1 ] ) {

		for ( const [ z, width, height, setback, palette ] of buildingSpecs.filter( ( _, i ) => ( i < 6 ) === ( side < 0 ) ) ) {

			const depth = 18;
			const frontX = side * ( 13.5 + setback );
			const centerX = frontX + side * depth / 2;
			boxesByPalette[ palette ].push( {
				x: centerX,
				y: height / 2 + 0.15,
				z,
				w: depth,
				h: height,
				d: width
			} );
			buildingRecords.push( { side, z, width, height, depth, frontX, centerX, palette } );

		}

	}

	for ( let p = 0; p < facadeMaterials.length; p ++ ) {

		if ( ! boxesByPalette[ p ].length ) continue;
		const mesh = createFacadeBoxes( facadeMaterials[ p ], boxesByPalette[ p ] );
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		scene.add( mesh );

	}

	for ( const { side, z, width, height, depth, frontX, centerX } of buildingRecords ) {

		// cornisa
		const cornice = new THREE.Mesh( new THREE.BoxGeometry( depth + 0.5, 0.38, width + 0.5 ), new THREE.MeshStandardNodeMaterial( {
			color: 0xd8cbb4,
			roughness: 0.8
		} ) );
		cornice.position.set( centerX, height + 0.28, z );
		cornice.castShadow = true;
		scene.add( cornice );

		// azotea: caseta, depósito y antena
		const roofY = height + 0.5;
		const hut = new THREE.Mesh( new THREE.BoxGeometry( 3.6, 2.4, 4.2 ), wallMat );
		hut.position.set( centerX + ( side * 1.8 ), roofY + 1.2, z - width * 0.16 );
		hut.castShadow = true;
		scene.add( hut );

		const tank = new THREE.Mesh( new THREE.CylinderGeometry( 1.1, 1.15, 1.8, 10 ), new THREE.MeshStandardNodeMaterial( {
			color: 0x8b6b4a,
			roughness: 0.85
		} ) );
		tank.position.set( centerX - side * 2.0, roofY + 1.0, z + width * 0.18 );
		tank.castShadow = true;
		scene.add( tank );

		// toldos y rótulos de bajos
		const shops = Math.max( 1, Math.floor( width / 5 ) );

		for ( let s = 0; s < shops; s ++ ) {

			const shopZ = z - width / 2 + ( s + 0.5 ) * ( width / shops );
			const fabric = new THREE.MeshStandardNodeMaterial( {
				color: awningColors[ ( buildingIndex + s ) % awningColors.length ],
				roughness: 0.88,
				side: THREE.DoubleSide
			} );
			const awning = new THREE.Mesh( new THREE.BoxGeometry( 1.9, 0.06, 3.25 ), fabric );
			awning.position.set( frontX - side * 0.82, 3.42, shopZ );
			awning.rotation.z = side * 0.19;
			awning.castShadow = true;
			scene.add( awning );

			const valance = new THREE.Mesh( new THREE.BoxGeometry( 0.06, 0.34, 3.25 ), fabric );
			valance.position.set( frontX - side * 1.72, 3.10, shopZ );
			valance.castShadow = true;
			scene.add( valance );

			const sign = makeSign( shopLabels[ ( buildingIndex + s ) % shopLabels.length ] );
			sign.position.set( frontX - side * 0.08, 4.18, shopZ );
			sign.rotation.y = side < 0 ? Math.PI / 2 : - Math.PI / 2;
			scene.add( sign );

			const shopWindow = makeShopWindow( ( buildingIndex + s ) % 4 );
			shopWindow.position.set( frontX - side * 0.05, 1.55, shopZ );
			shopWindow.rotation.y = side < 0 ? Math.PI / 2 : - Math.PI / 2;
			scene.add( shopWindow );

		}

		buildingIndex ++;

	}

	// ---------- bocacalle y fondo ----------

	const crossRoad = new THREE.Mesh( new THREE.PlaneGeometry( 78, 15 ), createRoadSurfaceMaterial() );
	crossRoad.rotation.x = - Math.PI / 2;
	crossRoad.position.set( 0, 0.004, - 102 );
	crossRoad.receiveShadow = true;
	scene.add( crossRoad );

	const farBoxes = [
		{ x: - 29, y: 9.5, z: - 126, w: 26, h: 19, d: 14 },
		{ x: 0, y: 12.5, z: - 128, w: 25, h: 25, d: 16 },
		{ x: 29, y: 10.5, z: - 126, w: 26, h: 21, d: 14 }
	];
	const farMat = createPreWarBuildingMaterial( {
		boxLocal: true,
		stoneColor: 0xd6b98f,
		trimColor: 0xa88b65,
		windowGlassColor: 0x1c2830,
		windowWidth: 2.5,
		floorHeight: 3.4,
		litProbability: 0.34,
		warmth: 0.82,
		seed: 88.2
	} );
	const farBuildings = createFacadeBoxes( farMat, farBoxes );
	farBuildings.castShadow = true;
	farBuildings.receiveShadow = true;
	scene.add( farBuildings );

	// ---------- acera: farolas, árboles, coches, gente ----------

	const poleMat = new THREE.MeshStandardNodeMaterial( { color: 0x20282b, roughness: 0.42, metalness: 0.75 } );
	const globeMat = new THREE.MeshStandardNodeMaterial( {
		color: 0xfff1d4,
		emissive: 0xffe0b0,
		emissiveIntensity: 2.4,
		roughness: 0.35
	} );

	for ( const side of [ - 1, 1 ] ) {

		for ( let z = - 52; z <= 44; z += 24 ) {

			const lamp = new THREE.Group();
			lamp.position.set( side * 12.3, 0.15, z );

			const pole = new THREE.Mesh( new THREE.CylinderGeometry( 0.075, 0.1, 5.8, 8 ), poleMat );
			pole.position.y = 2.9;
			pole.castShadow = true;
			lamp.add( pole );

			const arm = new THREE.Mesh( new THREE.BoxGeometry( 1.5, 0.08, 0.08 ), poleMat );
			arm.position.set( - side * 0.7, 5.7, 0 );
			lamp.add( arm );

			const globe = new THREE.Mesh( new THREE.SphereGeometry( 0.22, 10, 8 ), globeMat );
			globe.position.set( - side * 1.4, 5.62, 0 );
			lamp.add( globe );

			scene.add( lamp );

		}

	}

	// árboles de calle
	for ( const [ x, z, s ] of [ [ - 11.5, - 40, 1.0 ], [ 11.5, - 22, 0.9 ], [ - 11.5, 8, 1.05 ], [ 11.5, 28, 0.95 ] ] ) {

		const tree = makeTree( s );
		tree.position.set( x, 0.15, z );
		scene.add( tree );

	}

	// coches aparcados
	for ( const [ x, z, rot ] of [ [ - 6.7, - 20, 0 ], [ 6.7, 12, Math.PI ], [ - 6.7, 30, 0 ] ] ) {

		const car = makeCar();
		car.position.set( x, 0.02, z );
		car.rotation.y = rot;
		scene.add( car );

	}

	// gente
	for ( const [ x, z, c ] of [ [ - 10.2, - 8, 0x9a3d34 ], [ 10.4, - 2, 0x2d4f68 ], [ - 9.7, 24, 0x3e6748 ], [ 10.2, 34, 0xc69a4a ] ] ) {

		const person = makePerson( c );
		person.position.set( x, 0.15, z );
		person.rotation.y = Math.random() * Math.PI * 2;
		scene.add( person );

	}

	// marcas viales
	const paintMat = new THREE.MeshStandardNodeMaterial( { color: 0xe8dfca, roughness: 0.9 } );
	for ( let z = - 92; z <= 92; z += 9 ) {

		const dash = new THREE.Mesh( new THREE.BoxGeometry( 0.12, 0.012, 3.2 ), paintMat );
		dash.position.set( 0, 0.018, z );
		scene.add( dash );

	}

	for ( let i = 0; i < 8; i ++ ) {

		const stripe = new THREE.Mesh( new THREE.BoxGeometry( 12, 0.012, 0.42 ), paintMat );
		stripe.position.set( 0, 0.019, 24 + i * 0.85 );
		scene.add( stripe );

	}

	// ---------- postprocesado ----------

	const scenePass = pass( scene, camera );
	const sceneColor = scenePass.getTextureNode( 'output' );
	const colorGrade = createPostProcessing( renderer, sceneColor, vec4( 0, 0, 0, 1 ) );
	const pipeline = new THREE.RenderPipeline( renderer, colorGrade.outputNode );

	status.textContent = 'Compilando shaders…';

	let frames = 0;

	function loop( time ) {

		camera.position.y = 1.68 + Math.sin( time * 0.00035 ) * 0.012;
		lighting.update( camera.position );
		pipeline.render();
		frames ++;

		if ( frames === 2 ) loading.classList.add( 'hidden' );

		requestAnimationFrame( loop );

	}

	requestAnimationFrame( loop );

	window.addEventListener( 'resize', () => {

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize( window.innerWidth, window.innerHeight );

	} );

	window.__PROTOTIPO__ = { scene, camera, renderer, lighting };

}

const shopLabels = [ 'BODEGÓN', 'FARMACIA', 'PANADERÍA', 'GUAGUAS', 'GOFIO', 'HBTDATA', 'MOJO PICÓN', 'ABRETUSOBRE' ];

function makeShopWindow( variant ) {

	const c = document.createElement( 'canvas' );
	c.width = 512;
	c.height = 320;
	const ctx = c.getContext( '2d' );

	ctx.fillStyle = '#1b1511';
	ctx.fillRect( 0, 0, 512, 320 );

	const warm = ctx.createLinearGradient( 0, 0, 0, 320 );
	warm.addColorStop( 0, variant % 2 ? '#e7b66f' : '#d7a05b' );
	warm.addColorStop( 1, '#6b4129' );
	ctx.fillStyle = warm;
	ctx.fillRect( 18, 18, 476, 284 );

	// estanterías y botellas
	ctx.fillStyle = 'rgba(49, 31, 21, 0.85)';
	for ( const y of [ 105, 185 ] ) ctx.fillRect( 30, y, 452, 12 );
	for ( let i = 0; i < 11; i ++ ) {

		const x = 42 + i * 40;
		ctx.fillStyle = i % 3 === 0 ? '#3a2115' : i % 3 === 1 ? '#5d3420' : '#7f4a2d';
		ctx.fillRect( x, 64 + ( i % 2 ) * 12, 15, 41 );
		ctx.fillRect( x + 20, 124 + ( i % 3 ) * 8, 12, 55 );

	}

	// mostrador
	ctx.fillStyle = '#3a2419';
	ctx.fillRect( 24, 225, 464, 68 );
	ctx.fillStyle = '#8e5c38';
	ctx.fillRect( 24, 225, 464, 8 );

	// puerta lateral
	ctx.fillStyle = '#17110e';
	ctx.fillRect( 410, 40, 66, 252 );
	ctx.fillStyle = '#b9854d';
	ctx.fillRect( 420, 52, 46, 104 );
	ctx.fillStyle = '#e5c58e';
	ctx.fillRect( 456, 205, 5, 16 );

	// marco y montantes
	ctx.strokeStyle = '#211914';
	ctx.lineWidth = 14;
	ctx.strokeRect( 7, 7, 498, 306 );
	ctx.lineWidth = 7;
	ctx.beginPath();
	ctx.moveTo( 256, 8 );
	ctx.lineTo( 256, 312 );
	ctx.moveTo( 8, 168 );
	ctx.lineTo( 504, 168 );
	ctx.stroke();

	const texture = new THREE.CanvasTexture( c );
	texture.colorSpace = THREE.SRGBColorSpace;
	const material = new THREE.MeshStandardNodeMaterial( {
		map: texture,
		emissive: 0xffffff,
		emissiveMap: texture,
		emissiveIntensity: 0.42,
		roughness: 0.55
	} );
	return new THREE.Mesh( new THREE.PlaneGeometry( 3.05, 1.95 ), material );

}

function makeSign( label ) {

	const c = document.createElement( 'canvas' );
	c.width = 512;
	c.height = 128;
	const ctx = c.getContext( '2d' );
	ctx.fillStyle = '#1e2424';
	ctx.fillRect( 0, 0, 512, 128 );
	ctx.strokeStyle = '#c9a75d';
	ctx.lineWidth = 8;
	ctx.strokeRect( 6, 6, 500, 116 );
	ctx.fillStyle = '#f1e5cf';
	ctx.font = '800 52px Arial';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText( label, 256, 68 );
	const texture = new THREE.CanvasTexture( c );
	texture.colorSpace = THREE.SRGBColorSpace;
	const material = new THREE.MeshStandardNodeMaterial( {
		map: texture,
		emissive: 0xffffff,
		emissiveMap: texture,
		emissiveIntensity: 0.15,
		roughness: 0.7
	} );
	const mesh = new THREE.Mesh( new THREE.PlaneGeometry( 2.95, 0.72 ), material );
	mesh.position.z = 0.055;
	const group = new THREE.Group();
	const backing = new THREE.Mesh( new THREE.BoxGeometry( 3.1, 0.86, 0.1 ), new THREE.MeshStandardNodeMaterial( {
		color: 0x28302f,
		roughness: 0.6,
		metalness: 0.35
	} ) );
	group.add( backing, mesh );
	return group;

}

function makeTree( scale ) {

	const group = new THREE.Group();
	const trunk = new THREE.Mesh(
		new THREE.CylinderGeometry( 0.15 * scale, 0.22 * scale, 3.2 * scale, 7 ),
		new THREE.MeshStandardNodeMaterial( { color: 0x5a4430, roughness: 0.95 } )
	);
	trunk.position.y = 1.6 * scale;
	trunk.castShadow = true;
	group.add( trunk );

	const canopyMat = new THREE.MeshStandardNodeMaterial( { color: 0x3d6338, roughness: 0.9, flatShading: true } );
	const canopyMat2 = new THREE.MeshStandardNodeMaterial( { color: 0x527844, roughness: 0.9, flatShading: true } );
	for ( const [ x, y, z, r, alt ] of [
		[ 0, 3.5, 0, 1.05, 0 ],
		[ 0.85, 3.9, 0.35, 0.82, 1 ],
		[ - 0.8, 4.0, - 0.15, 0.78, 0 ],
		[ 0.15, 4.35, - 0.45, 0.7, 1 ],
		[ - 0.35, 3.15, 0.65, 0.62, 1 ]
	] ) {

		const canopy = new THREE.Mesh( new THREE.IcosahedronGeometry( r * scale, 1 ), alt ? canopyMat2 : canopyMat );
		canopy.position.set( x * scale, y * scale, z * scale );
		canopy.castShadow = true;
		group.add( canopy );

	}

	return group;

}

function makeCar() {

	const group = new THREE.Group();
	const yellow = new THREE.MeshStandardNodeMaterial( { color: 0xe8b62e, roughness: 0.32, metalness: 0.45 } );
	const glass = new THREE.MeshStandardNodeMaterial( { color: 0x1c2b31, roughness: 0.18, metalness: 0.4 } );
	const dark = new THREE.MeshStandardNodeMaterial( { color: 0x17191a, roughness: 0.95 } );

	const body = new THREE.Mesh( new THREE.BoxGeometry( 1.85, 0.55, 4.3 ), yellow );
	body.position.y = 0.62;
	body.castShadow = true;
	group.add( body );

	const cabin = new THREE.Mesh( new THREE.BoxGeometry( 1.62, 0.58, 2.05 ), glass );
	cabin.position.set( 0, 1.15, - 0.12 );
	cabin.castShadow = true;
	group.add( cabin );

	for ( const x of [ - 0.92, 0.92 ] ) {

		for ( const z of [ - 1.35, 1.35 ] ) {

			const wheel = new THREE.Mesh( new THREE.CylinderGeometry( 0.33, 0.33, 0.2, 12 ), dark );
			wheel.rotation.z = Math.PI / 2;
			wheel.position.set( x, 0.35, z );
			group.add( wheel );

		}

	}

	const top = new THREE.Mesh( new THREE.BoxGeometry( 0.85, 0.22, 0.38 ), new THREE.MeshStandardNodeMaterial( {
		color: 0xf6e9c9,
		emissive: 0xffe4a8,
		emissiveIntensity: 0.6
	} ) );
	top.position.set( 0, 1.55, - 0.2 );
	group.add( top );

	return group;

}

function makePerson( color ) {

	const group = new THREE.Group();
	const body = new THREE.Mesh(
		new THREE.CylinderGeometry( 0.19, 0.23, 0.75, 7 ),
		new THREE.MeshStandardNodeMaterial( { color, roughness: 0.9 } )
	);
	body.position.y = 1.1;
	body.castShadow = true;
	group.add( body );
	const head = new THREE.Mesh(
		new THREE.SphereGeometry( 0.15, 8, 6 ),
		new THREE.MeshStandardNodeMaterial( { color: 0xc7966d, roughness: 0.9 } )
	);
	head.position.y = 1.63;
	head.castShadow = true;
	group.add( head );
	const legs = new THREE.Mesh(
		new THREE.BoxGeometry( 0.25, 0.74, 0.2 ),
		new THREE.MeshStandardNodeMaterial( { color: 0x2d3238, roughness: 0.95 } )
	);
	legs.position.y = 0.38;
	legs.castShadow = true;
	group.add( legs );
	return group;

}

main().catch( fail );
