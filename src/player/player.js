import * as THREE from 'three';
import { createWake } from '../world/wake.js';
import { clamp, damp } from '../utils/geo.js';

function buildKayak() {

	const group = new THREE.Group();
	group.name = 'kayak';

	const hullMat = new THREE.MeshStandardMaterial( {
		color: 0xf2653f,
		roughness: 0.42,
		metalness: 0.08,
		side: THREE.DoubleSide
	} );
	const deckMat = new THREE.MeshStandardMaterial( {
		color: 0xf1e2c8,
		roughness: 0.55,
		side: THREE.DoubleSide
	} );

	const sections = [
		{ z: - 1.92, w: 0.02, deck: 0.34, keel: 0.08 },
		{ z: - 1.45, w: 0.22, deck: 0.32, keel: - 0.02 },
		{ z: - 0.7, w: 0.4, deck: 0.3, keel: - 0.09 },
		{ z: 0.1, w: 0.44, deck: 0.3, keel: - 0.11 },
		{ z: 0.9, w: 0.38, deck: 0.31, keel: - 0.08 },
		{ z: 1.5, w: 0.22, deck: 0.33, keel: - 0.02 },
		{ z: 1.9, w: 0.02, deck: 0.36, keel: 0.06 }
	];

	const positions = [];
	const indices = [];
	const colors = [];

	function add( x, y, z, color ) {

		positions.push( x, y, z );
		colors.push( color.r, color.g, color.b );
		return positions.length / 3 - 1;

	}

	const orange = new THREE.Color( 0xf2653f );
	const cream = new THREE.Color( 0xf1e2c8 );

	for ( let i = 0; i < sections.length - 1; i ++ ) {

		const a = sections[ i ];
		const b = sections[ i + 1 ];
		const al = add( - a.w, a.deck, a.z, orange );
		const ar = add( a.w, a.deck, a.z, orange );
		const ak = add( 0, a.keel, a.z, orange );
		const bl = add( - b.w, b.deck, b.z, orange );
		const br = add( b.w, b.deck, b.z, orange );
		const bk = add( 0, b.keel, b.z, orange );

		indices.push( al, bl, ak, ak, bl, bk );
		indices.push( ar, ak, br, ak, bk, br );

		const adl = add( - a.w, a.deck + 0.02, a.z, cream );
		const adr = add( a.w, a.deck + 0.02, a.z, cream );
		const bdl = add( - b.w, b.deck + 0.02, b.z, cream );
		const bdr = add( b.w, b.deck + 0.02, b.z, cream );
		indices.push( adl, adr, bdl, adr, bdr, bdl );

	}

	const hullGeo = new THREE.BufferGeometry();
	hullGeo.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
	hullGeo.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
	hullGeo.setIndex( indices );
	hullGeo.computeVertexNormals();

	const hull = new THREE.Mesh( hullGeo, new THREE.MeshStandardMaterial( {
		vertexColors: true,
		roughness: 0.42,
		metalness: 0.08,
		side: THREE.DoubleSide
	} ) );
	hull.castShadow = false;
	group.add( hull );

	const cockpit = new THREE.Mesh( new THREE.CircleGeometry( 0.21, 20 ), new THREE.MeshBasicMaterial( { color: 0x171512 } ) );
	cockpit.scale.set( 1, 1.4, 1 );
	cockpit.rotation.x = - Math.PI / 2;
	cockpit.position.set( 0, 0.335, 0.22 );
	group.add( cockpit );

	const rim = new THREE.Mesh( new THREE.TorusGeometry( 0.23, 0.028, 5, 20 ), deckMat );
	rim.scale.set( 1, 1.45, 1 );
	rim.rotation.x = - Math.PI / 2;
	rim.position.set( 0, 0.34, 0.22 );
	group.add( rim );

	// palista
	const paddler = new THREE.Group();
	const wetsuit = new THREE.MeshStandardMaterial( { color: 0x22343d, roughness: 0.7 } );
	const skin = new THREE.MeshStandardMaterial( { color: 0xd9a57a, roughness: 0.85 } );
	const vest = new THREE.MeshStandardMaterial( { color: 0xf2b544, roughness: 0.7 } );

	const torso = new THREE.Mesh( new THREE.CapsuleGeometry( 0.18, 0.4, 4, 8 ), wetsuit );
	torso.position.set( 0, 1.12, 0.18 );
	torso.rotation.x = - 0.12;
	paddler.add( torso );

	const lifeVest = new THREE.Mesh( new THREE.BoxGeometry( 0.36, 0.34, 0.28 ), vest );
	lifeVest.position.set( 0, 1.16, 0.16 );
	paddler.add( lifeVest );

	const head = new THREE.Mesh( new THREE.SphereGeometry( 0.15, 10, 8 ), skin );
	head.position.set( 0, 1.52, 0.21 );
	paddler.add( head );

	const cap = new THREE.Mesh( new THREE.SphereGeometry( 0.155, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55 ), new THREE.MeshStandardMaterial( { color: 0xf2653f, roughness: 0.7 } ) );
	cap.position.set( 0, 1.55, 0.21 );
	paddler.add( cap );

	for ( const side of [ - 1, 1 ] ) {

		const arm = new THREE.Mesh( new THREE.CylinderGeometry( 0.045, 0.05, 0.62, 6 ), skin );
		arm.position.set( side * 0.24, 1.24, 0.05 );
		arm.rotation.x = Math.PI / 2.5;
		arm.rotation.z = side * 0.62;
		paddler.add( arm );

	}

	group.add( paddler );

	const bowGeo = new THREE.BufferGeometry();
	bowGeo.setAttribute( 'position', new THREE.Float32BufferAttribute( [
		- 0.3, 0.34, - 1.2,
		0.3, 0.34, - 1.2,
		0, 0.42, - 1.98
	], 3 ) );
	bowGeo.setIndex( [ 0, 1, 2 ] );
	bowGeo.computeVertexNormals();

	const bow = new THREE.Mesh( bowGeo, new THREE.MeshStandardMaterial( {
		color: 0xf1e2c8,
		roughness: 0.5,
		side: THREE.DoubleSide
	} ) );
	bow.visible = false;
	group.add( bow );

	// pala
	const paddle = new THREE.Group();
	const shaft = new THREE.Mesh( new THREE.CylinderGeometry( 0.022, 0.022, 2.35, 6 ), new THREE.MeshStandardMaterial( {
		color: 0x3c352d,
		roughness: 0.6
	} ) );
	shaft.rotation.z = Math.PI / 2;
	paddle.add( shaft );

	for ( const side of [ - 1, 1 ] ) {

		const blade = new THREE.Mesh( new THREE.BoxGeometry( 0.2, 0.018, 0.62 ), deckMat );
		blade.position.set( side * 1.1, 0, 0.08 );
		blade.rotation.y = side * 0.16;
		paddle.add( blade );

		const tip = new THREE.Mesh( new THREE.BoxGeometry( 0.205, 0.02, 0.08 ), new THREE.MeshStandardMaterial( {
			color: 0xf2653f,
			roughness: 0.5
		} ) );
		tip.position.set( side * 1.1, 0.002, 0.37 );
		tip.rotation.y = side * 0.16;
		paddle.add( tip );

	}

	paddle.position.set( 0, 1.2, 0.12 );
	paddle.rotation.x = - 0.06;
	paddle.scale.setScalar( 0.88 );
	paddle.visible = true;
	group.add( paddle );

	return { group, paddle };

}

export function createPlayer( { world, camera, ocean, input, scene } ) {

	camera.rotation.order = 'YXZ';

	const walk = {
		pos: new THREE.Vector3( world.spawn.x, 0, world.spawn.z ),
		yaw: world.spawn.yaw,
		pitch: world.spawn.pitch,
		velocity: new THREE.Vector2(),
		bob: 0,
		bobTime: 0
	};

	const kayak = {
		pos: new THREE.Vector3( world.kayakSpawn.x, 0, world.kayakSpawn.z ),
		heading: world.kayakSpawn.yaw,
		pitch: - 0.02,
		lookYaw: 0,
		speed: 0,
		phase: 0,
		roll: 0,
		wave: 0
	};

	const kayakVisual = buildKayak();
	kayakVisual.group.visible = false;
	scene.add( kayakVisual.group );

	const wake = createWake( scene );

	let mode = 'walk';
	let lastWalk = { x: walk.pos.x, z: walk.pos.z, yaw: walk.yaw };
	let transition = 1;
	let elapsed = 0;
	let lastSpeedKmh = 0;

	function setMode( next, override = null ) {

		if ( next === mode && ! override ) return;

		if ( next === 'kayak' ) {

			lastWalk = { x: walk.pos.x, z: walk.pos.z, yaw: walk.yaw };
			const spawn = override || world.kayakSpawn;
			kayak.pos.set( spawn.x, 0, spawn.z );
			kayak.heading = spawn.yaw;
			kayak.speed = 0;
			kayak.lookYaw = 0;
			kayak.pitch = - 0.02;
			kayak.phase = 0;
			kayakVisual.group.visible = true;
			wake.clear();

		} else {

			if ( override ) {

				walk.pos.set( override.x, 0, override.z );
				if ( typeof override.yaw === 'number' ) walk.yaw = override.yaw;

			} else if ( world.walkable( lastWalk.x, lastWalk.z ) ) {

				walk.pos.set( lastWalk.x, 0, lastWalk.z );
				walk.yaw = lastWalk.yaw;

			} else {

				walk.pos.set( world.spawn.x, 0, world.spawn.z );
				walk.yaw = world.spawn.yaw;

			}

			walk.velocity.set( 0, 0 );
			walk.pitch = - 0.02;
			kayakVisual.group.visible = false;
			wake.clear();

		}

		mode = next;
		transition = 0;

	}

	function teleport( placeName ) {

		const place = world.resolvePlace( placeName );
		if ( ! place ) return false;

		if ( place.mode === 'kayak' ) {

			setMode( 'kayak', { x: place.x, z: place.z, yaw: place.yaw } );

		} else {

			setMode( 'walk', { x: place.x, z: place.z, yaw: place.yaw } );

		}

		return true;

	}

	function setPose( x, z, yaw = 0, pitch = 0 ) {

		setMode( 'walk', { x, z, yaw } );
		walk.pitch = pitch;
		return true;

	}

	function updateWalk( delta ) {

		const axis = input.getMoveAxis();
		const running = input.isDown( 'ShiftLeft' ) || input.isDown( 'ShiftRight' );
		const maxSpeed = running ? 9.4 : 5.4;
		const forwardX = - Math.sin( walk.yaw );
		const forwardZ = - Math.cos( walk.yaw );
		const rightX = Math.cos( walk.yaw );
		const rightZ = - Math.sin( walk.yaw );

		let dx = forwardX * axis.y + rightX * axis.x;
		let dz = forwardZ * axis.y + rightZ * axis.x;
		const length = Math.hypot( dx, dz );

		if ( length > 1 ) {

			dx /= length;
			dz /= length;

		}

		const targetX = dx * maxSpeed;
		const targetZ = dz * maxSpeed;
		walk.velocity.x = damp( walk.velocity.x, targetX, 9, delta );
		walk.velocity.y = damp( walk.velocity.y, targetZ, 9, delta );

		const speed = Math.hypot( walk.velocity.x, walk.velocity.y );
		const nextX = walk.pos.x + walk.velocity.x * delta;
		const nextZ = walk.pos.z + walk.velocity.y * delta;

		if ( world.walkable( nextX, walk.pos.z ) ) walk.pos.x = nextX;
		else walk.velocity.x *= 0.1;

		if ( world.walkable( walk.pos.x, nextZ ) ) walk.pos.z = nextZ;
		else walk.velocity.y *= 0.1;

		const radius = Math.hypot( walk.pos.x, walk.pos.z );

		if ( radius > 6200 ) {

			walk.pos.x *= 6200 / radius;
			walk.pos.z *= 6200 / radius;

		}

		const ratio = clamp( speed / 9.4, 0, 1 );
		walk.bobTime += delta * ( 7.2 + ratio * 4.5 );

		if ( speed > 0.25 ) walk.bob += delta * ( 7.2 + ratio * 4.5 );
		const bob = Math.sin( walk.bob ) * 0.028 * ratio;

		camera.position.set( walk.pos.x, 1.72 + bob, walk.pos.z );
		camera.rotation.set(
			walk.pitch,
			walk.yaw,
			Math.sin( walk.bob * 0.5 ) * 0.005 * ratio
		);

		lastSpeedKmh = speed * 3.6;
		const targetFov = 68 + ratio * 2;
		camera.fov = damp( camera.fov, targetFov, 4, delta );
		camera.updateProjectionMatrix();

	}

	function updateKayak( delta ) {

		const axis = input.getMoveAxis();
		const boost = input.isDown( 'ShiftLeft' ) || input.isDown( 'ShiftRight' );
		const targetSpeed = axis.y * ( boost ? 6.6 : 4.1 );
		kayak.speed = damp( kayak.speed, targetSpeed, 1.15, delta );

		const turnInput = axis.x;
		const turnRate = 0.9 + Math.min( 1, Math.abs( kayak.speed ) / 5 ) * 0.55;
		kayak.heading -= turnInput * turnRate * delta;

		const step = kayak.speed * delta;
		const nextX = kayak.pos.x - Math.sin( kayak.heading ) * step;
		const nextZ = kayak.pos.z - Math.cos( kayak.heading ) * step;

		if ( world.kayakable( nextX, kayak.pos.z ) ) kayak.pos.x = nextX;
		else kayak.speed *= 0.25;

		if ( world.kayakable( kayak.pos.x, nextZ ) ) kayak.pos.z = nextZ;
		else kayak.speed *= 0.25;

		const radius = Math.hypot( kayak.pos.x, kayak.pos.z );

		if ( radius > 2150 ) {

			kayak.pos.x *= 2150 / radius;
			kayak.pos.z *= 2150 / radius;
			kayak.speed *= 0.5;

		}

		const wave = ocean.waveHeight( kayak.pos.x, kayak.pos.z );
		const bobY = - 0.16 + wave + 0.04;

		kayak.roll = damp( kayak.roll, - turnInput * 0.11 + Math.sin( elapsed * 1.4 ) * 0.018, 3, delta );
		kayak.lookYaw = damp( kayak.lookYaw, 0, 0.65, delta );

		kayakVisual.group.position.set( kayak.pos.x, bobY, kayak.pos.z );
		kayakVisual.group.rotation.set( Math.sin( elapsed * 1.1 ) * 0.012, kayak.heading, kayak.roll );

		// cámara de tercera persona: detrás y por encima de la bañera
		const back = 6.0;
		const camX = kayak.pos.x + Math.sin( kayak.heading ) * back;
		const camZ = kayak.pos.z + Math.cos( kayak.heading ) * back;
		camera.position.set( camX, bobY + 2.7, camZ );
		camera.rotation.set(
			kayak.pitch - 0.11 + Math.sin( elapsed * 1.2 ) * 0.008,
			kayak.heading + kayak.lookYaw,
			kayak.roll * 0.4
		);

		const active = Math.abs( kayak.speed ) > 0.25 || Math.abs( axis.y ) > 0.1;
		kayak.phase += delta * ( active ? 4.2 + Math.abs( kayak.speed ) * 0.55 : 0.8 );
		const stroke = Math.sin( kayak.phase );
		kayakVisual.paddle.rotation.z = stroke * 0.32;
		kayakVisual.paddle.rotation.x = - 0.06 + Math.cos( kayak.phase ) * 0.1;
		kayakVisual.paddle.position.x = stroke * 0.1;
		kayakVisual.paddle.position.y = 1.2 + Math.cos( kayak.phase * 2 ) * 0.02;

		wake.update( delta, kayak.pos.x, kayak.pos.z, kayak.heading, Math.abs( kayak.speed ) );

		lastSpeedKmh = Math.abs( kayak.speed ) * 3.6;
		camera.fov = damp( camera.fov, 72, 4, delta );
		camera.updateProjectionMatrix();

	}

	function update( delta ) {

		elapsed += delta;
		transition = Math.min( 1, transition + delta * 2 );

		const look = input.consumeLook();
		const sensitivity = 0.00215;

		if ( mode === 'walk' ) {

			walk.yaw -= look.x * sensitivity;
			walk.pitch -= look.y * sensitivity;
			walk.pitch = clamp( walk.pitch, - 1.15, 1.15 );
			updateWalk( delta );

		} else {

			kayak.lookYaw -= look.x * sensitivity * 0.75;
			kayak.lookYaw = clamp( kayak.lookYaw, - 1.15, 1.15 );
			kayak.pitch -= look.y * sensitivity * 0.65;
			kayak.pitch = clamp( kayak.pitch, - 0.85, 0.55 );
			updateKayak( delta );

		}

	}

	return {
		get mode() {

			return mode;

		},
		get position() {

			return mode === 'walk' ? walk.pos : kayak.pos;

		},
		get yaw() {

			return mode === 'walk' ? walk.yaw : kayak.heading;

		},
		get speedKmh() {

			return lastSpeedKmh;

		},
		get pitch() {

			return mode === 'walk' ? walk.pitch : kayak.pitch;

		},
		get debug() {

			return {
				walk: { x: walk.pos.x, z: walk.pos.z, vx: walk.velocity.x, vz: walk.velocity.y, yaw: walk.yaw },
				kayak: { x: kayak.pos.x, z: kayak.pos.z, speed: kayak.speed, heading: kayak.heading }
			};

		},
		update,
		setMode,
		teleport,
		setPose,
		setLook( yaw, pitch = 0 ) {

			if ( mode === 'walk' ) {

				walk.yaw = yaw;
				walk.pitch = pitch;

			} else {

				kayak.heading = yaw;
				kayak.pitch = pitch;

			}

		}
	};

}
