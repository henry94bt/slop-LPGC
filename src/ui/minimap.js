import { BRANDS } from '../config/city.js';

const EXTENT = 2500;
const STATIC_SIZE = 1400;
const STATIC_SCALE = STATIC_SIZE / ( EXTENT * 2 );

function pathPolygon( ctx, poly, close = true ) {

	ctx.beginPath();

	for ( let i = 0; i < poly.length; i ++ ) {

		const px = ( poly[ i ][ 0 ] + EXTENT ) * STATIC_SCALE;
		const py = ( poly[ i ][ 1 ] + EXTENT ) * STATIC_SCALE;
		if ( i === 0 ) ctx.moveTo( px, py );
		else ctx.lineTo( px, py );

	}

	if ( close ) ctx.closePath();

}

function drawLabel( ctx, text, x, z, color = 'rgba(245,235,220,0.72)' ) {

	ctx.save();
	ctx.fillStyle = color;
	ctx.font = '600 9px Arial, sans-serif';
	ctx.textAlign = 'center';
	const px = ( x + EXTENT ) * STATIC_SCALE;
	const py = ( z + EXTENT ) * STATIC_SCALE;
	const chars = [ ...text ];
	const width = chars.reduce( ( acc, c ) => acc + ctx.measureText( c ).width + 1.4, 0 );
	let cx = px - width / 2;

	for ( const c of chars ) {

		ctx.fillText( c, cx + ctx.measureText( c ).width / 2, py );
		cx += ctx.measureText( c ).width + 1.4;

	}

	ctx.restore();

}

function buildStaticMap( data, sites ) {

	const canvas = document.createElement( 'canvas' );
	canvas.width = STATIC_SIZE;
	canvas.height = STATIC_SIZE;
	const ctx = canvas.getContext( '2d' );

	ctx.fillStyle = '#081820';
	ctx.fillRect( 0, 0, STATIC_SIZE, STATIC_SIZE );

	// tierra
	pathPolygon( ctx, data.land );
	ctx.fillStyle = '#263230';
	ctx.fill();
	ctx.strokeStyle = 'rgba(89, 115, 112, 0.35)';
	ctx.lineWidth = 1;
	ctx.stroke();

	// playa
	for ( const poly of data.beach ) {

		pathPolygon( ctx, poly );
		ctx.fillStyle = '#a9946d';
		ctx.fill();

	}

	// parques
	ctx.fillStyle = '#3b513b';

	for ( const park of data.parks ) {

		pathPolygon( ctx, park.p );
		ctx.fill();

	}

	// edificios
	ctx.fillStyle = 'rgba(55, 68, 67, 0.86)';

	for ( const building of data.buildings ) {

		pathPolygon( ctx, building.p );
		ctx.fill();

	}

	// viario
	for ( const road of data.roads ) {

		const isPath = road.k === 'footway' || road.k === 'pedestrian' || road.k === 'steps' || road.k === 'cycleway';
		ctx.strokeStyle = isPath ? 'rgba(130, 116, 97, 0.6)' : 'rgba(122, 133, 128, 0.72)';
		ctx.lineWidth = road.k === 'primary' || road.k === 'secondary' ? 2 : ( isPath ? 0.55 : 0.9 );
		ctx.beginPath();

		for ( let i = 0; i < road.p.length; i ++ ) {

			const px = ( road.p[ i ][ 0 ] + EXTENT ) * STATIC_SCALE;
			const py = ( road.p[ i ][ 1 ] + EXTENT ) * STATIC_SCALE;
			if ( i === 0 ) ctx.moveTo( px, py );
			else ctx.lineTo( px, py );

		}

		ctx.stroke();

	}

	// paseo marítimo y costa
	if ( data.promenade.length ) {

		ctx.strokeStyle = '#d97857';
		ctx.lineWidth = 2.4;
		ctx.beginPath();

		for ( let i = 0; i < data.promenade.length; i ++ ) {

			const px = ( data.promenade[ i ][ 0 ] + EXTENT ) * STATIC_SCALE;
			const py = ( data.promenade[ i ][ 1 ] + EXTENT ) * STATIC_SCALE;
			if ( i === 0 ) ctx.moveTo( px, py );
			else ctx.lineTo( px, py );

		}

		ctx.stroke();

	}

	ctx.strokeStyle = 'rgba(93, 211, 224, 0.9)';
	ctx.lineWidth = 1.4;
	ctx.beginPath();

	for ( let i = 0; i < data.coast.length; i ++ ) {

		const px = ( data.coast[ i ][ 0 ] + EXTENT ) * STATIC_SCALE;
		const py = ( data.coast[ i ][ 1 ] + EXTENT ) * STATIC_SCALE;
		if ( i === 0 ) ctx.moveTo( px, py );
		else ctx.lineTo( px, py );

	}

	ctx.stroke();

	drawLabel( ctx, 'AUDITORIO', - 217, - 407 );
	drawLabel( ctx, 'LAS CANTERAS', 690, - 1480 );
	drawLabel( ctx, 'GUANARTEME', 130, - 250 );
	drawLabel( ctx, 'LA BARRA', 520, - 1385, 'rgba(140, 214, 220, 0.65)' );

	// vallas
	for ( const site of sites ) {

		const px = ( site.x + EXTENT ) * STATIC_SCALE;
		const py = ( site.z + EXTENT ) * STATIC_SCALE;
		ctx.fillStyle = `#${BRANDS[ site.brand ].accent.toString( 16 ).padStart( 6, '0' )}`;
		ctx.beginPath();
		ctx.arc( px, py, 2.3, 0, Math.PI * 2 );
		ctx.fill();

	}

	return canvas;

}

export function createMinimap( canvas, data, sites ) {

	const ctx = canvas.getContext( '2d' );
	const staticMap = buildStaticMap( data, sites );
	const width = canvas.width;
	const height = canvas.height;
	const viewWidth = 1040; // metros
	const scale = width / viewWidth;

	function worldToScreen( x, z, centerX, centerZ ) {

		return {
			x: width / 2 + ( x - centerX ) * scale,
			y: height / 2 + ( z - centerZ ) * scale
		};

	}

	function update( x, z, yaw, mode ) {

		ctx.clearRect( 0, 0, width, height );
		ctx.fillStyle = '#081820';
		ctx.fillRect( 0, 0, width, height );

		const sourceWidth = viewWidth * STATIC_SCALE;
		const sourceHeight = ( height / scale ) * STATIC_SCALE;
		const sx = ( x + EXTENT ) * STATIC_SCALE - sourceWidth / 2;
		const sy = ( z + EXTENT ) * STATIC_SCALE - sourceHeight / 2;

		ctx.drawImage(
			staticMap,
			sx, sy, sourceWidth, sourceHeight,
			0, 0, width, height
		);

		// viñeta
		const gradient = ctx.createRadialGradient( width / 2, height / 2, height * 0.3, width / 2, height / 2, height * 0.8 );
		gradient.addColorStop( 0, 'rgba(0,0,0,0)' );
		gradient.addColorStop( 1, 'rgba(0,0,0,0.45)' );
		ctx.fillStyle = gradient;
		ctx.fillRect( 0, 0, width, height );

		// vallas cercanas
		for ( const site of sites ) {

			const dx = site.x - x;
			const dz = site.z - z;
			if ( Math.abs( dx ) > viewWidth * 0.6 || Math.abs( dz ) > viewWidth * 0.6 ) continue;
			const point = worldToScreen( site.x, site.z, x, z );
			ctx.fillStyle = `#${BRANDS[ site.brand ].accent.toString( 16 ).padStart( 6, '0' )}`;
			ctx.beginPath();
			ctx.arc( point.x, point.y, 3.4, 0, Math.PI * 2 );
			ctx.fill();
			ctx.strokeStyle = 'rgba(0,0,0,0.55)';
			ctx.lineWidth = 1;
			ctx.stroke();

		}

		// barra de escala
		ctx.strokeStyle = 'rgba(240, 230, 214, 0.55)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo( 16, height - 16 );
		ctx.lineTo( 16 + 100 * scale, height - 16 );
		ctx.stroke();
		ctx.fillStyle = 'rgba(240, 230, 214, 0.55)';
		ctx.font = '9px Arial, sans-serif';
		ctx.fillText( '100 m', 16, height - 22 );

		// jugador
		ctx.save();
		ctx.translate( width / 2, height / 2 );
		ctx.rotate( - yaw );
		ctx.shadowColor = mode === 'kayak' ? 'rgba(93, 220, 224, 0.9)' : 'rgba(255, 190, 120, 0.9)';
		ctx.shadowBlur = 12;
		ctx.fillStyle = mode === 'kayak' ? '#8fe4e7' : '#ffd3a0';
		ctx.beginPath();
		ctx.moveTo( 0, - 9 );
		ctx.lineTo( 6, 7 );
		ctx.lineTo( 0, 4 );
		ctx.lineTo( - 6, 7 );
		ctx.closePath();
		ctx.fill();
		ctx.shadowBlur = 0;
		ctx.strokeStyle = 'rgba(10, 15, 16, 0.7)';
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.restore();

	}

	return { update, canvas, staticMap };
}
