function createNoiseBuffer( context, seconds = 4 ) {

	const length = context.sampleRate * seconds;
	const buffer = context.createBuffer( 1, length, context.sampleRate );
	const data = buffer.getChannelData( 0 );
	let last = 0;

	for ( let i = 0; i < length; i ++ ) {

		const white = Math.random() * 2 - 1;
		last = ( last + 0.012 * white ) / 1.012;
		data[ i ] = last * 3.2;

	}

	return buffer;

}

export function createAmbience() {

	let context = null;
	let master = null;
	let playing = false;
	let gullTimer = 0;

	function startNodes() {

		const noise = createNoiseBuffer( context, 5 );

		const surf = context.createBufferSource();
		surf.buffer = noise;
		surf.loop = true;

		const surfFilter = context.createBiquadFilter();
		surfFilter.type = 'lowpass';
		surfFilter.frequency.value = 820;
		surfFilter.Q.value = 0.3;

		const surfGain = context.createGain();
		surfGain.gain.value = 0.12;

		const lfo = context.createOscillator();
		lfo.type = 'sine';
		lfo.frequency.value = 0.085;
		const lfoGain = context.createGain();
		lfoGain.gain.value = 0.045;
		lfo.connect( lfoGain );
		lfoGain.connect( surfGain.gain );

		surf.connect( surfFilter );
		surfFilter.connect( surfGain );
		surfGain.connect( master );

		const deep = context.createBufferSource();
		deep.buffer = noise;
		deep.loop = true;
		deep.playbackRate.value = 0.55;

		const deepFilter = context.createBiquadFilter();
		deepFilter.type = 'lowpass';
		deepFilter.frequency.value = 210;

		const deepGain = context.createGain();
		deepGain.gain.value = 0.08;

		deep.connect( deepFilter );
		deepFilter.connect( deepGain );
		deepGain.connect( master );

		surf.start();
		deep.start();
		lfo.start();

		const chirp = () => {

			if ( ! playing ) return;

			const now = context.currentTime;
			const pan = context.createStereoPanner();
			pan.pan.value = Math.random() * 1.6 - 0.8;
			pan.connect( master );

			const count = 2 + Math.floor( Math.random() * 3 );

			for ( let i = 0; i < count; i ++ ) {

				const osc = context.createOscillator();
				const gain = context.createGain();
				const start = now + i * 0.11 + Math.random() * 0.05;
				const base = 1150 + Math.random() * 500;
				osc.type = 'triangle';
				osc.frequency.setValueAtTime( base, start );
				osc.frequency.exponentialRampToValueAtTime( base * 1.45, start + 0.045 );
				osc.frequency.exponentialRampToValueAtTime( base * 0.92, start + 0.13 );
				gain.gain.setValueAtTime( 0.0001, start );
				gain.gain.exponentialRampToValueAtTime( 0.035, start + 0.02 );
				gain.gain.exponentialRampToValueAtTime( 0.0001, start + 0.16 );
				osc.connect( gain );
				gain.connect( pan );
				osc.start( start );
				osc.stop( start + 0.2 );

			}

			gullTimer = window.setTimeout( chirp, 6000 + Math.random() * 11000 );

		};

		gullTimer = window.setTimeout( chirp, 3500 );

	}

	async function enable() {

		if ( ! context ) {

			context = new ( window.AudioContext || window.webkitAudioContext )();
			master = context.createGain();
			master.gain.value = 0;
			master.connect( context.destination );

		}

		if ( context.state === 'suspended' ) await context.resume();

		if ( ! playing ) {

			playing = true;
			startNodes();
			master.gain.cancelScheduledValues( context.currentTime );
			master.gain.setValueAtTime( master.gain.value, context.currentTime );
			master.gain.linearRampToValueAtTime( 0.55, context.currentTime + 2.2 );

		}

		return true;

	}

	function disable() {

		if ( ! context || ! playing ) return;

		playing = false;
		clearTimeout( gullTimer );
		master.gain.cancelScheduledValues( context.currentTime );
		master.gain.setValueAtTime( master.gain.value, context.currentTime );
		master.gain.linearRampToValueAtTime( 0, context.currentTime + 0.6 );

	}

	return {
		get enabled() {

			return playing;

		},
		async toggle() {

			if ( playing ) {

				disable();
				return false;

			}

			await enable();
			return true;

		}
	};

}
