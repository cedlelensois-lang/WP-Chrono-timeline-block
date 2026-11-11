/* Chrono Timeline Block — animation au défilement + lightbox des images */
( function () {
	'use strict';

	var hasIO = 'IntersectionObserver' in window;
	if ( hasIO ) {
		document.documentElement.classList.add( 'ctb-js' );
	}

	/* ---------- Animation ---------- */

	function initAnimation() {
		if ( ! hasIO ) {
			return;
		}
		var items = document.querySelectorAll( '.ctb-timeline[data-ctb-animate] .ctb-item' );
		if ( ! items.length ) {
			return;
		}
		var observer = new IntersectionObserver(
			function ( entries ) {
				entries.forEach( function ( entry ) {
					if ( entry.isIntersecting ) {
						entry.target.classList.add( 'ctb-is-visible' );
						observer.unobserve( entry.target );
					}
				} );
			},
			{ threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
		);
		items.forEach( function ( item ) {
			observer.observe( item );
		} );
	}

	/* ---------- Lightbox ---------- */

	var L = window.ctbL10n || {};
	function t( key, fallback ) {
		return L[ key ] || fallback;
	}

	var box, boxImg, boxCaption, btnPrev, btnNext, group = [], index = 0, lastFocus = null;

	function button( cls, label, html ) {
		var b = document.createElement( 'button' );
		b.type = 'button';
		b.className = 'ctb-lightbox__btn ' + cls;
		b.setAttribute( 'aria-label', label );
		b.innerHTML = html;
		return b;
	}

	function buildBox() {
		box = document.createElement( 'div' );
		box.className = 'ctb-lightbox';
		box.setAttribute( 'role', 'dialog' );
		box.setAttribute( 'aria-modal', 'true' );
		box.setAttribute( 'aria-label', t( 'dialog', 'Enlarged image' ) );
		box.hidden = true;

		var figure = document.createElement( 'figure' );
		figure.className = 'ctb-lightbox__figure';
		boxImg = document.createElement( 'img' );
		boxImg.className = 'ctb-lightbox__img';
		boxCaption = document.createElement( 'figcaption' );
		boxCaption.className = 'ctb-lightbox__caption';
		figure.appendChild( boxImg );
		figure.appendChild( boxCaption );

		var btnClose = button( 'ctb-lightbox__close', t( 'close', 'Close' ), '&times;' );
		btnPrev = button( 'ctb-lightbox__prev', t( 'previous', 'Previous image' ), '&#8249;' );
		btnNext = button( 'ctb-lightbox__next', t( 'next', 'Next image' ), '&#8250;' );

		box.appendChild( figure );
		box.appendChild( btnClose );
		box.appendChild( btnPrev );
		box.appendChild( btnNext );
		document.body.appendChild( box );

		btnClose.addEventListener( 'click', close );
		btnPrev.addEventListener( 'click', function () { show( index - 1 ); } );
		btnNext.addEventListener( 'click', function () { show( index + 1 ); } );
		box.addEventListener( 'click', function ( e ) {
			if ( e.target === box || e.target === figure ) {
				close();
			}
		} );
		document.addEventListener( 'keydown', function ( e ) {
			if ( box.hidden ) {
				return;
			}
			if ( e.key === 'Escape' ) close();
			else if ( e.key === 'ArrowLeft' ) show( index - 1 );
			else if ( e.key === 'ArrowRight' ) show( index + 1 );
			else if ( e.key === 'Tab' ) {
				// Garde le focus dans la lightbox
				var f = Array.prototype.filter.call( box.querySelectorAll( 'button' ), function ( b ) { return ! b.hidden; } );
				var i = f.indexOf( document.activeElement );
				e.preventDefault();
				f[ ( i + ( e.shiftKey ? -1 : 1 ) + f.length ) % f.length ].focus();
			}
		} );
	}

	function show( i ) {
		if ( ! group.length ) {
			return;
		}
		index = ( i + group.length ) % group.length;
		var link = group[ index ];
		var thumb = link.querySelector( 'img' );
		var alt = thumb ? thumb.getAttribute( 'alt' ) : '';
		boxImg.src = link.getAttribute( 'href' );
		boxImg.alt = alt || '';
		boxCaption.textContent = alt || '';
		boxCaption.hidden = ! alt;
		var multi = group.length > 1;
		btnPrev.hidden = ! multi;
		btnNext.hidden = ! multi;
	}

	function open( link ) {
		if ( ! box ) {
			buildBox();
		}
		var timeline = link.closest( '.ctb-timeline' );
		group = Array.prototype.slice.call(
			( timeline || document ).querySelectorAll( 'a[data-ctb-lightbox]' )
		);
		lastFocus = document.activeElement;
		show( group.indexOf( link ) );
		box.hidden = false;
		document.documentElement.classList.add( 'ctb-lightbox-open' );
		requestAnimationFrame( function () {
			box.classList.add( 'is-open' );
		} );
		box.querySelector( '.ctb-lightbox__close' ).focus();
	}

	function close() {
		box.classList.remove( 'is-open' );
		box.hidden = true;
		boxImg.removeAttribute( 'src' );
		document.documentElement.classList.remove( 'ctb-lightbox-open' );
		if ( lastFocus && lastFocus.focus ) {
			lastFocus.focus();
		}
	}

	function initLightbox() {
		document.addEventListener( 'click', function ( e ) {
			var link = e.target.closest && e.target.closest( 'a[data-ctb-lightbox]' );
			if ( ! link || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0 ) {
				return;
			}
			e.preventDefault();
			open( link );
		} );
	}

	function init() {
		initAnimation();
		initLightbox();
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
