import * as THREE from 'three';

const SHOPS = {
	'Calle Mayor de Triana': [
		[ 'FARMACIA', '#1f6b45', '#f5f1e4' ],
		[ 'PANADERÍA', '#b97832', '#fff6df' ],
		[ 'BODEGÓN', '#6b2433', '#f5e7c9' ],
		[ 'PELUQUERÍA', '#b1446b', '#fff3f7' ],
		[ 'MOJO PICÓN', '#a52f25', '#ffe6b8' ],
		[ 'ABRETUSOBRE', '#3b2a4d', '#e7d8ff' ]
	],
	'Calle Fernando Guanarteme': [
		[ 'GUAGUAS', '#0d4b78', '#f3ead8' ],
		[ 'GOFIO', '#6c4a2b', '#f6e6bd' ],
		[ 'HBTDATA', '#123b46', '#f2b45e' ],
		[ 'FARMACIA', '#1f6b45', '#f5f1e4' ]
	],
	'Avenida José Mesa y López': [
		[ 'HBTDATA', '#123b46', '#f2b45e' ],
		[ 'ABRETUSOBRE', '#3b2a4d', '#e7d8ff' ],
		[ 'PLÁTANO', '#d8a921', '#2f5126' ],
		[ 'CALIMA 0%', '#9c6b41', '#f7dfb6' ]
	],
	'Calle León y Castillo': [
		[ 'GOFIO', '#6c4a2b', '#f6e6bd' ],
		[ 'MOJO PICÓN', '#a52f25', '#ffe6b8' ]
	]
};

function makeTexture( label, bg, fg ) {

	const canvas = document.createElement( 'canvas' );
	canvas.width = 512;
	canvas.height = 160;
	const ctx = canvas.getContext( '2d' );
	ctx.fillStyle = bg;
	ctx.fillRect( 0, 0, 512, 160 );
	ctx.strokeStyle = 'rgba(247, 241, 227, 0.65)';
	ctx.lineWidth = 10;
	ctx.strokeRect( 8, 8, 496, 144 );
	ctx.fillStyle = fg;
	ctx.font = '800 58px Arial';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText( label, 256, 82 );
	const texture = new THREE.CanvasTexture( canvas );
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.anisotropy = 4;
	return texture;

}

function roadLine( data, name ) {

	let best = null;
	let bestLength = 0;

	for ( const road of data.roads ) {

		if ( road.n !== name ) continue;
		let length = 0;
		for ( let i = 1; i < road.p.length; i ++ ) length += Math.hypot( road.p[ i ][ 0 ] - road.p[ i - 1 ][ 0 ], road.p[ i ][ 1 ] - road.p[ i - 1 ][ 1 ] );
		if ( length > bestLength ) {

			best = road;
			bestLength = length;

		}

	}

	return best;

}

function sample( road, step, onPoint ) {

	let distance = 0;
	let next = 22;

	for ( let i = 1; i < road.p.length; i ++ ) {

		const a = road.p[ i - 1 ];
		const b = road.p[ i ];
		const dx = b[ 0 ] - a[ 0 ];
		const dz = b[ 1 ] - a[ 1 ];
		const length = Math.hypot( dx, dz );
		if ( length < 0.001 ) continue;
		const tx = dx / length;
		const tz = dz / length;

		while ( next <= distance + length ) {

			const k = ( next - distance ) / length;
			onPoint( { x: a[ 0 ] + dx * k, z: a[ 1 ] + dz * k, tx, tz } );
			next += step;

		}

		distance += length;

	}

}

export function createShopSigns( { data, coastField } ) {

	const group = new THREE.Group();
	group.name = 'rotulos-locales';
	const frameMat = new THREE.MeshStandardMaterial( { color: 0x2d2d2d, roughness: 0.5, metalness: 0.55 } );
	const planeGeo = new THREE.PlaneGeometry( 2.25, 0.7 );
	let total = 0;

	for ( const [ roadName, shops ] of Object.entries( SHOPS ) ) {

		const road = roadLine( data, roadName );
		if ( ! road ) continue;
		let index = 0;
		sample( road, 46, ( p ) => {

			if ( total >= 24 ) return;
			const nx = p.tz;
			const nz = - p.tx;
			const side = index % 2 === 0 ? 1 : - 1;
			const offset = road.w / 2 + 0.35;
			const x = p.x + nx * offset * side;
			const z = p.z + nz * offset * side;
			if ( ! coastField.isLand( x, z, 0.3 ) ) return;
			const shop = shops[ index % shops.length ];
			const yaw = Math.atan2( - nx * side, - nz * side );
			const sign = new THREE.Group();
			sign.position.set( x, 3.25, z );
			sign.rotation.y = yaw;

			const backing = new THREE.Mesh( new THREE.BoxGeometry( 2.38, 0.84, 0.12 ), frameMat );
			sign.add( backing );
			const texture = makeTexture( shop[ 0 ], shop[ 1 ], shop[ 2 ] );
			const face = new THREE.Mesh( planeGeo, new THREE.MeshStandardMaterial( {
				map: texture,
				emissive: 0xffffff,
				emissiveMap: texture,
				emissiveIntensity: 0.06,
				roughness: 0.62,
				side: THREE.FrontSide
			} ) );
			face.position.z = 0.075;
			sign.add( face );
			const faceBack = new THREE.Mesh( planeGeo, face.material );
			faceBack.position.z = - 0.075;
			faceBack.rotation.y = Math.PI;
			sign.add( faceBack );
			group.add( sign );
			total ++;
			index ++;

		} );

	}

	return group;

}
