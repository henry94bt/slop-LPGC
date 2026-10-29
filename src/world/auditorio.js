import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { signTexture, stoneTexture } from '../utils/textures.js';

function curvedGlassGeometry( width, height, depth, segments = 28 ) {

	const positions = [];
	const uvs = [];
	const indices = [];

	for ( let i = 0; i <= segments; i ++ ) {

		const t = i / segments;
		const x = ( t - 0.5 ) * width;
		const z = Math.cos( ( t - 0.5 ) * Math.PI ) * depth;
		positions.push( x, 0, z, x, height, z );
		uvs.push( t, 0, t, 1 );

		if ( i < segments ) {

			const a = i * 2;
			indices.push( a, a + 2, a + 1, a + 1, a + 2, a + 3 );

		}

	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
	geometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );
	geometry.setIndex( indices );
	geometry.computeVertexNormals();
	return geometry;

}

export function createAuditorio( { x, z, coastField, castShadows = true } ) {

	const seaward = coastField.query( x, z );
	const seaX = - seaward.nx;
	const seaZ = - seaward.nz;
	const yaw = Math.atan2( seaX, seaZ );

	const group = new THREE.Group();
	group.name = 'auditorio-alfredo-kraus';
	group.position.set( x, 0.04, z );
	group.rotation.y = yaw;

	const stoneMap = stoneTexture();
	stoneMap.repeat.set( 6, 2 );

	const stone = new THREE.MeshStandardMaterial( {
		map: stoneMap,
		color: 0xe1d3bf,
		roughness: 0.88,
		metalness: 0.02
	} );
	const stoneDark = new THREE.MeshStandardMaterial( { color: 0x9b8f7f, roughness: 0.95 } );
	const white = new THREE.MeshStandardMaterial( { color: 0xf2eee4, roughness: 0.7, metalness: 0.03 } );
	const glass = new THREE.MeshPhysicalMaterial( {
		color: 0x16323d,
		roughness: 0.12,
		metalness: 0.4,
		transparent: true,
		opacity: 0.72,
		clearcoat: 0.6,
		clearcoatRoughness: 0.25,
		side: THREE.DoubleSide
	} );
	const frameMat = new THREE.MeshStandardMaterial( { color: 0x252728, roughness: 0.4, metalness: 0.75 } );
	const interior = new THREE.MeshStandardMaterial( {
		color: 0x2a1c12,
		emissive: 0xffa85c,
		emissiveIntensity: 0.9,
		roughness: 0.9
	} );

	// plaza y escalinata
	const plaza = new THREE.Mesh( new THREE.CircleGeometry( 74, 48 ), new THREE.MeshStandardMaterial( {
		map: stoneMap,
		color: 0xd7c7b0,
		roughness: 0.95
	} ) );
	plaza.rotation.x = - Math.PI / 2;
	plaza.position.set( 0, 0.06, 8 );
	plaza.receiveShadow = true;
	group.add( plaza );

	for ( let step = 0; step < 4; step ++ ) {

		const stair = new THREE.Mesh( new RoundedBoxGeometry( 68 - step * 3, 0.22, 2.4, 2, 0.08 ), stone );
		stair.position.set( 0, 0.12 + step * 0.12, 46 + step * 2.1 );
		stair.receiveShadow = true;
		stair.castShadow = true;
		group.add( stair );

	}

	// volumen principal de piedra
	const base = new THREE.Mesh( new RoundedBoxGeometry( 102, 5.6, 74, 4, 0.55 ), stone );
	base.position.set( 0, 2.8, - 2 );
	base.castShadow = castShadows;
	base.receiveShadow = true;
	group.add( base );

	const main = new THREE.Mesh( new RoundedBoxGeometry( 92, 22, 58, 4, 1.2 ), stone );
	main.position.set( 0, 16.8, - 8 );
	main.castShadow = castShadows;
	main.receiveShadow = true;
	group.add( main );

	// costillas de piedra
	for ( let i = 0; i < 9; i ++ ) {

		const fin = new THREE.Mesh( new THREE.BoxGeometry( 1.1, 21, 3.2 ), stoneDark );
		const side = i % 2 === 0 ? - 1 : 1;
		const offset = 6 + Math.floor( i / 2 ) * 10.5;
		fin.position.set( side * 46.2, 16.6, - 12 + offset * 0.1 );
		fin.castShadow = castShadows;
		group.add( fin );

	}

	// caja oscura interior + vidrio curvo
	const recess = new THREE.Mesh( new THREE.BoxGeometry( 72, 21, 2.2 ), interior );
	recess.position.set( 0, 15.4, 18.5 );
	group.add( recess );

	const glassGeo = curvedGlassGeometry( 66, 19.4, 5.4, 30 );
	const glassMesh = new THREE.Mesh( glassGeo, glass );
	glassMesh.position.set( 0, 6.1, 23.4 );
	glassMesh.castShadow = false;
	glassMesh.renderOrder = 2;
	group.add( glassMesh );

	// montantes verticales
	for ( let i = 0; i <= 14; i ++ ) {

		const t = i / 14;
		const mx = ( t - 0.5 ) * 66;
		const mz = 23.4 + Math.cos( ( t - 0.5 ) * Math.PI ) * 5.4;
		const mullion = new THREE.Mesh( new THREE.BoxGeometry( 0.16, 20, 0.16 ), frameMat );
		mullion.position.set( mx, 16.1, mz );
		group.add( mullion );

	}

	for ( const y of [ 8, 13.2, 18.4, 23.6 ] ) {

		const band = new THREE.Mesh( new THREE.BoxGeometry( 66.6, 0.14, 0.14 ), frameMat );
		band.position.set( 0, y, 28.8 );
		group.add( band );

	}

	// toldo blanco y cubierta
	const canopy = new THREE.Mesh( new RoundedBoxGeometry( 104, 1.5, 50, 3, 0.5 ), white );
	canopy.position.set( 0, 29.4, 2 );
	canopy.rotation.x = - 0.055;
	canopy.castShadow = castShadows;
	canopy.receiveShadow = true;
	group.add( canopy );

	const shell = new THREE.Mesh( new THREE.SphereGeometry( 1, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.5 ), white );
	shell.scale.set( 53, 10.5, 38 );
	shell.position.set( 0, 29.8, - 10 );
	shell.castShadow = castShadows;
	shell.receiveShadow = true;
	group.add( shell );

	// lucernario cálido
	const glow = new THREE.Mesh( new THREE.PlaneGeometry( 38, 5.2 ), new THREE.MeshBasicMaterial( {
		color: 0xffc38a,
		transparent: true,
		opacity: 0.32,
		blending: THREE.AdditiveBlending,
		depthWrite: false
	} ) );
	glow.position.set( 0, 27.8, 22.4 );
	group.add( glow );

	// rótulo
	const sign = new THREE.Mesh(
		new THREE.PlaneGeometry( 32, 2.6 ),
		new THREE.MeshStandardMaterial( {
			map: signTexture( 'AUDITORIO ALFREDO KRAUS', {
				width: 1400,
				height: 180,
				font: '600 64px Outfit, Arial, sans-serif',
				color: '#f4e9d8',
				tracking: 0.36
			} ),
			transparent: true,
			emissive: 0xffd8ab,
			emissiveIntensity: 0.35,
			roughness: 0.6,
			depthWrite: false
		} )
	);
	sign.position.set( 0, 31.2, 26.6 );
	group.add( sign );

	// puertas de acceso
	for ( let i = - 2; i <= 2; i ++ ) {

		const door = new THREE.Mesh( new THREE.PlaneGeometry( 7, 4.4 ), glass );
		door.position.set( i * 9.4, 3.4, 28.3 );
		group.add( door );

	}

	// luces interiores
	for ( const lx of [ - 18, 0, 18 ] ) {

		const light = new THREE.PointLight( 0xffb36b, 10, 34, 2 );
		light.position.set( lx, 10.5, 17.5 );
		group.add( light );

	}

	// jardineras laterales
	for ( const side of [ - 1, 1 ] ) {

		const planter = new THREE.Mesh( new RoundedBoxGeometry( 12, 1.1, 22, 2, 0.2 ), stoneDark );
		planter.position.set( side * 53, 0.6, 20 );
		planter.castShadow = true;
		planter.receiveShadow = true;
		group.add( planter );

	}

	return {
		group,
		yaw,
		collider: { minX: x - 58, maxX: x + 58, minZ: z - 48, maxZ: z + 54 }
	};

}
