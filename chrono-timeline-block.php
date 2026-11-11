<?php
/**
 * Plugin Name:       Chrono Timeline Block
 * Description:       Gutenberg block to build vertical timelines — one-sided or alternating — or horizontal ones, with icons, images, colors, a lightbox and scroll animation.
 * Version:           1.2.0
 * Requires at least: 6.3
 * Requires PHP:      7.4
 * Author:            Cédric
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       chrono-timeline-block
 * Domain Path:       /languages
 */

defined( 'ABSPATH' ) || exit;

define( 'CTB_VERSION', '1.2.0' );

add_action( 'init', 'ctb_register_blocks' );

function ctb_register_blocks() {
	// Traductions fournies avec le plugin (doit précéder l'enregistrement des blocs).
	load_plugin_textdomain( 'chrono-timeline-block', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );

	$url = plugin_dir_url( __FILE__ );
	$dir = plugin_dir_path( __FILE__ );

	wp_register_script(
		'ctb-editor',
		$url . 'assets/editor.js',
		array( 'wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-i18n', 'wp-data', 'wp-core-data' ),
		CTB_VERSION,
		true
	);

	wp_register_style( 'ctb-style', $url . 'assets/style.css', array( 'dashicons' ), CTB_VERSION );
	wp_register_style( 'ctb-editor-style', $url . 'assets/editor.css', array(), CTB_VERSION );

	wp_register_script(
		'ctb-view',
		$url . 'assets/view.js',
		array(),
		CTB_VERSION,
		array( 'in_footer' => false, 'strategy' => 'defer' )
	);

	wp_localize_script(
		'ctb-view',
		'ctbL10n',
		array(
			'dialog'   => __( 'Enlarged image', 'chrono-timeline-block' ),
			'close'    => __( 'Close', 'chrono-timeline-block' ),
			'previous' => __( 'Previous image', 'chrono-timeline-block' ),
			'next'     => __( 'Next image', 'chrono-timeline-block' ),
		)
	);

	register_block_type( $dir . 'blocks/timeline' );
	register_block_type( $dir . 'blocks/timeline-item' );

	wp_set_script_translations( 'ctb-editor', 'chrono-timeline-block', $dir . 'languages' );
}
