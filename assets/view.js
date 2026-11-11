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
		var items = document.querySelectorAll( '.ctb-timeline[data-ctb-animate]:not(.ctb-layout-tabs) .ctb-item' );
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

	/* ---------- Onglets ---------- */

	var tabsCount = 0;

	function buildTabs( timeline ) {
		var list = timeline.querySelector( '.ctb-timeline__items' );
		if ( ! list || timeline.classList.contains( 'ctb-tabs-ready' ) ) {
			return;
		}
		var items = Array.prototype.filter.call( list.children, function ( n ) {
			return n.classList.contains( 'ctb-item' );
		} );
		if ( ! items.length ) {
			return;
		}

		var uid = 'ctb-tabs-' + ( ++tabsCount );
		var nav = document.createElement( 'div' );
		nav.className = 'ctb-tabs__nav';
		nav.setAttribute( 'role', 'tablist' );
		var tabs = [];

		function select( index, focus ) {
			tabs.forEach( function ( tab, i ) {
				var on = i === index;
				tab.classList.toggle( 'is-active', on );
				tab.setAttribute( 'aria-selected', on ? 'true' : 'false' );
				tab.tabIndex = on ? 0 : -1;
				items[ i ].classList.toggle( 'is-active', on );
			} );
			if ( focus ) {
				tabs[ index ].focus();
			}
			if ( tabs[ index ].scrollIntoView && nav.scrollWidth > nav.clientWidth ) {
				nav.scrollLeft = tabs[ index ].offsetLeft - ( nav.clientWidth - tabs[ index ].offsetWidth ) / 2;
			}
		}

		items.forEach( function ( item, i ) {
			var dateEl = item.querySelector( '.ctb-item__date' );
			var titleEl = item.querySelector( '.ctb-item__title' );
			var label = ( dateEl && dateEl.textContent.trim() ) || ( titleEl && titleEl.textContent.trim() ) || String( i + 1 );

			var tab = document.createElement( 'button' );
			tab.type = 'button';
			tab.className = 'ctb-tabs__tab';
			tab.id = uid + '-tab-' + i;
			tab.setAttribute( 'role', 'tab' );
			tab.setAttribute( 'aria-controls', uid + '-panel-' + i );
			var accent = item.style.getPropertyValue( '--ctb-accent' );
			if ( accent ) {
				tab.style.setProperty( '--ctb-accent', accent );
			}
			var dot = document.createElement( 'span' );
			dot.className = 'ctb-tabs__dot';
			dot.setAttribute( 'aria-hidden', 'true' );
			var text = document.createElement( 'span' );
			text.className = 'ctb-tabs__label';
			text.textContent = label;
			tab.appendChild( dot );
			tab.appendChild( text );
			tab.addEventListener( 'click', function () { select( i ); } );
			nav.appendChild( tab );
			tabs.push( tab );

			item.id = item.id || uid + '-panel-' + i;
			tab.setAttribute( 'aria-controls', item.id );
			item.setAttribute( 'role', 'tabpanel' );
			item.setAttribute( 'aria-labelledby', tab.id );
			item.tabIndex = 0;
		} );

		nav.addEventListener( 'keydown', function ( e ) {
			var current = tabs.indexOf( document.activeElement );
			if ( current === -1 ) {
				return;
			}
			var next = null;
			if ( e.key === 'ArrowRight' || e.key === 'ArrowDown' ) next = ( current + 1 ) % tabs.length;
			else if ( e.key === 'ArrowLeft' || e.key === 'ArrowUp' ) next = ( current - 1 + tabs.length ) % tabs.length;
			else if ( e.key === 'Home' ) next = 0;
			else if ( e.key === 'End' ) next = tabs.length - 1;
			if ( next !== null ) {
				e.preventDefault();
				select( next, true );
			}
		} );

		timeline.insertBefore( nav, list );
		timeline.classList.add( 'ctb-tabs-ready' );
		select( 0 );
	}

	function initTabs() {
		document.querySelectorAll( '.ctb-timeline.ctb-layout-tabs' ).forEach( buildTabs );
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
		initTabs();
		initAnimation();
		initLightbox();
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
