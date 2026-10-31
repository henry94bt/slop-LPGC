import * as THREE from 'three';
import { BRANDS } from '../config/city.js';
import { AD_CREATIVES } from '../config/ads.js';
import { glowTexture } from '../utils/textures.js';
import { assetUrl } from '../utils/assets.js';

export async function loadBillboardTextures( renderer ) {

	const loader = new THREE.TextureLoader();
	const anisotropy = renderer.capabilities.getMaxAnisotropy();
	const textures = {};
	const entries = [
		...Object.entries( BRANDS ).map( ( [ id, item ] ) => [ id, item ] ),
		...Object.entries( AD_CREATIVES ).map( ( [ id, item ] ) => [ id, item ] )
	];

	await Promise.all( entries.map( async ( [ id, brand ] ) => {

		const texture = await loader.loadAsync( assetUrl( brand.texture ) );
		texture.colorSpace = THREE.SRGBColorSpace;
		texture.anisotropy = anisotropy;
		texture.minFilter = THREE.LinearMipmapLinearFilter;
		texture.generateMipmaps = true;
		textures[ id ] = texture;

	} ) );

	return textures;

}

const sharedGlow = glowTexture();

export function createBillboards( sites, textures, preset ) {

	const group = new THREE.Group();
	group.name = 'billboards';

	const metal = new THREE.MeshStandardMaterial( { color: 0x262829, roughness: 0.55, metalness: 0.7 } );
	const backMat = new THREE.MeshStandardMaterial( { color: 0x141617, roughness: 0.8, metalness: 0.3 } );
	const baseMat = new THREE.MeshStandardMaterial( { color: 0x6f6a63, roughness: 0.9, metalness: 0.05 } );
	const luminaireMat = new THREE.MeshStandardMaterial( { color: 0x333333, roughness: 0.5, metalness: 0.6 } );

	const records = [];

	for ( const site of sites ) {

		const brand = BRANDS[ site.brand ];
		const width = site.width;
		const height = width / brand.aspect;
		const legs = 6.15;
		const centerY = legs + height / 2;

		const billboard = new THREE.Group();
		billboard.position.set( site.x, 0, site.z );
		billboard.rotation.y = site.yaw;
		billboard.name = `billboard-${brand.id}`;

		// panel retroiluminado
		const panelMat = new THREE.MeshStandardMaterial( {
			map: textures[ brand.id ],
			color: 0xbfbfbf,
			emissive: 0xffffff,
			emissiveMap: textures[ brand.id ],
			emissiveIntensity: preset.billboards,
			roughness: 0.65,
			metalness: 0.05,
			side: THREE.FrontSide
		} );

		const panel = new THREE.Mesh( new THREE.PlaneGeometry( width, height ), panelMat );
		panel.position.set( 0, centerY, 0.14 );
		panel.castShadow = false;
		panel.receiveShadow = false;

		// caja posterior
		const box = new THREE.Mesh( new THREE.BoxGeometry( width + 0.45, height + 0.45, 0.3 ), backMat );
		box.position.set( 0, centerY, - 0.04 );
		box.castShadow = true;
		box.receiveShadow = true;

		// marco
		const frameTop = new THREE.Mesh( new THREE.BoxGeometry( width + 0.8, 0.16, 0.42 ), metal );
		frameTop.position.set( 0, centerY + height / 2 + 0.2, 0.04 );
		const frameBottom = new THREE.Mesh( new THREE.BoxGeometry( width + 0.8, 0.16, 0.42 ), metal );
		frameBottom.position.set( 0, centerY - height / 2 - 0.2, 0.04 );
		const frameLeft = new THREE.Mesh( new THREE.BoxGeometry( 0.16, height + 0.55, 0.42 ), metal );
		frameLeft.position.set( - width / 2 - 0.22, centerY, 0.04 );
		const frameRight = new THREE.Mesh( new THREE.BoxGeometry( 0.16, height + 0.55, 0.42 ), metal );
		frameRight.position.set( width / 2 + 0.22, centerY, 0.04 );

		// patas y bases
		for ( const side of [ - 1, 1 ] ) {

			const leg = new THREE.Mesh( new THREE.BoxGeometry( 0.24, legs + 0.1, 0.24 ), metal );
			leg.position.set( side * width * 0.3, legs / 2, - 0.12 );
			leg.castShadow = true;
			billboard.add( leg );

			const foot = new THREE.Mesh( new THREE.BoxGeometry( 1.1, 0.28, 0.9 ), baseMat );
			foot.position.set( side * width * 0.3, 0.14, - 0.02 );
			foot.receiveShadow = true;
			billboard.add( foot );

			const uplight = new THREE.Mesh( new THREE.BoxGeometry( 0.42, 0.18, 0.18 ), luminaireMat );
			uplight.position.set( side * width * 0.36, legs + 0.06, 0.55 );
			billboard.add( uplight );

		}

		// halo cálido detrás del panel
		const halo = new THREE.Mesh(
			new THREE.PlaneGeometry( width * 1.5, height * 1.6 ),
			new THREE.MeshBasicMaterial( {
				map: sharedGlow,
				color: brand.light,
				transparent: true,
				opacity: 0.14,
				blending: THREE.AdditiveBlending,
				depthWrite: false,
				side: THREE.DoubleSide
			} )
		);
		halo.position.set( 0, centerY, - 0.4 );
		halo.renderOrder = 2;

		const light = new THREE.PointLight( brand.light, 4, 22, 2 );
		light.position.set( 0, centerY - height * 0.1, 2.4 );
		light.castShadow = false;

		billboard.add( box, panel, frameTop, frameBottom, frameLeft, frameRight, halo, light );
		group.add( billboard );

		records.push( { billboard, panelMat, light, brand, site } );

	}

	return {
		group,
		records,
		setLighting( next ) {

			for ( const record of records ) {

				record.panelMat.emissiveIntensity = next.billboards;
				record.light.intensity = 3 + next.billboards * 4;

			}

		}
	};

}
