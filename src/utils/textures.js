import * as THREE from 'three';

let maxAnisotropy = 8;

export function setMaxAnisotropy( value ) {

	maxAnisotropy = Math.max( 1, value );

}

function makeCanvas( width, height ) {

	const canvas = document.createElement( 'canvas' );
	canvas.width = width;
	canvas.height = height;
	return canvas;

}

function toTexture( canvas, { srgb = true } = {} ) {

	const texture = new THREE.CanvasTexture( canvas );
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
	texture.anisotropy = maxAnisotropy;
	texture.needsUpdate = true;
	return texture;

}

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

function paintNoise( ctx, width, height, base, variance, random, alpha = 1 ) {

	const image = ctx.createImageData( width, height );
	const data = image.data;

	for ( let i = 0; i < data.length; i += 4 ) {

		const n = ( random() - 0.5 ) * variance;
		data[ i ] = Math.max( 0, Math.min( 255, base[ 0 ] + n ) );
		data[ i + 1 ] = Math.max( 0, Math.min( 255, base[ 1 ] + n * 0.94 ) );
		data[ i + 2 ] = Math.max( 0, Math.min( 255, base[ 2 ] + n * 0.86 ) );
		data[ i + 3 ] = 255 * alpha;

	}

	ctx.putImageData( image, 0, 0 );

}

export function asphaltTexture() {

	const size = 512;
	const canvas = makeCanvas( size, size );
	const ctx = canvas.getContext( '2d' );
	const random = mulberry32( 1129 );

	paintNoise( ctx, size, size, [ 54, 50, 49 ], 26, random );

	for ( let i = 0; i < 3200; i ++ ) {

		const x = random() * size;
		const y = random() * size;
		const r = 0.4 + random() * 1.7;
		const light = random() > 0.45;
		ctx.fillStyle = light ? `rgba(140,132,122,${0.08 + random() * 0.18})` : `rgba(22,20,19,${0.15 + random() * 0.3})`;
		ctx.beginPath();
		ctx.arc( x, y, r, 0, Math.PI * 2 );
		ctx.fill();

	}

	// vetas suaves de rodada
	for ( let i = 0; i < 5; i ++ ) {

		ctx.strokeStyle = `rgba(255,240,220,${0.012 + random() * 0.02})`;
		ctx.lineWidth = 18 + random() * 36;
		ctx.beginPath();
		ctx.moveTo( random() * size, 0 );
		ctx.bezierCurveTo( random() * size, size * 0.3, random() * size, size * 0.7, random() * size, size );
		ctx.stroke();

	}

	return toTexture( canvas );

}

export function pavingTexture() {

	const size = 512;
	const canvas = makeCanvas( size, size );
	const ctx = canvas.getContext( '2d' );
	const random = mulberry32( 7701 );

	paintNoise( ctx, size, size, [ 196, 176, 150 ], 18, random );

	const tileW = 128;
	const tileH = 64;

	for ( let y = 0; y < size; y += tileH ) {

		const offset = ( y / tileH ) % 2 === 0 ? 0 : tileW / 2;

		for ( let x = - tileW; x < size; x += tileW ) {

			const px = x + offset;
			ctx.strokeStyle = 'rgba(108, 92, 74, 0.32)';
			ctx.lineWidth = 2;
			ctx.strokeRect( px, y, tileW, tileH );
			ctx.fillStyle = `rgba(255,246,228,${0.015 + random() * 0.045})`;
			ctx.fillRect( px + 3, y + 3, tileW - 6, tileH - 6 );

		}

	}

	for ( let i = 0; i < 900; i ++ ) {

		ctx.fillStyle = random() > 0.5 ? 'rgba(255,246,230,0.16)' : 'rgba(100,85,68,0.14)';
		ctx.fillRect( random() * size, random() * size, 1 + random() * 2, 1 + random() * 2 );

	}

	return toTexture( canvas );

}

export function sandTexture() {

	const size = 512;
	const canvas = makeCanvas( size, size );
	const ctx = canvas.getContext( '2d' );
	const random = mulberry32( 5591 );

	paintNoise( ctx, size, size, [ 235, 212, 170 ], 30, random );

	for ( let y = 0; y < size; y += 6 ) {

		ctx.strokeStyle = `rgba(255,244,218,${0.035 + random() * 0.04})`;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo( 0, y );

		for ( let x = 0; x <= size; x += 16 ) {

			ctx.lineTo( x, y + Math.sin( ( x + y ) * 0.035 ) * 2.2 );

		}

		ctx.stroke();

	}

	for ( let i = 0; i < 1400; i ++ ) {

		ctx.fillStyle = random() > 0.4 ? 'rgba(255,247,228,0.3)' : 'rgba(120,96,66,0.2)';
		ctx.beginPath();
		ctx.arc( random() * size, random() * size, 0.4 + random() * 1.1, 0, Math.PI * 2 );
		ctx.fill();

	}

	return toTexture( canvas );

}

export function urbanTexture() {

	const size = 512;
	const canvas = makeCanvas( size, size );
	const ctx = canvas.getContext( '2d' );
	const random = mulberry32( 3307 );

	paintNoise( ctx, size, size, [ 178, 164, 147 ], 16, random );

	const tile = 128;

	for ( let y = 0; y < size; y += tile ) {

		for ( let x = 0; x < size; x += tile ) {

			ctx.strokeStyle = 'rgba(104, 91, 77, 0.22)';
			ctx.lineWidth = 2;
			ctx.strokeRect( x, y, tile, tile );
			ctx.fillStyle = `rgba(255,250,240,${0.01 + random() * 0.03})`;
			ctx.fillRect( x + 2, y + 2, tile - 4, tile - 4 );

		}

	}

	for ( let i = 0; i < 500; i ++ ) {

		ctx.fillStyle = `rgba(90,76,62,${0.05 + random() * 0.08})`;
		ctx.fillRect( random() * size, random() * size, 1 + random() * 4, 1 + random() * 4 );

	}

	return toTexture( canvas );

}

export function grassTexture() {

	const size = 512;
	const canvas = makeCanvas( size, size );
	const ctx = canvas.getContext( '2d' );
	const random = mulberry32( 2024 );

	paintNoise( ctx, size, size, [ 67, 89, 48 ], 24, random );

	for ( let i = 0; i < 5000; i ++ ) {

		const x = random() * size;
		const y = random() * size;
		const h = 2 + random() * 5;
		ctx.strokeStyle = random() > 0.5 ? 'rgba(122,146,80,0.35)' : 'rgba(38,58,28,0.3)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo( x, y );
		ctx.lineTo( x + ( random() - 0.5 ) * 3, y - h );
		ctx.stroke();

	}

	return toTexture( canvas );

}

export function stoneTexture() {

	const size = 512;
	const canvas = makeCanvas( size, size );
	const ctx = canvas.getContext( '2d' );
	const random = mulberry32( 9137 );

	paintNoise( ctx, size, size, [ 214, 201, 181 ], 12, random );

	const rows = 8;
	const cols = 4;
	const h = size / rows;

	for ( let row = 0; row < rows; row ++ ) {

		const offset = row % 2 ? size / cols / 2 : 0;

		for ( let col = - 1; col <= cols; col ++ ) {

			const x = col * size / cols + offset;
			ctx.strokeStyle = 'rgba(118, 101, 82, 0.25)';
			ctx.lineWidth = 2;
			ctx.strokeRect( x, row * h, size / cols, h );

		}

	}

	return toTexture( canvas );

}

export function signTexture( text, {
	width = 1024,
	height = 256,
	font = '600 84px Outfit, Arial, sans-serif',
	color = '#f3e6d3',
	background = 'rgba(0,0,0,0)',
	letterSpacing = 8,
	tracking = 0.24
} = {} ) {

	const canvas = makeCanvas( width, height );
	const ctx = canvas.getContext( '2d' );
	ctx.clearRect( 0, 0, width, height );

	if ( background !== 'rgba(0,0,0,0)' ) {

		ctx.fillStyle = background;
		ctx.fillRect( 0, 0, width, height );

	}

	ctx.font = font;
	ctx.fillStyle = color;
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'center';

	const chars = [ ...text ];
	const widths = chars.map( c => ctx.measureText( c ).width );
	const total = widths.reduce( ( a, b ) => a + b, 0 ) + tracking * ( chars.length - 1 ) * 84;
	let x = ( width - total ) / 2;

	for ( let i = 0; i < chars.length; i ++ ) {

		ctx.fillText( chars[ i ], x + widths[ i ] / 2, height / 2 + 4 );
		x += widths[ i ] + tracking * 84;

	}

	// guía decorativa
	ctx.strokeStyle = 'rgba(243, 230, 211, 0.4)';
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo( width / 2 - 120, height - 22 );
	ctx.lineTo( width / 2 + 120, height - 22 );
	ctx.stroke();

	return toTexture( canvas );

}

export function glowTexture() {

	const size = 128;
	const canvas = makeCanvas( size, size );
	const ctx = canvas.getContext( '2d' );
	const gradient = ctx.createRadialGradient( size / 2, size / 2, 0, size / 2, size / 2, size / 2 );
	gradient.addColorStop( 0, 'rgba(255, 244, 226, 1)' );
	gradient.addColorStop( 0.25, 'rgba(255, 215, 170, 0.55)' );
	gradient.addColorStop( 0.7, 'rgba(255, 170, 110, 0.1)' );
	gradient.addColorStop( 1, 'rgba(255, 160, 100, 0)' );
	ctx.fillStyle = gradient;
	ctx.fillRect( 0, 0, size, size );
	const texture = new THREE.CanvasTexture( canvas );
	texture.colorSpace = THREE.SRGBColorSpace;
	return texture;

}

export function foamTexture() {

	const width = 512;
	const height = 128;
	const canvas = makeCanvas( width, height );
	const ctx = canvas.getContext( '2d' );
	const random = mulberry32( 404 );

	for ( let i = 0; i < 900; i ++ ) {

		const x = random() * width;
		const y = random() * height;
		const r = 1 + random() * 8;
		ctx.fillStyle = `rgba(255,255,255,${0.05 + random() * 0.35})`;
		ctx.beginPath();
		ctx.arc( x, y, r, 0, Math.PI * 2 );
		ctx.fill();

	}

	const gradient = ctx.createLinearGradient( 0, 0, 0, height );
	gradient.addColorStop( 0, 'rgba(0,0,0,0)' );
	gradient.addColorStop( 0.4, 'rgba(255,255,255,0.5)' );
	gradient.addColorStop( 1, 'rgba(0,0,0,0)' );
	ctx.globalCompositeOperation = 'destination-in';
	ctx.fillStyle = gradient;
	ctx.fillRect( 0, 0, width, height );

	const texture = new THREE.CanvasTexture( canvas );
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.ClampToEdgeWrapping;
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.anisotropy = maxAnisotropy;
	return texture;

}
