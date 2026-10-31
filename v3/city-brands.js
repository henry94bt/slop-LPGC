import * as THREE from 'three/webgpu';

function brandMaterial( texture, glow ) {

	return new THREE.MeshStandardNodeMaterial( {
		map: texture,
		emissive: 0xffffff,
		emissiveMap: texture,
		emissiveIntensity: glow,
		roughness: 0.4,
		metalness: 0.05
	} );

}

function lightbox( texture, width, height, x, y, z, yaw ) {

	const group = new THREE.Group();
	group.position.set( x, 0.1, z );
	group.rotation.y = yaw;
	const dark = new THREE.MeshStandardNodeMaterial( { color: 0x222a2b, roughness: 0.4, metalness: 0.7 } );
	const postH = y - height / 2;
	const postGeo = new THREE.BoxGeometry( 0.12, postH, 0.12 );
	for ( const px of [ - width / 2 + 0.2, width / 2 - 0.2 ] ) {

		const post = new THREE.Mesh( postGeo, dark );
		post.position.set( px, postH / 2, 0 );
		post.castShadow = true;
		group.add( post );

	}

	const backing = new THREE.Mesh( new THREE.BoxGeometry( width + 0.3, height + 0.3, 0.2 ), dark );
	backing.position.y = y;
	backing.castShadow = true;
	group.add( backing );

	const face = new THREE.Mesh( new THREE.PlaneGeometry( width, height ), brandMaterial( texture, 0.16 ) );
	face.position.set( 0, y, 0.11 );
	group.add( face );
	const back = new THREE.Mesh( face.geometry, face.material );
	back.position.set( 0, y, - 0.11 );
	back.rotation.y = Math.PI;
	group.add( back );
	return group;

}

function wallPanel( texture, width, height, x, y, z, yaw ) {

	const group = new THREE.Group();
	group.position.set( x, y, z );
	group.rotation.y = yaw;
	const backing = new THREE.Mesh(
		new THREE.BoxGeometry( width + 0.3, height + 0.3, 0.16 ),
		new THREE.MeshStandardNodeMaterial( { color: 0x202627, roughness: 0.45, metalness: 0.65 } )
	);
	group.add( backing );
	const face = new THREE.Mesh( new THREE.PlaneGeometry( width, height ), brandMaterial( texture, 0.16 ) );
	face.position.z = 0.09;
	group.add( face );
	const back = new THREE.Mesh( face.geometry, face.material );
	back.position.z = - 0.09;
	back.rotation.y = Math.PI;
	group.add( back );
	return group;

}

export function addCityBrands( scene, camera ) {

	const loader = new THREE.TextureLoader();
	const texture = path => {

		const t = loader.load( path );
		t.colorSpace = THREE.SRGBColorSpace;
		t.anisotropy = 8;
		return t;

	};
	const hbt = texture( './assets/hbtdata_banner.png' );
	const abretu = texture( './assets/abretu_og.png' );
	const group = new THREE.Group();
	group.name = 'marcas-canarias';

	// Los paneles se orientan hacia la cámara inicial.
	const face = ( x, z ) => Math.atan2( camera.position.x - x, camera.position.z - z );

	const p1 = { x: 560, z: - 250 };
	group.add( lightbox( hbt, 4.6, 1.15, p1.x, 3.0, p1.z, face( p1.x, p1.z ) ) );

	const p2 = { x: 610, z: - 300 };
	group.add( lightbox( abretu, 3.15, 1.65, p2.x, 3.1, p2.z, face( p2.x, p2.z ) ) );

	const p3 = { x: 645, z: - 330 };
	group.add( wallPanel( hbt, 6.2, 1.55, p3.x, 6.0, p3.z, face( p3.x, p3.z ) ) );

	const p4 = { x: 500, z: - 205 };
	group.add( lightbox( abretu, 2.4, 1.26, p4.x, 2.5, p4.z, face( p4.x, p4.z ) ) );

	scene.add( group );
	return group;

}
