import * as THREE from 'three';

const UMBRELLA_COLORS = [ 0xf26b4a, 0xf4d6a7, 0xe8b64a, 0x4a9c9b, 0xf0a6b4, 0xe8e0ce ];
const TOWEL_COLORS = [ 0xf26b4a, 0xf4d6a7, 0x4a9c9b, 0xf0a6b4, 0xe8b64a, 0x7a9e6b ];
const SKIN_COLORS = [ 0xf1c9a5, 0xe0b089, 0xc68f66, 0xa66f4c, 0x7d4f34, 0xf5d9bd ];
const SWIM_COLORS = [ 0xf26b4a, 0x4a9c9b, 0xf0a6b4, 0x2f3f5c, 0xe8b64a, 0xeae2d1, 0x6b8f5e ];

function mulberry32( seed ) {

	let a = seed >>> 0;
	return function () {

		a += 0x6D2B79F5;
		let t = a;
		t = Math.imul( t ^ ( t >>> 15 ), t | 1 );
		t ^= t + Math.imul( t ^ ( t >>> 7 ), t | 61 );
		return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296;

	};

}

function makeUmbrella( random ) {

	const group = new THREE.Group();
	const pole = new THREE.Mesh(
		new THREE.CylinderGeometry( 0.045, 0.055, 2.5, 6 ),
		new THREE.MeshStandardMaterial( { color: 0x8a6a4a, roughness: 0.9 } )
	);
	pole.position.y = 1.25;
	pole.castShadow = true;
	group.add( pole );

	const canopy = new THREE.Mesh(
		new THREE.ConeGeometry( 1.45, 0.42, 9, 1, true ),
		new THREE.MeshStandardMaterial( {
			color: UMBRELLA_COLORS[ Math.floor( random() * UMBRELLA_COLORS.length ) ],
			roughness: 0.85,
			side: THREE.DoubleSide
		} )
	);
	canopy.position.y = 2.45;
	canopy.castShadow = true;
	group.add( canopy );

	const tip = new THREE.Mesh( new THREE.SphereGeometry( 0.07, 6, 5 ), new THREE.MeshStandardMaterial( { color: 0xd9c7a8 } ) );
	tip.position.y = 2.72;
	group.add( tip );
	group.rotation.y = random() * Math.PI * 2;
	return group;

}

function makeLifeguardTower( random, faceYaw ) {

	const group = new THREE.Group();
	const white = new THREE.MeshStandardMaterial( { color: 0xf2ead9, roughness: 0.8 } );
	const red = new THREE.MeshStandardMaterial( { color: 0xe44f38, roughness: 0.7 } );
	const wood = new THREE.MeshStandardMaterial( { color: 0xb8926c, roughness: 0.9 } );
	const dark = new THREE.MeshStandardMaterial( { color: 0x22282b, roughness: 0.8 } );

	for ( const sx of [ - 1.05, 1.05 ] ) {

		for ( const sz of [ - 0.9, 0.9 ] ) {

			const leg = new THREE.Mesh( new THREE.CylinderGeometry( 0.08, 0.11, 2.15, 6 ), wood );
			leg.position.set( sx, 1.08, sz );
			leg.castShadow = true;
			group.add( leg );

		}

	}

	const cabin = new THREE.Mesh( new THREE.BoxGeometry( 2.65, 2.25, 2.1 ), white );
	cabin.position.y = 3.25;
	cabin.castShadow = true;
	cabin.receiveShadow = true;
	group.add( cabin );

	const opening = new THREE.Mesh( new THREE.PlaneGeometry( 1.7, 1.35 ), dark );
	opening.position.set( 0, 3.35, 1.06 );
	group.add( opening );

	const roof = new THREE.Mesh( new THREE.BoxGeometry( 3.15, 0.16, 2.55 ), red );
	roof.position.y = 4.45;
	roof.castShadow = true;
	group.add( roof );

	const rail = new THREE.Mesh( new THREE.BoxGeometry( 3.0, 0.08, 2.4 ), wood );
	rail.position.y = 4.0;
	group.add( rail );

	const ramp = new THREE.Mesh( new THREE.BoxGeometry( 1.1, 0.1, 4.4 ), wood );
	ramp.position.set( 1.5, 1.35, 0.8 );
	ramp.rotation.x = - 0.42;
	ramp.rotation.z = 0.22;
	ramp.castShadow = true;
	group.add( ramp );

	const mast = new THREE.Mesh( new THREE.CylinderGeometry( 0.035, 0.035, 3.4, 5 ), white );
	mast.position.set( - 1.1, 6.2, - 0.7 );
	group.add( mast );

	const flag = new THREE.Mesh( new THREE.PlaneGeometry( 1.2, 0.75 ), new THREE.MeshStandardMaterial( {
		color: 0xf2c230,
		roughness: 0.8,
		side: THREE.DoubleSide
	} ) );
	flag.position.set( - 0.5, 7.3, - 0.7 );
	flag.rotation.y = random() * 0.2;
	group.add( flag );

	group.rotation.y = faceYaw + ( random() - 0.5 ) * 0.2;
	return group;

}

export function createBeachProps( { promenade, coastField, pointAlong, exclusions = [], castShadows = true } ) {

	const group = new THREE.Group();
	group.name = 'beach-props';
	const random = mulberry32( 66109 );

	if ( ! promenade ) return { group, count: 0 };

	const umbrellas = [];
	const towels = [];
	const towers = [];

	function free( x, z, r = 4 ) {

		if ( ! coastField.isLand( x, z, 4 ) ) return false;

		for ( const e of exclusions ) {

			if ( Math.hypot( x - e.x, z - e.z ) < e.r + r ) return false;

		}

		return true;

	}

	// sombrillas y toallas, entre la orilla y el paseo
	for ( let i = 0; i < 92; i ++ ) {

		const t = 0.05 + Math.pow( i / 92, 0.82 ) * 0.9 + ( random() - 0.5 ) * 0.006;
		const p = pointAlong( promenade, Math.max( 0.03, Math.min( 0.97, t ) ) );
		const q = coastField.query( p.x, p.z );
		const distance = 16 + random() * 34;
		const x = p.x - q.nx * distance + ( random() - 0.5 ) * 12;
		const z = p.z - q.nz * distance + ( random() - 0.5 ) * 12;

		if ( ! free( x, z, 3 ) ) continue;
		umbrellas.push( { x, z, r: random() * Math.PI * 2 } );

		// toalla junto a la sombrilla
		const tx = x + ( random() - 0.5 ) * 4;
		const tz = z + ( random() - 0.5 ) * 4;
		if ( free( tx, tz, 1.5 ) ) towels.push( { x: tx, z: tz, r: random() * Math.PI * 2 } );

	}

	// racimo principal, junto al punto de inicio
	for ( let i = 0; i < 26; i ++ ) {

		const t = 0.16 + random() * 0.16;
		const p = pointAlong( promenade, t );
		const q = coastField.query( p.x, p.z );
		const distance = 12 + random() * 30;
		const x = p.x - q.nx * distance + ( random() - 0.5 ) * 8;
		const z = p.z - q.nz * distance + ( random() - 0.5 ) * 8;

		if ( ! free( x, z, 2.5 ) ) continue;

		umbrellas.push( { x, z, r: random() * Math.PI * 2 } );
		towels.push( {
			x: x + ( random() - 0.5 ) * 3.4,
			z: z + ( random() - 0.5 ) * 3.4,
			r: random() * Math.PI * 2
		} );

	}

	// primer plano junto al punto de inicio
	for ( let i = 0; i < 12; i ++ ) {

		const t = 0.205 + i * 0.0045;
		const p = pointAlong( promenade, t );
		const q = coastField.query( p.x, p.z );
		const distance = 16 + ( i % 4 ) * 3.5;
		const x = p.x - q.nx * distance + ( ( i % 3 ) - 1 ) * 4.5;
		const z = p.z - q.nz * distance + ( ( i % 5 ) - 2 ) * 2.2;
		if ( ! free( x, z, 2.2 ) ) continue;
		umbrellas.push( { x, z, r: i * 0.9 } );
		towels.push( { x: x + 1.2, z: z + 0.8, r: i * 0.7 } );

	}

	const poleGeo = new THREE.CylinderGeometry( 0.045, 0.055, 2.5, 6 );
	const poleMat = new THREE.MeshStandardMaterial( { color: 0x8a6a4a, roughness: 0.9 } );
	const poleMesh = new THREE.InstancedMesh( poleGeo, poleMat, umbrellas.length );

	const canopyGeo = new THREE.ConeGeometry( 1.45, 0.42, 9, 1, true );
	const canopyMat = new THREE.MeshStandardMaterial( { color: 0xffffff, roughness: 0.85, side: THREE.DoubleSide } );
	const canopyMesh = new THREE.InstancedMesh( canopyGeo, canopyMat, umbrellas.length );

	const tipGeo = new THREE.SphereGeometry( 0.07, 6, 5 );
	const tipMat = new THREE.MeshStandardMaterial( { color: 0xd9c7a8 } );
	const tipMesh = new THREE.InstancedMesh( tipGeo, tipMat, umbrellas.length );

	const uMatrix = new THREE.Matrix4();
	const uPosition = new THREE.Vector3();
	const uQuaternion = new THREE.Quaternion();
	const uScale = new THREE.Vector3( 1, 1, 1 );
	const uEuler = new THREE.Euler();

	umbrellas.forEach( ( umbrella, i ) => {

		uEuler.set( 0, umbrella.r, 0 );
		uQuaternion.setFromEuler( uEuler );

		uPosition.set( umbrella.x, 1.3, umbrella.z );
		uMatrix.compose( uPosition, uQuaternion, uScale );
		poleMesh.setMatrixAt( i, uMatrix );

		uPosition.set( umbrella.x, 2.5, umbrella.z );
		uMatrix.compose( uPosition, uQuaternion, uScale );
		canopyMesh.setMatrixAt( i, uMatrix );
		canopyMesh.setColorAt( i, new THREE.Color( UMBRELLA_COLORS[ i % UMBRELLA_COLORS.length ] ) );

		uPosition.set( umbrella.x, 2.78, umbrella.z );
		uMatrix.compose( uPosition, uQuaternion, uScale );
		tipMesh.setMatrixAt( i, uMatrix );

	} );

	poleMesh.castShadow = true;
	canopyMesh.castShadow = true;
	poleMesh.receiveShadow = true;
	canopyMesh.receiveShadow = true;
	poleMesh.name = 'beach-umbrella-poles';
	canopyMesh.name = 'beach-umbrellas';
	group.add( poleMesh, canopyMesh, tipMesh );

	const towelGeo = new THREE.PlaneGeometry( 2.3, 1.15 );
	towelGeo.rotateX( - Math.PI / 2 );
	const towelMat = new THREE.MeshStandardMaterial( {
		color: 0xffffff,
		roughness: 0.95,
		side: THREE.DoubleSide,
		vertexColors: false
	} );
	const towelMesh = new THREE.InstancedMesh( towelGeo, towelMat, towels.length );
	const matrix = new THREE.Matrix4();
	const position = new THREE.Vector3();
	const quaternion = new THREE.Quaternion();
	const scale = new THREE.Vector3( 1, 1, 1 );
	const euler = new THREE.Euler();

	towels.forEach( ( towel, i ) => {

		position.set( towel.x, 0.058, towel.z );
		euler.set( 0, towel.r, 0 );
		quaternion.setFromEuler( euler );
		matrix.compose( position, quaternion, scale );
		towelMesh.setMatrixAt( i, matrix );
		towelMesh.setColorAt( i, new THREE.Color( TOWEL_COLORS[ i % TOWEL_COLORS.length ] ) );

	} );

	towelMesh.receiveShadow = true;
	towelMesh.name = 'beach-towels';
	group.add( towelMesh );

	// bañistas
	const people = [];

	for ( const umbrella of umbrellas ) {

		const count = random() > 0.55 ? 2 : 1;

		for ( let i = 0; i < count; i ++ ) {

			const x = umbrella.x + ( random() - 0.5 ) * 4.2;
			const z = umbrella.z + ( random() - 0.5 ) * 4.2;
			if ( ! free( x, z, 0.6 ) ) continue;
			people.push( {
				x,
				z,
				sitting: random() > 0.7,
				r: random() * Math.PI * 2,
				skin: SKIN_COLORS[ Math.floor( random() * SKIN_COLORS.length ) ],
				swim: SWIM_COLORS[ Math.floor( random() * SWIM_COLORS.length ) ]
			} );

		}

	}

	for ( let i = 0; i < 16; i ++ ) {

		const p = pointAlong( promenade, 0.08 + ( i / 16 ) * 0.84 );
		const q = coastField.query( p.x, p.z );
		const x = p.x + q.nx * ( 1.5 + random() * 2.5 );
		const z = p.z + q.nz * ( 1.5 + random() * 2.5 );
		if ( ! free( x, z, 0.6 ) ) continue;
		people.push( {
			x,
			z,
			sitting: false,
			r: random() * Math.PI * 2,
			skin: SKIN_COLORS[ Math.floor( random() * SKIN_COLORS.length ) ],
			swim: SWIM_COLORS[ Math.floor( random() * SWIM_COLORS.length ) ]
		} );

	}

	const bodyGeo = new THREE.CapsuleGeometry( 0.16, 0.56, 4, 6 );
	bodyGeo.translate( 0, 0.83, 0 );
	const headGeo = new THREE.SphereGeometry( 0.135, 8, 6 );
	headGeo.translate( 0, 1.31, 0 );

	const bodyMesh = new THREE.InstancedMesh( bodyGeo, new THREE.MeshStandardMaterial( { roughness: 0.85 } ), people.length );
	const headMesh = new THREE.InstancedMesh( headGeo, new THREE.MeshStandardMaterial( { roughness: 0.9 } ), people.length );

	people.forEach( ( person, i ) => {

		position.set( person.x, 0.05, person.z );
		euler.set( 0, person.r, 0 );
		quaternion.setFromEuler( euler );
		scale.set( 1, person.sitting ? 0.72 : 1, 1 );
		matrix.compose( position, quaternion, scale );
		bodyMesh.setMatrixAt( i, matrix );
		headMesh.setMatrixAt( i, matrix );
		bodyMesh.setColorAt( i, new THREE.Color( person.swim ) );
		headMesh.setColorAt( i, new THREE.Color( person.skin ) );

	} );

	bodyMesh.castShadow = castShadows;
	headMesh.castShadow = castShadows;
	bodyMesh.receiveShadow = true;
	bodyMesh.name = 'beach-people';
	group.add( bodyMesh, headMesh );
	group.userData.people = people.length;

	// torres de socorrista
	for ( const t of [ 0.26, 0.5, 0.72, 0.9 ] ) {

		const p = pointAlong( promenade, t );
		const q = coastField.query( p.x, p.z );
		const x = p.x - q.nx * 38;
		const z = p.z - q.nz * 38;

		if ( ! free( x, z, 10 ) ) continue;

		const tower = makeLifeguardTower( random, Math.atan2( q.nx, q.nz ) );
		tower.position.set( x, 0.05, z );
		tower.traverse( object => {

			if ( object.isMesh ) {

				object.castShadow = castShadows;
				object.receiveShadow = true;

			}

		} );
		group.add( tower );
		towers.push( { x, z } );

	}

	return {
		group,
		count: umbrellas.length,
		umbrellas,
		towers
	};

}
