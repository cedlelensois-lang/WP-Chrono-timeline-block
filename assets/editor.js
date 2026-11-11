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

	var TD = 'chrono-timeline-block';

	var ICONS = [
		'star-filled', 'flag', 'calendar-alt', 'clock', 'location', 'admin-home',
		'awards', 'heart', 'lightbulb', 'yes-alt', 'admin-users', 'groups',
		'businessperson', 'welcome-learn-more', 'book', 'portfolio', 'hammer', 'chart-line',
		'megaphone', 'camera', 'format-quote', 'airplane', 'car', 'pets'
	];

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
			var insertBlock = useDispatch( 'core/block-editor' ).insertBlock;

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

			return el(
				Fragment,
				null,
				el(
					InspectorControls,
					null,
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
								{ label: __( 'Horizontal (scrolling)', TD ), value: 'horizontal' }
							],
							onChange: function ( v ) { set( { layout: v } ); },
							__nextHasNoMarginBottom: true
						} ),
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
				'data-ctb-animate': a.animate ? 'true' : undefined
			} );
			var innerProps = useInnerBlocksProps.save( {
				className: 'ctb-timeline__items',
				tabIndex: a.layout === 'horizontal' ? 0 : undefined
			} );
			return el( 'div', blockProps, el( 'div', innerProps ) );
		}
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
						} )
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
					a.content ? el( R, { tagName: 'div', className: 'ctb-item__content', value: a.content } ) : null
				)
			);
		}
	} );
} )( window.wp );
