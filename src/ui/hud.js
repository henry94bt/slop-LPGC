import { CITY } from '../config/city.js';
import { formatCoords } from '../utils/geo.js';

export function createHud( { onMode, onPlace, onLight, onSound } ) {

	const elements = {
		loading: document.getElementById( 'loading' ),
		loadProgress: document.getElementById( 'load-progress' ),
		loadStatus: document.getElementById( 'load-status' ),
		hint: document.getElementById( 'hint' ),
		zoneName: document.getElementById( 'zone-name' ),
		zoneQuality: document.getElementById( 'zone-quality' ),
		clock: document.getElementById( 'clock' ),
		clockSub: document.getElementById( 'clock-sub' ),
		lightLabel: document.getElementById( 'light-label' ),
		lightDot: document.getElementById( 'light-dot' ),
		lightBtn: document.getElementById( 'light-btn' ),
		soundBtn: document.getElementById( 'sound-btn' ),
		modeWalk: document.getElementById( 'mode-walk' ),
		modeKayak: document.getElementById( 'mode-kayak' ),
		controls: document.getElementById( 'controls' ),
		ctrlMod: document.getElementById( 'ctrl-mod' ),
		miniCoords: document.getElementById( 'mini-coords' ),
		miniSpeed: document.getElementById( 'mini-speed' ),
		toast: document.getElementById( 'toast' ),
		fallback: document.getElementById( 'fallback' ),
		fallbackDetail: document.getElementById( 'fallback-detail' )
	};

	let toastTimer = 0;
	let hintTimer = 0;
	let lastZone = '';
	let lastFps = 0;

	function setLoading( progress, message ) {

		if ( elements.loadProgress ) elements.loadProgress.style.width = `${Math.round( progress * 100 )}%`;
		if ( message && elements.loadStatus ) elements.loadStatus.textContent = message;

	}

	function hideLoading() {

		if ( elements.loading ) elements.loading.classList.add( 'is-loaded' );
		setTimeout( () => {

			if ( elements.loading ) elements.loading.style.display = 'none';

		}, 1400 );

	}

	function showError( message ) {

		if ( ! elements.fallback ) return;
		elements.fallback.hidden = false;
		if ( elements.fallbackDetail ) elements.fallbackDetail.textContent = message;
		if ( elements.loading ) elements.loading.style.display = 'none';

	}

	function bind() {

		elements.modeWalk.addEventListener( 'click', () => onMode?.( 'walk' ) );
		elements.modeKayak.addEventListener( 'click', () => onMode?.( 'kayak' ) );

		for ( const button of document.querySelectorAll( '[data-place]' ) ) {

			button.addEventListener( 'click', () => onPlace?.( button.dataset.place ) );

		}

		elements.lightBtn.addEventListener( 'click', () => onLight?.() );
		elements.soundBtn.addEventListener( 'click', () => onSound?.() );

		window.addEventListener( 'pointerdown', () => hideHint(), { once: true, passive: true } );
		window.addEventListener( 'keydown', () => hideHint(), { once: true } );

		if ( window.matchMedia( '(pointer: coarse)' ).matches ) {

			elements.hint.innerHTML = 'Desliza a la izquierda para moverte <span>·</span> a la derecha para mirar';

		}

		setTimeout( hideHint, 12000 );

	}

	function hideHint() {

		if ( ! elements.hint ) return;
		elements.hint.classList.add( 'is-hidden' );
		clearTimeout( hintTimer );

	}

	function setMode( mode ) {

		const kayak = mode === 'kayak';
		elements.modeWalk.classList.toggle( 'is-active', ! kayak );
		elements.modeKayak.classList.toggle( 'is-active', kayak );
		elements.ctrlMod.textContent = kayak ? 'acelerar' : 'correr';
		document.body.dataset.mode = mode;

	}

	function setPreset( preset ) {

		elements.lightLabel.textContent = preset.label;
		elements.clock.textContent = preset.clock;
		elements.clockSub.textContent = preset.sub;
		elements.lightDot.style.background = `#${preset.sun.color.toString( 16 ).padStart( 6, '0' )}`;
		elements.lightDot.style.boxShadow = `0 0 12px #${preset.sun.color.toString( 16 ).padStart( 6, '0' )}`;

	}

	function setZone( name ) {

		if ( name === lastZone ) return;
		lastZone = name;
		elements.zoneName.style.opacity = '0';
		setTimeout( () => {

			elements.zoneName.textContent = name;
			elements.zoneName.style.opacity = '1';

		}, 160 );

	}

	function setFps( fps ) {

		const rounded = Math.round( fps );
		if ( rounded === lastFps ) return;
		lastFps = rounded;
		elements.zoneQuality.textContent = `${rounded} FPS`;

	}

	function setTelemetry( x, z, speedKmh, mode ) {

		elements.miniCoords.textContent = formatCoords( x, z );
		elements.miniSpeed.textContent = `${speedKmh.toFixed( 1 )} km/h`;
		elements.miniSpeed.style.color = mode === 'kayak' ? 'rgba(150, 225, 232, 0.9)' : '';

	}

	function toast( message, duration = 3200 ) {

		elements.toast.textContent = message;
		elements.toast.classList.add( 'is-visible' );
		clearTimeout( toastTimer );
		toastTimer = setTimeout( () => elements.toast.classList.remove( 'is-visible' ), duration );

	}

	function setSound( enabled ) {

		elements.soundBtn.setAttribute( 'aria-pressed', enabled ? 'true' : 'false' );
		elements.soundBtn.title = enabled ? 'Silenciar sonido ambiente' : 'Activar sonido ambiente';

	}

	elements.modeWalk.addEventListener( 'click', () => hideHint() );
	elements.modeKayak.addEventListener( 'click', () => hideHint() );
	elements.soundBtn.addEventListener( 'click', () => hideHint() );

	return {
		elements,
		bind,
		setLoading,
		hideLoading,
		showError,
		setMode,
		setPreset,
		setZone,
		setFps,
		setTelemetry,
		toast,
		setSound,
		hideHint,
		city: CITY
	};

}
