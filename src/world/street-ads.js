import * as THREE from 'three';

const FRAME = 0x30383b;
const METAL = 0x6f7778;

function longestRoad( data, name ) {

	let best = null;
	let bestLength = 0;

	for ( const road of data.roads ) {

		if ( road.n !== name ) continue;
		let length = 0;

		for ( let i = 1; i < road.p.length; i ++ ) {

			length += Math.hypot( road.p[ i ][ 0 ] - road.p[ i - 1 ][ 0 ], road.p[ i ][ 1 ] - road.p[ i - 1 ][ 1 ] );

		}

		if ( length > bestLength ) {

			best = road;
			bestLength = length;

		}

	}

	return best;

}

function pointOnRoad( road, t ) {

	const points = road.p;
	const lengths = [];
	let total = 0;

	for ( let i = 1; i < points.length; i ++ ) {

		const d = Math.hypot( points[ i ][ 0 ] - points[ i - 1 ][ 0 ], points[ i ][ 1 ] - points[ i - 1 ][ 1 ] );
		lengths.push( d );
		total += d;

	}

	let target = total * t;

	for ( let i = 1; i < points.length; i ++ ) {

		if ( target > lengths[ i - 1 ] ) {

			target -= lengths[ i - 1 ];
			continue;

		}

		const a = points[ i - 1 ];
		const b = points[ i ];
		const k = lengths[ i - 1 ] ? target / lengths[ i - 1 ] : 0;
		return {
			x: a[ 0 ] + ( b[ 0 ] - a[ 0 ] ) * k,
			z: a[ 1 ] + ( b[ 1 ] - a[ 1 ] ) * k,
			tx: ( b[ 0 ] - a[ 0 ] ) / ( lengths[ i - 1 ] || 1 ),
			tz: ( b[ 1 ] - a[ 1 ] ) / ( lengths[ i - 1 ] || 1 )
		};

	}

	const a = points[ points.length - 2 ];
	const b = points[ points.length - 1 ];
	return { x: b[ 0 ], z: b[ 1 ], tx: b[ 0 ] - a[ 0 ], tz: b[ 1 ] - a[ 1 ] };

}

function makeSignTexture( line ) {

	const canvas = document.createElement( 'canvas' );
	canvas.width = 512;
	canvas.height = 180;
	const ctx = canvas.getContext( '2d' );
	ctx.fillStyle = '#0c4a72';
	ctx.fillRect( 0, 0, 512, 180 );
	ctx.strokeStyle = '#e9b23d';
	ctx.lineWidth = 12;
	ctx.strokeRect( 6, 6, 500, 168 );
	ctx.fillStyle = '#f7f1e3';
	ctx.font = '700 62px Arial';
	ctx.textBaseline = 'middle';
	ctx.fillText( 'GUAGUA', 32, 72 );
	ctx.fillStyle = '#e9b23d';
	ctx.font = '800 64px Arial';
	ctx.fillText( line, 370, 72 );
	ctx.fillStyle = '#f7f1e3';
	ctx.font = '600 26px Arial';
	ctx.fillText( 'LAS PALMAS · GC', 34, 145 );
	const texture = new THREE.CanvasTexture( canvas );
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.anisotropy = 4;
	return texture;

}

function adMaterial( texture, intensity = 0.14 ) {

	return new THREE.MeshStandardMaterial( {
		map: texture,
		emissive: 0xffffff,
		emissiveMap: texture,
		emissiveIntensity: intensity,
		roughness: 0.55,
		metalness: 0.05,
		side: THREE.FrontSide
	} );

}

function buildShelter( { x, z, angle, ad, line, textures, castShadows } ) {

	const group = new THREE.Group();
	group.position.set( x, 0.06, z );
	group.rotation.y = angle;
	group.name = 'parada-guagua';

	const frameMat = new THREE.MeshStandardMaterial( { color: FRAME, roughness: 0.45, metalness: 0.75 } );
	const metalMat = new THREE.MeshStandardMaterial( { color: METAL, roughness: 0.3, metalness: 0.9 } );
	const glassMat = new THREE.MeshStandardMaterial( {
		color: 0xb9d8df,
		transparent: true,
		opacity: 0.3,
		roughness: 0.05,
		metalness: 0.1,
		side: THREE.DoubleSide
	} );

	const postGeo = new THREE.CylinderGeometry( 0.055, 0.07, 2.7, 8 );
	for ( const px of [ - 1.6, 1.6 ] ) {

		for ( const pz of [ - 0.55, 0.55 ] ) {

			const post = new THREE.Mesh( postGeo, metalMat );
			post.position.set( px, 1.35, pz );
			post.castShadow = castShadows;
			group.add( post );

		}

	}

	const roof = new THREE.Mesh( new THREE.BoxGeometry( 3.5, 0.08, 1.35 ), frameMat );
	roof.position.set( 0, 2.72, 0 );
	roof.castShadow = castShadows;
	group.add( roof );

	const glass = new THREE.Mesh( new THREE.BoxGeometry( 3.15, 0.02, 1.05 ), glassMat );
	glass.position.set( 0, 2.67, 0 );
	group.add( glass );

	// panel de publicidad
	const panel = new THREE.Group();
	panel.position.set( - 0.1, 1.32, 0.58 );

	const back = new THREE.Mesh( new THREE.BoxGeometry( 1.38, 2.02, 0.16 ), frameMat );
	back.castShadow = castShadows;
	panel.add( back );

	const planeGeo = new THREE.PlaneGeometry( 1.24, 1.8 );
	const faceMat = adMaterial( textures[ ad ], 0.08 );
	const front = new THREE.Mesh( planeGeo, faceMat );
	front.position.z = 0.09;
	panel.add( front );

	const rear = new THREE.Mesh( planeGeo, faceMat );
	rear.rotation.y = Math.PI;
	rear.position.z = - 0.09;
	panel.add( rear );

	group.add( panel );

	// banco
	const benchMat = new THREE.MeshStandardMaterial( { color: 0x5b4a3a, roughness: 0.8 } );
	const seat = new THREE.Mesh( new THREE.BoxGeometry( 2.35, 0.09, 0.48 ), benchMat );
	seat.position.set( 0.15, 0.48, - 0.05 );
	seat.castShadow = castShadows;
	group.add( seat );
	const backrest = new THREE.Mesh( new THREE.BoxGeometry( 2.35, 0.55, 0.08 ), benchMat );
	backrest.position.set( 0.15, 0.78, - 0.3 );
	backrest.rotation.x = - 0.08;
	backrest.castShadow = castShadows;
	group.add( backrest );

	// señal de guagua
	const pole = new THREE.Mesh( new THREE.CylinderGeometry( 0.04, 0.04, 3.1, 7 ), metalMat );
	pole.position.set( 1.78, 1.55, 0.6 );
	group.add( pole );
	const signTex = makeSignTexture( line );
	const signMat = new THREE.MeshStandardMaterial( {
		map: signTex,
		emissive: 0xffffff,
		emissiveMap: signTex,
		emissiveIntensity: 0.12,
		roughness: 0.6,
		side: THREE.FrontSide
	} );
	const signGeo = new THREE.PlaneGeometry( 0.95, 0.34 );
	const signFront = new THREE.Mesh( signGeo, signMat );
	signFront.position.set( 1.78, 2.95, 0.66 );
	group.add( signFront );
	const signBack = new THREE.Mesh( signGeo, signMat );
	signBack.position.set( 1.78, 2.95, 0.62 );
	signBack.rotation.y = Math.PI;
	group.add( signBack );

	return group;

}

export function createBusStops( { data, textures, coastField, castShadows = true } ) {

	const group = new THREE.Group();
	group.name = 'paradas-guagua';
	const anchors = [
		{ road: 'Calle Fernando Guanarteme', t: 0.18, ad: 'mupi_hbtdata_dark', line: '91' },
		{ road: 'Calle Fernando Guanarteme', t: 0.72, ad: 'mupi_abretu_dark', line: '91' },
		{ road: 'Avenida José Mesa y López', t: 0.28, ad: 'ad_gofio', line: '17' },
		{ road: 'Avenida José Mesa y López', t: 0.72, ad: 'mupi_hbtdata_dark', line: '17' },
		{ road: 'Calle Juan Rejón', t: 0.30, ad: 'mupi_abretu_dark', line: '12' },
		{ road: 'Calle Juan Rejón', t: 0.76, ad: 'ad_guagua', line: '12' },
		{ road: 'Calle León y Castillo', t: 0.52, ad: 'mupi_hbtdata_dark', line: '26' },
		{ road: 'Calle Mayor de Triana', t: 0.46, ad: 'mupi_abretu_dark', line: '26' }
	];

	for ( const anchor of anchors ) {

		const road = longestRoad( data, anchor.road );
		if ( ! road ) continue;
		const p = pointOnRoad( road, anchor.t );
		const len = Math.hypot( p.tx, p.tz ) || 1;
		const tx = p.tx / len;
		const tz = p.tz / len;
		const nx = tz;
		const nz = - tx;
		const offset = road.w / 2 + 1.7;

		const qA = coastField.query( p.x + nx * offset, p.z + nz * offset );
		const qB = coastField.query( p.x - nx * offset, p.z - nz * offset );
		const side = qA.signed >= qB.signed ? 1 : - 1;

		const x = p.x + nx * offset * side;
		const z = p.z + nz * offset * side;
		const angle = Math.atan2( - tz, tx );
		const shelter = buildShelter( {
			x, z, angle,
			ad: anchor.ad,
			line: anchor.line,
			textures,
			castShadows
		} );
		group.add( shelter );

	}

	return group;

}

export function createFacadeAds( { textures, pointAlong, promenade, coastField } ) {

	const group = new THREE.Group();
	group.name = 'fachadas-publicidad';
	const anchors = [
		{ t: 0.12, offset: 46, ad: 'hbtdata', w: 10, h: 4.6 },
		{ t: 0.28, offset: 38, ad: 'ad_gofio', w: 8.5, h: 4.2 },
		{ t: 0.46, offset: 44, ad: 'abretusobre', w: 10, h: 4.6 },
		{ t: 0.64, offset: 36, ad: 'ad_guagua', w: 8.5, h: 4.2 },
		{ t: 0.80, offset: 48, ad: 'hbtdata', w: 9.5, h: 4.4 },
		{ t: 0.94, offset: 40, ad: 'ad_mojo', w: 8, h: 4 }
	];

	const frameMat = new THREE.MeshStandardMaterial( { color: 0x2b2d2e, roughness: 0.55, metalness: 0.6 } );

	for ( const anchor of anchors ) {

		const p = pointAlong( promenade, anchor.t );
		const q = coastField.query( p.x, p.z );
		const x = p.x + q.nx * anchor.offset;
		const z = p.z + q.nz * anchor.offset;
		const yaw = Math.atan2( - q.nx, - q.nz );

		const panel = new THREE.Group();
		panel.position.set( x, 9.4, z );
		panel.rotation.y = yaw;

		const back = new THREE.Mesh( new THREE.BoxGeometry( anchor.w + 0.5, anchor.h + 0.5, 0.22 ), frameMat );
		back.castShadow = false;
		panel.add( back );

		const plane = new THREE.Mesh(
			new THREE.PlaneGeometry( anchor.w, anchor.h ),
			adMaterial( textures[ anchor.ad ], 0.08 )
		);
		plane.position.z = 0.12;
		panel.add( plane );

		for ( const bx of [ - anchor.w / 2, anchor.w / 2 ] ) {

			const bar = new THREE.Mesh( new THREE.BoxGeometry( 0.12, 0.12, 0.7 ), frameMat );
			bar.position.set( bx, - anchor.h / 2 - 0.25, 0 );
			panel.add( bar );

		}

		group.add( panel );

	}

	return group;

}

export function createPromenadeMupis( { textures, pointAlong, promenade, coastField } ) {

	const group = new THREE.Group();
	group.name = 'mupis-paseo';
	const anchors = [
		{ t: 0.145, ad: 'mupi_hbtdata_dark', offset: 7.5 },
		{ t: 0.205, ad: 'mupi_hbtdata_dark', offset: - 6 },
		{ t: 0.225, ad: 'mupi_abretu_dark', offset: - 6 },
		{ t: 0.55, ad: 'mupi_hbtdata_dark', offset: 7.5 },
		{ t: 0.79, ad: 'mupi_abretu_dark', offset: 7.5 }
	];
	const frameMat = new THREE.MeshStandardMaterial( { color: 0x2b3235, roughness: 0.45, metalness: 0.7 } );
	const planeGeo = new THREE.PlaneGeometry( 1.16, 1.92 );

	for ( const anchor of anchors ) {

		const p = pointAlong( promenade, anchor.t );
		const q = coastField.query( p.x, p.z );
		const x = p.x + q.nx * anchor.offset;
		const z = p.z + q.nz * anchor.offset;
		const yaw = Math.atan2( - q.nx, - q.nz );
		const totem = new THREE.Group();
		totem.position.set( x, 0.05, z );
		totem.rotation.y = yaw;

		const base = new THREE.Mesh( new THREE.BoxGeometry( 0.55, 0.12, 0.35 ), frameMat );
		base.position.y = 0.06;
		totem.add( base );

		const frame = new THREE.Mesh( new THREE.BoxGeometry( 1.32, 2.08, 0.16 ), frameMat );
		frame.position.y = 1.18;
		totem.add( frame );

		const faceMat = adMaterial( textures[ anchor.ad ], 0.16 );
		const front = new THREE.Mesh( planeGeo, faceMat );
		front.position.set( 0, 1.18, 0.09 );
		totem.add( front );
		const rear = new THREE.Mesh( planeGeo, faceMat );
		rear.position.set( 0, 1.18, - 0.09 );
		rear.rotation.y = Math.PI;
		totem.add( rear );

		group.add( totem );

	}

	return group;

}

export function createLocalBoards( { textures, pointAlong, promenade, coastField } ) {

	const group = new THREE.Group();
	group.name = 'vallas-locales';
	const anchors = [
		{ t: 0.245, ad: 'ad_gofio' },
		{ t: 0.375, ad: 'ad_guagua' },
		{ t: 0.525, ad: 'ad_mojo' },
		{ t: 0.685, ad: 'ad_platano' },
		{ t: 0.845, ad: 'ad_calima' }
	];
	const frameMat = new THREE.MeshStandardMaterial( { color: 0x293033, roughness: 0.5, metalness: 0.65 } );
	const postMat = new THREE.MeshStandardMaterial( { color: 0x7d8385, roughness: 0.3, metalness: 0.85 } );
	const postGeo = new THREE.CylinderGeometry( 0.06, 0.075, 2.2, 8 );
	const panelGeo = new THREE.PlaneGeometry( 2.35, 1.18 );

	for ( const anchor of anchors ) {

		const p = pointAlong( promenade, anchor.t );
		const q = coastField.query( p.x, p.z );
		const x = p.x + q.nx * 5.4;
		const z = p.z + q.nz * 5.4;
		const yaw = Math.atan2( - q.nx, - q.nz );
		const board = new THREE.Group();
		board.position.set( x, 0.04, z );
		board.rotation.y = yaw;

		for ( const bx of [ - 1.1, 1.1 ] ) {

			const post = new THREE.Mesh( postGeo, postMat );
			post.position.set( bx, 1.1, 0 );
			board.add( post );

		}

		const back = new THREE.Mesh( new THREE.BoxGeometry( 2.58, 1.4, 0.14 ), frameMat );
		back.position.y = 1.75;
		board.add( back );

		const face = new THREE.Mesh( panelGeo, adMaterial( textures[ anchor.ad ], 0.08 ) );
		face.position.set( 0, 1.75, 0.08 );
		board.add( face );
		const rear = new THREE.Mesh( panelGeo, face.material );
		rear.position.set( 0, 1.75, - 0.08 );
		rear.rotation.y = Math.PI;
		board.add( rear );

		group.add( board );

	}

	return group;

}
