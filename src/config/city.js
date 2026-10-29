/**
 * Perfil de la ciudad y dirección de arte.
 *
 * Solo hay una ciudad activa: Las Palmas de Gran Canaria. El centro está
 * fijado en Guanarteme, entre la playa de Las Canteras y el Auditorio
 * Alfredo Kraus (-15.4468, 28.1272).
 */

export const CITY_ID = 'las-palmas';

export const CITIES = {
	'las-palmas': {
		id: 'las-palmas',
		name: 'Las Palmas',
		fullName: 'Las Palmas de Gran Canaria',
		region: 'Gran Canaria · Islas Canarias',
		centroid: { lat: 28.1272, lon: -15.4468 },
		centerLabel: '28°07′38″ N · 15°26′48″ W',
		timezone: 'Atlantic/Canary',
		defaultLighting: 'golden-hour',
		worldRadius: 2350,
		spawn: {
			anchor: 'promenade',
			t: 0.18,
			offset: 0,
			eyeHeight: 1.72,
			lookAhead: 0.08,
			lookOffset: 0.45,
			pitch: - 0.02
		},
		kayak: {
			anchor: 'promenade',
			t: 0.47,
			offshore: 120,
			eyeHeight: 1.12
		},
		places: {
			auditorio: { mode: 'walk', anchor: 'auditorio', x: - 92, z: - 286, lookAt: [ - 217, - 333 ] },
			paseo: { mode: 'walk', anchor: 'promenade', t: 0.34, offset: 3 },
			barra: { mode: 'kayak', anchor: 'promenade', t: 0.5, offshore: 255 },
			guanarteme: { mode: 'walk', x: 585, z: - 250, lookAt: [ 585, - 700 ] }
		},
		zones: [
			{ id: 'auditorio', name: 'Auditorio Alfredo Kraus', x: - 217, z: - 333, radius: 150 },
			{ id: 'paseo', name: 'Paseo de Las Canteras', x: 520, z: - 1100, radius: 900 },
			{ id: 'canteras', name: 'Bahía de Las Canteras', x: 650, z: - 1500, radius: 900 },
			{ id: 'guanarteme', name: 'Guanarteme', x: 260, z: - 240, radius: 520 },
			{ id: 'mesa', name: 'Av. José Mesa y López', x: 880, z: - 640, radius: 420 }
		],
		landmark: {
			name: 'Auditorio Alfredo Kraus',
			x: - 217,
			z: - 333,
			yaw: - 0.52
		}
	}
};

export const CITY = CITIES[ CITY_ID ];

export const LIGHTING_PRESETS = {
	'golden-hour': {
		id: 'golden-hour',
		label: 'Golden hour',
		clock: '18:42',
		sub: 'Hora dorada',
		sun: { elevation: 7.5, azimuth: 310, color: 0xffb26a, intensity: 5.1 },
		hemi: { sky: 0xffd3ad, ground: 0x7a5843, intensity: 0.8 },
		fill: { color: 0x7f9dc9, intensity: 0.28, elevation: 24, azimuth: 120 },
		fog: { color: 0xe3a071, near: 340, far: 3800 },
		exposure: 1.1,
		sky: {
			top: 0x2c4a74,
			horizon: 0xffa86f,
			sun: 0xffd9a8,
			glow: 0xff8a4e,
			cloud: 0xffbd90,
			cloudShadow: 0x7f5c6c
		},
		ocean: {
			deep: 0x02141f,
			shallow: 0x073646,
			sparkle: 0xffc98c,
			foam: 0xfff1dd
		},
		bloom: 0.46,
		windows: { lit: 0.22, emissive: 0.6 },
		billboards: 0.38
	},
	'blue-hour': {
		id: 'blue-hour',
		label: 'Hora azul',
		clock: '20:07',
		sub: 'Última luz',
		sun: { elevation: - 2.4, azimuth: 302, color: 0xff9a78, intensity: 0.55 },
		hemi: { sky: 0x7d9cc4, ground: 0x252a34, intensity: 0.62 },
		fill: { color: 0x9db9d9, intensity: 0.3, elevation: 32, azimuth: 90 },
		fog: { color: 0x5c7293, near: 400, far: 3400 },
		exposure: 1.15,
		sky: {
			top: 0x142640,
			horizon: 0xa87578,
			sun: 0xffbd8d,
			glow: 0xc5746e,
			cloud: 0xb6838c,
			cloudShadow: 0x3f4259
		},
		ocean: {
			deep: 0x061a26,
			shallow: 0x143e50,
			sparkle: 0xffa684,
			foam: 0xd7e3ef
		},
		bloom: 0.7,
		windows: { lit: 0.42, emissive: 0.9 },
		billboards: 1.65
	},
	noche: {
		id: 'noche',
		label: 'Noche',
		clock: '22:14',
		sub: 'Brisa nocturna',
		sun: { elevation: 28, azimuth: 135, color: 0x9fb9df, intensity: 0.32 },
		hemi: { sky: 0x314a73, ground: 0x10131a, intensity: 0.28 },
		fill: { color: 0x5d7ba8, intensity: 0.14, elevation: 40, azimuth: 300 },
		fog: { color: 0x0e1b2a, near: 350, far: 2700 },
		exposure: 1.32,
		sky: {
			top: 0x040a15,
			horizon: 0x152938,
			sun: 0xbcd4ee,
			glow: 0x4c6b8f,
			cloud: 0x162638,
			cloudShadow: 0x050a11
		},
		ocean: {
			deep: 0x02080f,
			shallow: 0x0a2231,
			sparkle: 0xbcd7ee,
			foam: 0x9db4c6
		},
		bloom: 0.86,
		windows: { lit: 0.58, emissive: 1.15 },
		billboards: 2.1
	}
};

export const BRANDS = {
	pepa: {
		id: 'pepa',
		name: 'La Pepa Studio',
		tagline: 'Diseño y contenido · Las Palmas',
		texture: 'assets/pepa_logo.png',
		aspect: 2,
		accent: 0xff9dc4,
		light: 0xffa8c8
	},
	hbtdata: {
		id: 'hbtdata',
		name: 'HBTDATA',
		tagline: 'Datos de Canarias',
		texture: 'assets/hbtdata_logo.png',
		aspect: 2,
		accent: 0xffb36a,
		light: 0xffb06a
	},
	abretusobre: {
		id: 'abretusobre',
		name: 'AbretuSobre.es',
		tagline: 'Test de cromos',
		texture: 'assets/abretusobre_logo.png',
		aspect: 1280 / 672,
		accent: 0xc3a8ff,
		light: 0xb9a0ff
	}
};

/**
 * Vallas: dos por marca, repartidas entre el paseo marítimo y las avenidas
 * principales. Las anclas se resuelven contra la geometría real de la ciudad.
 */
export const BILLBOARD_SITES = [
	{ brand: 'pepa', anchor: 'promenade', t: 0.215, offset: - 4, width: 12, facing: 'path-back' },
	{ brand: 'hbtdata', anchor: 'promenade', t: 0.48, offset: - 4, width: 11.2, facing: 'path-back' },
	{ brand: 'abretusobre', anchor: 'promenade', t: 0.74, offset: - 4, width: 11.2, facing: 'path-back' },
	{ brand: 'hbtdata', anchor: 'street', street: 'Avenida José Mesa y López', t: 0.36, offset: 9.5, width: 10.5 },
	{ brand: 'pepa', anchor: 'street', street: 'Calle Fernando Guanarteme', t: 0.55, offset: 9, width: 10 },
	{ brand: 'abretusobre', anchor: 'street', street: 'Avenida José Mesa y López', t: 0.66, offset: 9.5, width: 10.5 }
];

export const WAYPOINTS = {
	// puntos de interés en coordenadas locales (metros desde Guanarteme)
	auditorio: { x: - 217, z: - 333 },
	laBarra: { x: 430, z: - 1380 }
};
