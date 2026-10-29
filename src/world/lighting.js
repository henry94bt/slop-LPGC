import * as THREE from 'three';

const DEG = Math.PI / 180;

function directionFrom( elevation, azimuth ) {

	const el = elevation * DEG;
	const az = azimuth * DEG;
	const cos = Math.cos( el );
	return new THREE.Vector3(
		Math.sin( az ) * cos,
		Math.sin( el ),
		- Math.cos( az ) * cos
	).normalize();

}

export function createLighting( scene, preset ) {

	const sunDirection = new THREE.Vector3();

	const sun = new THREE.DirectionalLight( 0xffb26a, 3.4 );
	sun.castShadow = true;
	sun.shadow.mapSize.set( 2048, 2048 );
	sun.shadow.camera.near = 10;
	sun.shadow.camera.far = 6000;
	sun.shadow.camera.left = - 850;
	sun.shadow.camera.right = 850;
	sun.shadow.camera.top = 850;
	sun.shadow.camera.bottom = - 850;
	sun.shadow.camera.updateProjectionMatrix();
	sun.shadow.bias = - 0.00025;
	sun.shadow.normalBias = 0.45;
	sun.shadow.radius = 2.6;

	sun.target.position.set( 0, 0, 0 );
	scene.add( sun );
	scene.add( sun.target );

	const hemi = new THREE.HemisphereLight( 0xffd3ad, 0x4d3a32, 1.05 );
	scene.add( hemi );

	const fill = new THREE.DirectionalLight( 0x7f9dc9, 0.42 );
	fill.castShadow = false;
	scene.add( fill );

	function apply( next ) {

		sunDirection.copy( directionFrom( next.sun.elevation, next.sun.azimuth ) );

		sun.color.setHex( next.sun.color );
		sun.intensity = next.sun.intensity;
		sun.position.copy( sunDirection ).multiplyScalar( 3000 );

		hemi.color.setHex( next.hemi.sky );
		hemi.groundColor.setHex( next.hemi.ground );
		hemi.intensity = next.hemi.intensity;

		const fillDir = directionFrom( next.fill.elevation, next.fill.azimuth );
		fill.color.setHex( next.fill.color );
		fill.intensity = next.fill.intensity;
		fill.position.copy( fillDir ).multiplyScalar( 1600 );

		if ( scene.fog ) {

			scene.fog.color.setHex( next.fog.color );
			scene.fog.near = next.fog.near;
			scene.fog.far = next.fog.far;

		}

	}

	function follow( target ) {

		sun.target.position.copy( target );
		sun.position.copy( target ).addScaledVector( sunDirection, 3000 );
		sun.target.updateMatrixWorld();

	}

	follow( new THREE.Vector3( 0, 0, 0 ) );
	apply( preset );

	return {
		sun,
		hemi,
		fill,
		sunDirection,
		apply,
		follow
	};

}
