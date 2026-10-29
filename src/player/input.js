export function createInput( canvas ) {

	const keys = new Set();
	const pressed = new Set();
	let dragging = false;
	let pointerId = null;
	let lastX = 0;
	let lastY = 0;
	let lookX = 0;
	let lookY = 0;
	let interacted = false;

	const blockedKeys = new Set( [ 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyK', 'KeyL', 'Space', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight' ] );

	function onKeyDown( event ) {

		if ( event.repeat ) return;

		if ( blockedKeys.has( event.code ) ) {

			if ( event.target === document.body || event.target === canvas ) event.preventDefault();

		}

		keys.add( event.code );
		pressed.add( event.code );
		interacted = true;

	}

	function onKeyUp( event ) {

		keys.delete( event.code );

	}

	function onPointerDown( event ) {

		if ( event.target !== canvas ) return;

		dragging = true;
		pointerId = event.pointerId;
		lastX = event.clientX;
		lastY = event.clientY;
		interacted = true;
		canvas.setPointerCapture?.( event.pointerId );

		if ( document.pointerLockElement !== canvas && event.pointerType !== 'touch' ) {

			canvas.requestPointerLock?.();

		}

	}

	function onPointerMove( event ) {

		if ( event.pointerType === 'touch' ) return;

		if ( document.pointerLockElement === canvas ) {

			lookX += event.movementX || 0;
			lookY += event.movementY || 0;
			return;

		}

		if ( ! dragging || event.pointerId !== pointerId ) return;

		lookX += event.clientX - lastX;
		lookY += event.clientY - lastY;
		lastX = event.clientX;
		lastY = event.clientY;

	}

	function onPointerUp( event ) {

		if ( event.pointerId !== pointerId ) return;
		dragging = false;
		pointerId = null;

	}

	function onBlur() {

		keys.clear();
		dragging = false;

	}

	window.addEventListener( 'keydown', onKeyDown, { passive: false } );
	window.addEventListener( 'keyup', onKeyUp );
	canvas.addEventListener( 'pointerdown', onPointerDown );
	canvas.addEventListener( 'pointermove', onPointerMove );
	canvas.addEventListener( 'pointerup', onPointerUp );
	canvas.addEventListener( 'pointercancel', onPointerUp );
	canvas.addEventListener( 'contextmenu', event => event.preventDefault() );
	window.addEventListener( 'blur', onBlur );

	// táctil: un dedo en la mitad derecha mira; en la izquierda, un joystick mínimo
	let touchLook = null;
	let touchMove = null;
	let moveX = 0;
	let moveY = 0;

	canvas.addEventListener( 'pointerdown', event => {

		if ( event.pointerType !== 'touch' ) return;
		if ( event.clientX < window.innerWidth * 0.42 ) {

			touchMove = { id: event.pointerId, x: event.clientX, y: event.clientY };

		} else {

			touchLook = { id: event.pointerId, x: event.clientX, y: event.clientY };

		}

	}, { passive: true } );

	canvas.addEventListener( 'pointermove', event => {

		if ( event.pointerType !== 'touch' ) return;

		if ( touchLook && event.pointerId === touchLook.id ) {

			lookX += ( event.clientX - touchLook.x ) * 1.4;
			lookY += ( event.clientY - touchLook.y ) * 1.4;
			touchLook.x = event.clientX;
			touchLook.y = event.clientY;

		}

		if ( touchMove && event.pointerId === touchMove.id ) {

			const dx = event.clientX - touchMove.x;
			const dy = event.clientY - touchMove.y;
			moveX = Math.max( - 1, Math.min( 1, dx / 60 ) );
			moveY = Math.max( - 1, Math.min( 1, - dy / 60 ) );

		}

	}, { passive: true } );

	function touchEnd( event ) {

		if ( touchLook && event.pointerId === touchLook.id ) touchLook = null;
		if ( touchMove && event.pointerId === touchMove.id ) {

			touchMove = null;
			moveX = 0;
			moveY = 0;

		}

	}

	canvas.addEventListener( 'pointerup', touchEnd, { passive: true } );
	canvas.addEventListener( 'pointercancel', touchEnd, { passive: true } );

	function consumeLook() {

		const result = { x: lookX, y: lookY };
		lookX = 0;
		lookY = 0;
		return result;

	}

	function consumePress( code ) {

		if ( ! pressed.has( code ) ) return false;
		pressed.delete( code );
		return true;

	}

	return {
		keys,
		isDown( code ) {

			return keys.has( code );

		},
		consumePress,
		consumeLook,
		getMoveAxis() {

			let x = ( keys.has( 'KeyD' ) ? 1 : 0 ) - ( keys.has( 'KeyA' ) ? 1 : 0 );
			let y = ( keys.has( 'KeyW' ) ? 1 : 0 ) - ( keys.has( 'KeyS' ) ? 1 : 0 );

			if ( Math.abs( moveX ) > 0.08 ) x = moveX;
			if ( Math.abs( moveY ) > 0.08 ) y = moveY;

			return { x, y };

		},
		get hasInteracted() {

			return interacted;

		},
		get touchActive() {

			return touchMove !== null || touchLook !== null;

		}
	};

}
