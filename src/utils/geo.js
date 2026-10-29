import { CITY } from '../config/city.js';

const M_PER_DEG_LAT = 110574;
const M_PER_DEG_LON = 111320 * Math.cos( CITY.centroid.lat * Math.PI / 180 );

export function localToLatLon( x, z ) {

	return {
		lat: CITY.centroid.lat - z / M_PER_DEG_LAT,
		lon: CITY.centroid.lon + x / M_PER_DEG_LON
	};

}

export function latLonToLocal( lat, lon ) {

	return {
		x: ( lon - CITY.centroid.lon ) * M_PER_DEG_LON,
		z: ( CITY.centroid.lat - lat ) * M_PER_DEG_LAT
	};

}

export function formatCoords( x, z ) {

	const { lat, lon } = localToLatLon( x, z );
	return `${lat.toFixed( 4 )}, ${lon.toFixed( 4 )}`;

}

export const toRadians = degrees => degrees * Math.PI / 180;
export const toDegrees = radians => radians * 180 / Math.PI;

export function clamp( value, min, max ) {

	return Math.max( min, Math.min( max, value ) );

}

export function lerp( a, b, t ) {

	return a + ( b - a ) * t;

}

export function damp( current, target, lambda, dt ) {

	return lerp( current, target, 1 - Math.exp( - lambda * dt ) );

}

export function shortestAngle( from, to ) {

	let delta = ( to - from ) % ( Math.PI * 2 );
	if ( delta > Math.PI ) delta -= Math.PI * 2;
	if ( delta < - Math.PI ) delta += Math.PI * 2;
	return delta;

}

/** Dirección de vista (three.js) a partir de yaw/pitch. */
export function forwardFromYawPitch( yaw, pitch, target = { x: 0, y: 0, z: 0 } ) {

	const cosPitch = Math.cos( pitch );
	target.x = - Math.sin( yaw ) * cosPitch;
	target.y = Math.sin( pitch );
	target.z = - Math.cos( yaw ) * cosPitch;
	return target;

}

/** Yaw que mira desde un punto hacia otro. */
export function yawTowards( fromX, fromZ, toX, toZ ) {

	return Math.atan2( - ( toX - fromX ), - ( toZ - fromZ ) );

}
