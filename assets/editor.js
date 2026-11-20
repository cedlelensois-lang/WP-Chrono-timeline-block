/**
 * Chrono Timeline Block — éditeur (sans étape de build).
 */
( function ( wp ) {
	'use strict';

	var registerBlockType = wp.blocks.registerBlockType;
	var createBlock = wp.blocks.createBlock;
	var el = wp.element.createElement;
	var Fragment = wp.element.Fragment;
	var __ = wp.i18n.__;
	var be = wp.blockEditor;
	var useBlockProps = be.useBlockProps;
	var useInnerBlocksProps = be.useInnerBlocksProps;
	var InspectorControls = be.InspectorControls;
	var BlockControls = be.BlockControls;
	var RichText = be.RichText;
	var MediaUpload = be.MediaUpload;
	var MediaUploadCheck = be.MediaUploadCheck;
	var c = wp.components;
	var useDispatch = wp.data.useDispatch;
	var useSelect = wp.data.useSelect;
	var useEffect = wp.element.useEffect;
	var useState = wp.element.useState;
	var registerBlockVariation = wp.blocks.registerBlockVariation;
	var sprintf = wp.i18n.sprintf;

	var TD = 'chrono-timeline-block';

	var ICONS = [
		'star-filled', 'flag', 'calendar-alt', 'clock', 'location', 'admin-home',
		'awards', 'heart', 'lightbulb', 'yes-alt', 'admin-users', 'groups',
		'businessperson', 'welcome-learn-more', 'book', 'portfolio', 'hammer', 'chart-line',
		'megaphone', 'camera', 'format-quote', 'airplane', 'car', 'pets'
	];

	// Thèmes : [slug, libellé, aperçu (ligne, point, carte)]
	var THEMES = [
		[ 'default', __( 'Default', TD ), [ '#d9dde3', '#3858e9', '#ffffff' ] ],
		[ 'minimal', __( 'Minimal', TD ), [ '#cfd4da', '#1e1e1e', 'transparent' ] ],
		[ 'classic', __( 'Classic', TD ), [ '#c3c8cf', '#2f6f4f', '#ffffff' ] ],
		[ 'modern', __( 'Modern', TD ), [ '#e3defc', '#7c4dff', '#f4f0ff' ] ],
		[ 'elegant', __( 'Elegant', TD ), [ '#dccbb0', '#b8935a', '#fffdf9' ] ],
		[ 'dark', __( 'Dark', TD ), [ '#3a4052', '#7c9cff', '#1e2230' ] ],
		[ 'bold', __( 'Bold', TD ), [ '#ffd2c2', '#ff5a36', '#ff5a36' ] ]
	];

	function plainText( v ) {
		return String( v || '' ).replace( /<[^>]*>/g, '' ).replace( /&nbsp;/g, ' ' ).trim();
	}

	// N'accepte que des liens http(s), mailto, tel, relatifs ou ancres.
	function safeUrl( url ) {
		url = String( url || '' ).trim();
		if ( ! url ) {
			return '';
		}
		if ( /^(https?:|mailto:|tel:)/i.test( url ) || /^[\/#?.]/.test( url ) ) {
			return url;
		}
		if ( /^[a-z][a-z0-9+.-]*:/i.test( url ) ) {
			return ''; // javascript:, data:, vbscript:…
		}
		return 'https://' + url; // « exemple.com » → « https://exemple.com »
	}

	var MONTHS = {
		jan: 1, janv: 1, january: 1, janvier: 1,
		feb: 2, fev: 2, fevr: 2, february: 2, fevrier: 2,
		mar: 3, march: 3, mars: 3,
		apr: 4, avr: 4, april: 4, avril: 4,
		may: 5, mai: 5,
		jun: 6, june: 6, juin: 6,
		jul: 7, july: 7, juil: 7, juillet: 7,
		aug: 8, august: 8, aou: 8, aout: 8,
		sep: 9, sept: 9, september: 9, septembre: 9,
		oct: 10, october: 10, octobre: 10,
		nov: 11, november: 11, novembre: 11,
		dec: 12, december: 12, decembre: 12
	};

	// Transforme « 20 mai 1906 », « May 20, 1906 », « 1906-05-20 », « 20/05/1906 » ou « 1906 »
	// en nombre triable (AAAAMMJJ). Renvoie null si aucune année n'est trouvée.
	function dateKey( raw ) {
		var s = plainText( raw ).toLowerCase();
		if ( s.normalize ) {
			s = s.normalize( 'NFD' ).replace( /[\u0300-\u036f]/g, '' );
		}
		if ( ! s ) {
			return null;
		}
		var m = s.match( /(?:^|[^\d])(\d{3,4})[-\/.](\d{1,2})(?:[-\/.](\d{1,2}))?(?!\d)/ );
		if ( m ) {
			return +m[ 1 ] * 10000 + Math.min( +m[ 2 ], 12 ) * 100 + ( +m[ 3 ] || 0 );
		}
		m = s.match( /(?:^|[^\d])(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{3,4})(?!\d)/ );
		if ( m ) {
			var d = +m[ 1 ], mo = +m[ 2 ];
			if ( mo > 12 && d <= 12 ) {
				var t = d; d = mo; mo = t;
			}
			return +m[ 3 ] * 10000 + Math.min( mo, 12 ) * 100 + Math.min( d, 31 );
		}
		var year = s.match( /(?:^|[^\d])(\d{3,4})(?!\d)/ );
		if ( ! year ) {
			return null;
		}
		var month = 0;
		( s.match( /[a-z]+/g ) || [] ).some( function ( w ) {
			if ( MONTHS[ w ] ) {
				month = MONTHS[ w ];
				return true;
			}
			return false;
		} );
		var day = 0;
		if ( month ) {
			var dm = s.match( /(?:^|[^\d])(\d{1,2})(?:er|st|nd|rd|th)?(?!\d)/ );
			if ( dm && +dm[ 1 ] >= 1 && +dm[ 1 ] <= 31 ) {
				day = +dm[ 1 ];
			}
		}
		return +year[ 1 ] * 10000 + month * 100 + day;
	}

	// Tri stable ; les événements sans date reconnue restent à la fin, dans leur ordre.
	function sortByDate( blocks, desc ) {
		var withKey = blocks.map( function ( b, i ) {
			return { block: b, key: dateKey( b.attributes.date ), index: i };
		} );
		withKey.sort( function ( x, y ) {
			if ( x.key === null || y.key === null ) {
				if ( x.key === y.key ) return x.index - y.index;
				return x.key === null ? 1 : -1;
			}
			if ( x.key !== y.key ) return desc ? y.key - x.key : x.key - y.key;
			return x.index - y.index;
		} );
		return {
			blocks: withKey.map( function ( w ) { return w.block; } ),
			undated: withKey.filter( function ( w ) { return w.key === null; } ).length
		};
	}

	// Exposé pour les tests automatisés.
	window.ctbEditorUtils = { dateKey: dateKey, sortByDate: sortByDate, safeUrl: safeUrl };

	/* ---------- Helpers ---------- */

	function useThemePalette() {
		if ( be.useSettings ) {
			var res = be.useSettings( 'color.palette' );
			return ( res && res[ 0 ] ) || [];
		}
		if ( be.useSetting ) {
			return be.useSetting( 'color.palette' ) || [];
		}
		return [];
	}

	function ColorControl( props ) {
		return el(
			'div',
			{ className: 'ctb-color-control' },
			el( 'p', { className: 'ctb-color-control__label' }, props.label ),
			el( c.ColorPalette, {
				colors: props.colors,
				value: props.value,
				onChange: props.onChange,
				clearable: true,
				enableAlpha: true
			} )
		);
	}

	function timelineClasses( a ) {
		var cls = [ 'ctb-timeline', 'ctb-layout-' + ( a.layout || 'both' ) ];
		if ( a.datePosition === 'inside' ) {
			cls.push( 'ctb-date-inside' );
		}
		if ( a.shadow === false ) {
			cls.push( 'ctb-no-shadow' );
		}
		// Classes ajoutées uniquement si l'option est active : markup v1.2 inchangé.
		if ( a.theme && a.theme !== 'default' ) {
			cls.push( 'ctb-theme-' + a.theme );
		}
		if ( a.verticalOnMobile && ( a.layout === 'horizontal' || a.layout === 'tabs' ) ) {
			cls.push( 'ctb-mobile-vertical' );
		}
		return cls.join( ' ' );
	}

	function timelineStyle( a ) {
		var s = {};
		if ( a.lineColor ) s[ '--ctb-line-color' ] = a.lineColor;
		if ( a.lineWidth ) s[ '--ctb-line-width' ] = a.lineWidth + 'px';
		if ( a.dotColor ) s[ '--ctb-dot-color' ] = a.dotColor;
		if ( a.dotSize ) s[ '--ctb-dot-size' ] = a.dotSize + 'px';
		if ( a.cardBg ) s[ '--ctb-card-bg' ] = a.cardBg;
		if ( a.cardText ) s[ '--ctb-card-text' ] = a.cardText;
		if ( a.titleColor ) s[ '--ctb-title-color' ] = a.titleColor;
		if ( a.dateColor ) s[ '--ctb-date-color' ] = a.dateColor;
		if ( a.radius !== undefined && a.radius !== null ) s[ '--ctb-radius' ] = a.radius + 'px';
		if ( a.gap !== undefined && a.gap !== null ) s[ '--ctb-gap' ] = a.gap + 'px';
		return s;
	}

	function itemClasses( a ) {
		return 'ctb-item ctb-item--' + ( a.markerType || 'dot' );
	}

	function itemStyle( a ) {
		return a.accentColor ? { '--ctb-accent': a.accentColor } : undefined;
	}

	function markerContent( a ) {
		if ( a.markerType === 'icon' && a.icon ) {
			return el( 'span', { className: 'dashicons dashicons-' + a.icon } );
		}
		if ( a.markerType === 'text' && a.markerText ) {
			return el( 'span', { className: 'ctb-item__marker-text' }, a.markerText );
		}
		return null;
	}

	// Markup identique à la v1.0 quand aucun lien n'est défini (pas de bloc invalide).
	function saveMedia( a ) {
		var img = el( 'img', {
			src: a.mediaUrl,
			alt: a.mediaAlt || '',
			loading: 'lazy',
			className: a.mediaId ? 'wp-image-' + a.mediaId : undefined
		} );
		var link = a.imageLink || 'none';
		var href = a.mediaFullUrl || a.mediaUrl;

		if ( link === 'lightbox' ) {
			img = el( 'a', {
				href: href,
				className: 'ctb-item__media-link',
				'data-ctb-lightbox': ''
			}, img );
		} else if ( link === 'file' ) {
			img = el( 'a', {
				href: href,
				className: 'ctb-item__media-link',
				target: '_blank',
				rel: 'noopener'
			}, img );
		}

		return el( 'figure', { className: 'ctb-item__media' }, img );
	}

	function URLField( props ) {
		var URLInput = be.URLInput;
		if ( URLInput ) {
			return el(
				'div',
				{ className: 'ctb-url-field' },
				el( 'p', { className: 'ctb-color-control__label' }, props.label ),
				el( URLInput, {
					value: props.value,
					onChange: props.onChange,
					__nextHasNoMarginBottom: true
				} )
			);
		}
		return el( c.TextControl, {
			label: props.label,
			type: 'url',
			value: props.value,
			onChange: props.onChange,
			__nextHasNoMarginBottom: true
		} );
	}

	function ThemePicker( props ) {
		return el(
			'div',
			{ className: 'ctb-theme-grid' },
			THEMES.map( function ( t ) {
				var active = ( props.value || 'default' ) === t[ 0 ];
				return el(
					'button',
					{
						key: t[ 0 ],
						type: 'button',
						className: 'ctb-theme-choice' + ( active ? ' is-active' : '' ),
						'aria-pressed': active,
						onClick: function () { props.onChange( t[ 0 ] ); }
					},
					el(
						'span',
						{ className: 'ctb-theme-choice__preview', 'aria-hidden': 'true' },
						el( 'span', { className: 'ctb-theme-choice__line', style: { background: t[ 2 ][ 0 ] } } ),
						el( 'span', { className: 'ctb-theme-choice__dot', style: { background: t[ 2 ][ 1 ] } } ),
						el( 'span', {
							className: 'ctb-theme-choice__card',
							style: { background: t[ 2 ][ 2 ], borderColor: t[ 2 ][ 1 ] }
						} )
					),
					el( 'span', { className: 'ctb-theme-choice__label' }, t[ 1 ] )
				);
			} )
		);
	}

	/* ---------- Bloc parent : Timeline ---------- */

	var TEMPLATE = [
		[ 'ctb/timeline-item', { date: '2018', title: __( 'The beginning', TD ), content: __( 'Describe the first step of your story here.', TD ) } ],
		[ 'ctb/timeline-item', { date: '2021', title: __( 'A key milestone', TD ), content: __( 'Add text, an image or an icon.', TD ) } ],
		[ 'ctb/timeline-item', { date: '2024', title: __( 'Today', TD ), content: __( 'Customize colors and layout in the sidebar.', TD ) } ]
	];

	registerBlockType( 'ctb/timeline', {
		edit: function ( props ) {
			var a = props.attributes;
			var set = props.setAttributes;
			var palette = useThemePalette();
			var editorActions = useDispatch( 'core/block-editor' );
			var insertBlock = editorActions.insertBlock;
			var noticeActions = useDispatch( 'core/notices' );

			var blockProps = useBlockProps( {
				className: timelineClasses( a ),
				style: timelineStyle( a )
			} );

			var innerProps = useInnerBlocksProps(
				{ className: 'ctb-timeline__items' },
				{
					allowedBlocks: [ 'ctb/timeline-item' ],
					template: TEMPLATE,
					orientation: a.layout === 'horizontal' ? 'horizontal' : 'vertical',
					renderAppender: false
				}
			);

			function addItem() {
				insertBlock( createBlock( 'ctb/timeline-item' ), undefined, props.clientId );
			}

			function sortEvents( desc ) {
				var result = sortByDate( children, desc );
				editorActions.replaceInnerBlocks( props.clientId, result.blocks, false );
				if ( noticeActions && noticeActions.createNotice ) {
					noticeActions.createNotice(
						'success',
						result.undated
							? __( 'Events sorted by date. Events without a recognizable date were placed at the end.', TD )
							: __( 'Events sorted by date.', TD ),
						{ type: 'snackbar', isDismissible: true }
					);
				}
			}

			/* --- Onglets : un événement visible à la fois dans l'éditeur --- */
			var isTabs = a.layout === 'tabs';
			var children = useSelect( function ( select ) {
				return select( 'core/block-editor' ).getBlocks( props.clientId );
			}, [ props.clientId ] );
			var selectedIndex = useSelect( function ( select ) {
				var store = select( 'core/block-editor' );
				var sel = store.getSelectedBlockClientId();
				if ( ! sel ) {
					return -1;
				}
				var chain = store.getBlockParents( sel ).concat( [ sel ] );
				var order = store.getBlockOrder( props.clientId );
				for ( var i = 0; i < chain.length; i++ ) {
					var idx = order.indexOf( chain[ i ] );
					if ( idx !== -1 ) {
						return idx;
					}
				}
				return -1;
			}, [ props.clientId ] );
			var tabState = useState( 0 );
			var activeTab = Math.min( tabState[ 0 ], Math.max( 0, children.length - 1 ) );
			var setActiveTab = tabState[ 1 ];

			useEffect( function () {
				if ( selectedIndex >= 0 ) {
					setActiveTab( selectedIndex );
				}
			}, [ selectedIndex ] );

			var tabsNav = null;
			var tabsStyle = null;
			if ( isTabs ) {
				tabsNav = el(
					'div',
					{ className: 'ctb-tabs__nav', role: 'tablist' },
					children.map( function ( b, i ) {
						var label = plainText( b.attributes.date ) || plainText( b.attributes.title ) || String( i + 1 );
						return el(
							'button',
							{
								key: b.clientId,
								type: 'button',
								role: 'tab',
								'aria-selected': i === activeTab,
								className: 'ctb-tabs__tab' + ( i === activeTab ? ' is-active' : '' ),
								style: b.attributes.accentColor ? { '--ctb-accent': b.attributes.accentColor } : undefined,
								onClick: function () { setActiveTab( i ); }
							},
							el( 'span', { className: 'ctb-tabs__dot', 'aria-hidden': 'true' } ),
							el( 'span', { className: 'ctb-tabs__label' }, label )
						);
					} )
				);
				tabsStyle = el(
					'style',
					null,
					'#block-' + props.clientId + ' > .ctb-timeline__items > .ctb-item:not(:nth-child(' + ( activeTab + 1 ) + ')){display:none!important}'
				);
			}

			return el(
				Fragment,
				null,
				el(
					InspectorControls,
					null,
					el(
						c.PanelBody,
						{ title: __( 'Theme', TD ), initialOpen: true },
						el( ThemePicker, { value: a.theme, onChange: function ( v ) { set( { theme: v } ); } } ),
						el( 'p', { className: 'ctb-help' }, __( 'Themes work with every layout. Colors set below override the theme.', TD ) )
					),
					el(
						c.PanelBody,
						{ title: __( 'Layout', TD ), initialOpen: true },
						el( c.SelectControl, {
							label: __( 'Layout style', TD ),
							value: a.layout,
							options: [
								{ label: __( 'Vertical — alternating (both sides)', TD ), value: 'both' },
								{ label: __( 'Vertical — line on the left', TD ), value: 'left' },
								{ label: __( 'Vertical — line on the right', TD ), value: 'right' },
								{ label: __( 'Horizontal (scrolling)', TD ), value: 'horizontal' },
								{ label: __( 'Tabs (one event at a time)', TD ), value: 'tabs' }
							],
							onChange: function ( v ) { set( { layout: v } ); },
							__nextHasNoMarginBottom: true
						} ),
						a.layout === 'horizontal'
							? el( 'div', { style: { marginTop: 16 } }, el( c.ToggleControl, {
								label: __( 'Show navigation arrows', TD ),
								help: __( 'Previous / next buttons above the timeline on the site.', TD ),
								checked: a.showArrows !== false,
								onChange: function ( v ) { set( { showArrows: v } ); },
								__nextHasNoMarginBottom: true
							} ) )
							: null,
						a.layout === 'horizontal' || a.layout === 'tabs'
							? el( 'div', { style: { marginTop: 16 } }, el( c.ToggleControl, {
								label: __( 'Switch to vertical on mobile', TD ),
								help: __( 'Dual orientation: horizontal on large screens, vertical on phones.', TD ),
								checked: !! a.verticalOnMobile,
								onChange: function ( v ) { set( { verticalOnMobile: v } ); },
								__nextHasNoMarginBottom: true
							} ) )
							: null,
						el( 'div', { style: { height: 16 } } ),
						el( c.SelectControl, {
							label: __( 'Date position', TD ),
							value: a.datePosition,
							options: [
								{ label: __( 'Opposite the card', TD ), value: 'opposite' },
								{ label: __( 'Above the card', TD ), value: 'inside' }
							],
							help: __( 'On mobile and in one-sided layouts, the date is shown above the card.', TD ),
							onChange: function ( v ) { set( { datePosition: v } ); },
							__nextHasNoMarginBottom: true
						} ),
						el( 'div', { style: { height: 16 } } ),
						el( c.ToggleControl, {
							label: __( 'Animate on scroll', TD ),
							checked: !! a.animate,
							onChange: function ( v ) { set( { animate: v } ); },
							__nextHasNoMarginBottom: true
						} ),
						el( c.ToggleControl, {
							label: __( 'Card shadow', TD ),
							checked: a.shadow !== false,
							onChange: function ( v ) { set( { shadow: v } ); },
							__nextHasNoMarginBottom: true
						} )
					),
					el(
						c.PanelBody,
						{ title: __( 'Sort by date', TD ), initialOpen: false },
						el( 'p', { className: 'ctb-help', style: { marginTop: 0 } }, __( 'Reorders the events using their date (e.g. 1906, 20 May 1906, 1906-05-20, 20/05/1906). You can undo with Ctrl+Z.', TD ) ),
						el(
							'div',
							{ className: 'ctb-sort-buttons' },
							el( c.Button, { variant: 'secondary', icon: 'arrow-down-alt', onClick: function () { sortEvents( false ); }, disabled: children.length < 2 }, __( 'Oldest first', TD ) ),
							el( c.Button, { variant: 'secondary', icon: 'arrow-up-alt', onClick: function () { sortEvents( true ); }, disabled: children.length < 2 }, __( 'Newest first', TD ) )
						)
					),
					el(
						c.PanelBody,
						{ title: __( 'Dimensions', TD ), initialOpen: false },
						el( c.RangeControl, {
							label: __( 'Line thickness (px)', TD ),
							value: a.lineWidth,
							min: 1, max: 12,
							allowReset: true,
							onChange: function ( v ) { set( { lineWidth: v } ); }
						} ),
						el( c.RangeControl, {
							label: __( 'Dot size (px)', TD ),
							value: a.dotSize,
							min: 10, max: 60,
							allowReset: true,
							onChange: function ( v ) { set( { dotSize: v } ); }
						} ),
						el( c.RangeControl, {
							label: __( 'Card corner radius (px)', TD ),
							value: a.radius,
							min: 0, max: 40,
							allowReset: true,
							onChange: function ( v ) { set( { radius: v } ); }
						} ),
						el( c.RangeControl, {
							label: __( 'Space between events (px)', TD ),
							value: a.gap,
							min: 0, max: 120,
							allowReset: true,
							onChange: function ( v ) { set( { gap: v } ); }
						} )
					),
					el(
						c.PanelBody,
						{ title: __( 'Colors', TD ), initialOpen: false },
						el( ColorControl, { label: __( 'Line', TD ), colors: palette, value: a.lineColor, onChange: function ( v ) { set( { lineColor: v } ); } } ),
						el( ColorControl, { label: __( 'Dots / icons', TD ), colors: palette, value: a.dotColor, onChange: function ( v ) { set( { dotColor: v } ); } } ),
						el( ColorControl, { label: __( 'Card background', TD ), colors: palette, value: a.cardBg, onChange: function ( v ) { set( { cardBg: v } ); } } ),
						el( ColorControl, { label: __( 'Card text', TD ), colors: palette, value: a.cardText, onChange: function ( v ) { set( { cardText: v } ); } } ),
						el( ColorControl, { label: __( 'Titles', TD ), colors: palette, value: a.titleColor, onChange: function ( v ) { set( { titleColor: v } ); } } ),
						el( ColorControl, { label: __( 'Dates', TD ), colors: palette, value: a.dateColor, onChange: function ( v ) { set( { dateColor: v } ); } } )
					)
				),
				el(
					'div',
					blockProps,
					tabsStyle,
					tabsNav,
					el( 'div', innerProps ),
					el(
						'div',
						{ className: 'ctb-timeline__add' },
						el( c.Button, { variant: 'secondary', icon: 'plus-alt2', onClick: addItem }, __( 'Add an event', TD ) )
					)
				)
			);
		},

		save: function ( props ) {
			var a = props.attributes;
			var blockProps = useBlockProps.save( {
				className: timelineClasses( a ),
				style: timelineStyle( a ),
				'data-ctb-animate': a.animate ? 'true' : undefined,
				'data-ctb-arrows': a.layout === 'horizontal' && a.showArrows === false ? 'false' : undefined
			} );
			// Le défilement horizontal est rendu focalisable par view.js :
			// « tabindex » est retiré par KSES pour les rôles sans unfiltered_html.
			var innerProps = useInnerBlocksProps.save( { className: 'ctb-timeline__items' } );
			return el( 'div', blockProps, el( 'div', innerProps ) );
		},

		deprecated: [
			{
				// v1.0 – v1.4 : tabindex enregistré dans le contenu (mode horizontal).
				save: function ( props ) {
					var a = props.attributes;
					var blockProps = useBlockProps.save( {
						className: timelineClasses( a ),
						style: timelineStyle( a ),
						'data-ctb-animate': a.animate ? 'true' : undefined
					} );
					var innerProps = useInnerBlocksProps.save( {
						className: 'ctb-timeline__items',
						tabIndex: a.layout === 'horizontal' ? 0 : undefined
					} );
					return el( 'div', blockProps, el( 'div', innerProps ) );
				}
			}
		]
	} );

	/* ---------- Bloc enfant : Événement ---------- */

	registerBlockType( 'ctb/timeline-item', {
		edit: function ( props ) {
			var a = props.attributes;
			var set = props.setAttributes;
			var palette = useThemePalette();

			var blockProps = useBlockProps( {
				className: itemClasses( a ),
				style: itemStyle( a )
			} );

			// Images ajoutées avant la v1.1 : on récupère l'URL en taille réelle.
			var fullMedia = useSelect( function ( select ) {
				if ( ! a.mediaId || a.mediaFullUrl ) {
					return null;
				}
				return select( 'core' ).getMedia( a.mediaId, { context: 'view' } );
			}, [ a.mediaId, a.mediaFullUrl ] );

			useEffect( function () {
				if ( fullMedia && fullMedia.source_url && ! a.mediaFullUrl ) {
					set( { mediaFullUrl: fullMedia.source_url } );
				}
			}, [ fullMedia ] );

			function onSelectMedia( media ) {
				var url = media.url;
				if ( media.sizes && media.sizes.large ) {
					url = media.sizes.large.url;
				}
				set( { mediaId: media.id, mediaUrl: url, mediaFullUrl: media.url, mediaAlt: media.alt || '' } );
			}

			function removeMedia() {
				set( { mediaId: undefined, mediaUrl: undefined, mediaFullUrl: undefined, mediaAlt: '' } );
			}

			return el(
				Fragment,
				null,
				el(
					BlockControls,
					null,
					el(
						MediaUploadCheck,
						null,
						el(
							c.ToolbarGroup,
							null,
							el( MediaUpload, {
								onSelect: onSelectMedia,
								allowedTypes: [ 'image' ],
								value: a.mediaId,
								render: function ( o ) {
									return el( c.ToolbarButton, {
										icon: 'format-image',
										label: a.mediaUrl ? __( 'Replace image', TD ) : __( 'Add an image', TD ),
										onClick: o.open
									} );
								}
							} ),
							a.mediaUrl
								? el( c.ToolbarButton, { icon: 'trash', label: __( 'Remove image', TD ), onClick: removeMedia } )
								: null
						)
					)
				),
				el(
					InspectorControls,
					null,
					el(
						c.PanelBody,
						{ title: __( 'Marker', TD ), initialOpen: true },
						el( c.SelectControl, {
							label: __( 'Marker type', TD ),
							value: a.markerType,
							options: [
								{ label: __( 'Dot', TD ), value: 'dot' },
								{ label: __( 'Icon', TD ), value: 'icon' },
								{ label: __( 'Text / number / emoji', TD ), value: 'text' }
							],
							onChange: function ( v ) { set( { markerType: v } ); },
							__nextHasNoMarginBottom: true
						} ),
						a.markerType === 'icon'
							? el(
								'div',
								{ className: 'ctb-icon-grid' },
								ICONS.map( function ( i ) {
									return el( c.Button, {
										key: i,
										icon: i,
										label: i,
										isPressed: a.icon === i,
										onClick: function () { set( { icon: i } ); }
									} );
								} )
							)
							: null,
						a.markerType === 'text'
							? el( c.TextControl, {
								label: __( 'Marker text', TD ),
								help: __( '1 to 3 characters recommended (e.g. 1, A, 🚀).', TD ),
								value: a.markerText,
								onChange: function ( v ) { set( { markerText: v } ); },
								__nextHasNoMarginBottom: true
							} )
							: null,
						el( 'div', { style: { height: 16 } } ),
						el( ColorControl, {
							label: __( 'Accent color for this event', TD ),
							colors: palette,
							value: a.accentColor,
							onChange: function ( v ) { set( { accentColor: v } ); }
						} )
					),
					el(
						c.PanelBody,
						{ title: __( 'Button / link', TD ), initialOpen: !! a.linkUrl },
						el( URLField, {
							label: __( 'Link URL', TD ),
							value: a.linkUrl || '',
							onChange: function ( v ) {
								var next = { linkUrl: v ? String( v ).trim() : undefined };
								if ( v && ! a.linkText ) {
									next.linkText = __( 'Read more', TD );
								}
								set( next );
							}
						} ),
						a.linkUrl && ! safeUrl( a.linkUrl )
							? el( c.Notice, { status: 'warning', isDismissible: false },
								__( 'This type of link is not allowed. Use an address starting with https://, mailto: or tel:.', TD ) )
							: null,
						a.linkUrl
							? el( 'div', { style: { marginTop: 16 } },
								el( c.TextControl, {
									label: __( 'Button text', TD ),
									value: a.linkText,
									onChange: function ( v ) { set( { linkText: v } ); },
									__nextHasNoMarginBottom: true
								} ),
								el( 'div', { style: { height: 16 } } ),
								el( c.ToggleControl, {
									label: __( 'Open in a new tab', TD ),
									checked: !! a.linkNewTab,
									onChange: function ( v ) { set( { linkNewTab: v } ); },
									__nextHasNoMarginBottom: true
								} ),
								el( c.Button, {
									variant: 'link',
									isDestructive: true,
									onClick: function () { set( { linkUrl: undefined, linkText: '', linkNewTab: false } ); }
								}, __( 'Remove button', TD ) )
							)
							: el( 'p', { className: 'ctb-help' }, __( 'Adds a "Read more" button to the card, e.g. to a page or a family record.', TD ) )
					),
					el(
						c.PanelBody,
						{ title: __( 'Image', TD ), initialOpen: false },
						el(
							MediaUploadCheck,
							null,
							el( MediaUpload, {
								onSelect: onSelectMedia,
								allowedTypes: [ 'image' ],
								value: a.mediaId,
								render: function ( o ) {
									return el(
										'div',
										null,
										a.mediaUrl ? el( 'img', { src: a.mediaUrl, alt: '', style: { width: '100%', marginBottom: 8 } } ) : null,
										el( c.Button, { variant: 'secondary', onClick: o.open }, a.mediaUrl ? __( 'Replace', TD ) : __( 'Choose an image', TD ) ),
										a.mediaUrl ? el( c.Button, { variant: 'link', isDestructive: true, onClick: removeMedia, style: { marginLeft: 8 } }, __( 'Remove', TD ) ) : null
									);
								}
							} )
						),
						a.mediaUrl
							? el( c.TextControl, {
								label: __( 'Alt text', TD ),
								value: a.mediaAlt,
								onChange: function ( v ) { set( { mediaAlt: v } ); },
								__nextHasNoMarginBottom: true
							} )
							: null,
						a.mediaUrl ? el( 'div', { style: { height: 16 } } ) : null,
						a.mediaUrl
							? el( c.SelectControl, {
								label: __( 'On image click', TD ),
								value: a.imageLink || 'none',
								options: [
									{ label: __( 'Do nothing', TD ), value: 'none' },
									{ label: __( 'Enlarge to full size (lightbox)', TD ), value: 'lightbox' },
									{ label: __( 'Open the image in a new tab', TD ), value: 'file' }
								],
								onChange: function ( v ) { set( { imageLink: v } ); },
								__nextHasNoMarginBottom: true
							} )
							: null
					)
				),
				el(
					'div',
					blockProps,
					el( 'div', { className: 'ctb-item__marker', 'aria-hidden': 'true' }, markerContent( a ) ),
					el( RichText, {
						tagName: 'div',
						className: 'ctb-item__date',
						value: a.date,
						onChange: function ( v ) { set( { date: v } ); },
						placeholder: __( 'Date…', TD ),
						allowedFormats: [ 'core/bold', 'core/italic' ]
					} ),
					el(
						'div',
						{ className: 'ctb-item__card' },
						a.mediaUrl
							? el( 'figure', { className: 'ctb-item__media' }, el( 'img', { src: a.mediaUrl, alt: a.mediaAlt } ) )
							: null,
						el( RichText, {
							tagName: 'h3',
							className: 'ctb-item__title',
							value: a.title,
							onChange: function ( v ) { set( { title: v } ); },
							placeholder: __( 'Event title…', TD )
						} ),
						el( RichText, {
							tagName: 'div',
							className: 'ctb-item__content',
							value: a.content,
							onChange: function ( v ) { set( { content: v } ); },
							placeholder: __( 'Description…', TD )
						} ),
						a.linkUrl
							? el(
								'div',
								{ className: 'ctb-item__more' },
								el( RichText, {
									tagName: 'span',
									className: 'ctb-item__button',
									value: a.linkText,
									onChange: function ( v ) { set( { linkText: v } ); },
									placeholder: __( 'Button text', TD ),
									allowedFormats: [],
									withoutInteractiveFormatting: true
								} )
							)
							: null
					)
				)
			);
		},

		save: function ( props ) {
			var a = props.attributes;
			var blockProps = useBlockProps.save( {
				className: itemClasses( a ),
				style: itemStyle( a )
			} );
			var R = RichText.Content;
			var hasDate = a.date && a.date.length;
			return el(
				'div',
				blockProps,
				el( 'div', { className: 'ctb-item__marker', 'aria-hidden': 'true' }, markerContent( a ) ),
				hasDate ? el( R, { tagName: 'div', className: 'ctb-item__date', value: a.date } ) : null,
				el(
					'div',
					{ className: 'ctb-item__card' },
					a.mediaUrl ? saveMedia( a ) : null,
					a.title ? el( R, { tagName: 'h3', className: 'ctb-item__title', value: a.title } ) : null,
					a.content ? el( R, { tagName: 'div', className: 'ctb-item__content', value: a.content } ) : null,
					// Ajouté seulement si un lien est défini : contenu des versions précédentes inchangé.
					a.linkUrl && safeUrl( a.linkUrl )
						? el(
							'div',
							{ className: 'ctb-item__more' },
							el( R, {
								tagName: 'a',
								className: 'ctb-item__button',
								href: safeUrl( a.linkUrl ),
								target: a.linkNewTab ? '_blank' : undefined,
								rel: a.linkNewTab ? 'noopener' : undefined,
								value: a.linkText || a.linkUrl
							} )
						)
						: null
					)
			);
		}
	} );
	/* ---------- Modèles (variations dans l'outil d'insertion) ---------- */

	if ( registerBlockVariation ) {
		[
			[ 'elegant-alternating', __( 'Timeline – Elegant, alternating', TD ), { layout: 'both', theme: 'elegant' } ],
			[ 'modern-left', __( 'Timeline – Modern, one side', TD ), { layout: 'left', theme: 'modern' } ],
			[ 'classic-right', __( 'Timeline – Classic, line on the right', TD ), { layout: 'right', theme: 'classic' } ],
			[ 'minimal-alternating', __( 'Timeline – Minimal, alternating', TD ), { layout: 'both', theme: 'minimal', shadow: false } ],
			[ 'dark-horizontal', __( 'Timeline – Dark, horizontal / vertical on mobile', TD ), { layout: 'horizontal', theme: 'dark', verticalOnMobile: true } ],
			[ 'bold-tabs', __( 'Timeline – Bold, tabs', TD ), { layout: 'tabs', theme: 'bold' } ],
			[ 'tabs-default', __( 'Timeline – Tabs', TD ), { layout: 'tabs' } ]
		].forEach( function ( v ) {
			registerBlockVariation( 'ctb/timeline', {
				name: v[ 0 ],
				title: v[ 1 ],
				description: __( 'Preconfigured timeline template.', TD ),
				icon: 'backup',
				attributes: v[ 2 ],
				scope: [ 'inserter' ]
			} );
		} );
	}
} )( window.wp );
