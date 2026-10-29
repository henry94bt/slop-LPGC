import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function createEngine( canvas ) {

	const isCoarsePointer = window.matchMedia( '(pointer: coarse)' ).matches;
	const isSmallScreen = Math.min( window.innerWidth, window.innerHeight ) < 720;
	const lowPower = isCoarsePointer || isSmallScreen;

	const renderer = new THREE.WebGLRenderer( {
		canvas,
		antialias: true,
		alpha: false,
		stencil: false,
		powerPreference: 'high-performance'
	} );

	renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, lowPower ? 1.25 : 1.65 ) );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.0;
	renderer.shadowMap.enabled = ! lowPower;
	renderer.shadowMap.type = THREE.PCFShadowMap;
	renderer.info.autoReset = true;

	const scene = new THREE.Scene();
	scene.fog = new THREE.Fog( 0xe5a274, 480, 4300 );

	const camera = new THREE.PerspectiveCamera( 64, window.innerWidth / window.innerHeight, 0.08, 16000 );
	camera.position.set( 0, 2, 0 );

	const composer = new EffectComposer( renderer );
	composer.setPixelRatio( renderer.getPixelRatio() );
	composer.setSize( window.innerWidth, window.innerHeight );

	if ( renderer.capabilities.isWebGL2 ) {

		composer.renderTarget1.samples = 4;
		composer.renderTarget2.samples = 4;

	}

	const renderPass = new RenderPass( scene, camera );
	composer.addPass( renderPass );

	const bloomPass = new UnrealBloomPass(
		new THREE.Vector2( window.innerWidth, window.innerHeight ),
		0.52,
		0.62,
		0.82
	);
	composer.addPass( bloomPass );
	composer.addPass( new OutputPass() );

	function resize() {

		const width = window.innerWidth;
		const height = window.innerHeight;
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		renderer.setSize( width, height );
		composer.setSize( width, height );
		bloomPass.resolution.set( width, height );

	}

	function render() {

		composer.render();

	}

	function setBloom( strength ) {

		bloomPass.strength = strength;

	}

	window.addEventListener( 'resize', resize, { passive: true } );

	return {
		renderer,
		scene,
		camera,
		composer,
		bloomPass,
		lowPower,
		render,
		resize,
		setBloom
	};

}
