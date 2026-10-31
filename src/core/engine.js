import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
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
	scene.fog = new THREE.Fog( 0xe5a274, 550, 9800 );

	const camera = new THREE.PerspectiveCamera( 64, window.innerWidth / window.innerHeight, 0.08, 30000 );
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

	let ssaoPass = null;

	if ( ! lowPower ) {

		ssaoPass = new SSAOPass( scene, camera, window.innerWidth, window.innerHeight );
		ssaoPass.kernelRadius = 10;
		ssaoPass.minDistance = 0.002;
		ssaoPass.maxDistance = 0.09;
		composer.addPass( ssaoPass );

	}

	const bloomPass = new UnrealBloomPass(
		new THREE.Vector2( window.innerWidth, window.innerHeight ),
		0.34,
		0.48,
		0.9
	);
	composer.addPass( bloomPass );

	const smaaPass = new SMAAPass( window.innerWidth, window.innerHeight );
	composer.addPass( smaaPass );
	composer.addPass( new OutputPass() );

	function resize() {

		const width = window.innerWidth;
		const height = window.innerHeight;
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		renderer.setSize( width, height );
		composer.setSize( width, height );
		bloomPass.resolution.set( width, height );
		if ( ssaoPass ) ssaoPass.setSize( width, height );
		smaaPass.setSize( width, height );

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
