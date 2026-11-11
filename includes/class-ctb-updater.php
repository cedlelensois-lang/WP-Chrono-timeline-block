<?php
/**
 * Mises à jour automatiques depuis les releases GitHub.
 *
 * Utilise l'en-tête « Update URI » (WordPress 5.8+) : WordPress.org n'est jamais
 * interrogé pour ce plugin, et le filtre update_plugins_github.com fournit la
 * dernière release publiée sur GitHub.
 */

defined( 'ABSPATH' ) || exit;

class CTB_Updater {

	const REPO      = 'cedlelensois-lang/WP-Chrono-timeline-block';
	const CACHE_KEY = 'ctb_github_release';
	const CACHE_TTL = 21600; // 6 heures.

	private $file;
	private $basename;
	private $slug;
	private $version;

	public function __construct( $file, $version ) {
		$this->file     = $file;
		$this->basename = plugin_basename( $file );
		$this->slug     = dirname( $this->basename );
		$this->version  = $version;

		add_filter( 'update_plugins_github.com', array( $this, 'check_update' ), 10, 3 );
		add_filter( 'plugins_api', array( $this, 'plugin_info' ), 20, 3 );
		add_filter( 'upgrader_source_selection', array( $this, 'fix_source_dir' ), 10, 4 );
		add_action( 'upgrader_process_complete', array( $this, 'purge_cache' ), 10, 2 );
		add_filter( 'plugin_action_links_' . $this->basename, array( $this, 'action_links' ) );
		add_action( 'admin_init', array( $this, 'handle_manual_check' ) );
		add_action( 'admin_notices', array( $this, 'manual_check_notice' ) );
	}

	/**
	 * Dernière release GitHub (mise en cache).
	 *
	 * @return array|null
	 */
	private function get_release( $force = false ) {
		if ( ! $force ) {
			$cached = get_site_transient( self::CACHE_KEY );
			if ( false !== $cached ) {
				return $cached ? $cached : null;
			}
		}

		$response = wp_remote_get(
			'https://api.github.com/repos/' . self::REPO . '/releases/latest',
			array(
				'timeout' => 10,
				'headers' => array(
					'Accept'     => 'application/vnd.github+json',
					'User-Agent' => 'Chrono-Timeline-Block/' . $this->version,
				),
			)
		);

		if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
			// Échec (réseau, limite d'appels GitHub…) : on réessaiera dans une heure.
			set_site_transient( self::CACHE_KEY, 0, HOUR_IN_SECONDS );
			return null;
		}

		$data = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( empty( $data['tag_name'] ) ) {
			set_site_transient( self::CACHE_KEY, 0, HOUR_IN_SECONDS );
			return null;
		}

		// Priorité au zip du plugin joint à la release, sinon l'archive du code source.
		$package = isset( $data['zipball_url'] ) ? $data['zipball_url'] : '';
		if ( ! empty( $data['assets'] ) && is_array( $data['assets'] ) ) {
			foreach ( $data['assets'] as $asset ) {
				if ( isset( $asset['name'], $asset['browser_download_url'] ) && '.zip' === strtolower( substr( $asset['name'], -4 ) ) ) {
					$package = $asset['browser_download_url'];
					break;
				}
			}
		}

		$release = array(
			'version' => ltrim( $data['tag_name'], 'vV' ),
			'package' => $package,
			'url'     => isset( $data['html_url'] ) ? $data['html_url'] : 'https://github.com/' . self::REPO,
			'body'    => isset( $data['body'] ) ? (string) $data['body'] : '',
			'date'    => isset( $data['published_at'] ) ? $data['published_at'] : '',
		);

		set_site_transient( self::CACHE_KEY, $release, self::CACHE_TTL );
		return $release;
	}

	/**
	 * Fournit à WordPress la version disponible (filtre update_plugins_{hostname}).
	 */
	public function check_update( $update, $plugin_data, $plugin_file ) {
		if ( $plugin_file !== $this->basename ) {
			return $update;
		}

		$release = $this->get_release();
		if ( ! $release ) {
			return $update;
		}

		return array(
			'id'           => 'https://github.com/' . self::REPO,
			'slug'         => $this->slug,
			'version'      => $release['version'],
			'url'          => 'https://github.com/' . self::REPO,
			'package'      => $release['package'],
			'requires'     => '6.3',
			'requires_php' => '7.4',
		);
	}

	/**
	 * Fenêtre « Afficher les détails » dans la liste des extensions.
	 */
	public function plugin_info( $result, $action, $args ) {
		if ( 'plugin_information' !== $action || empty( $args->slug ) || $args->slug !== $this->slug ) {
			return $result;
		}

		$release = $this->get_release();
		$version = $release ? $release['version'] : $this->version;

		return (object) array(
			'name'          => 'WP Chrono timeline block',
			'slug'          => $this->slug,
			'version'       => $version,
			'author'        => 'Cédric',
			'homepage'      => 'https://github.com/' . self::REPO,
			'download_link' => $release ? $release['package'] : '',
			'requires'      => '6.3',
			'requires_php'  => '7.4',
			'last_updated'  => $release ? $release['date'] : '',
			'sections'      => array(
				'description' => '<p>' . esc_html__( 'Gutenberg block to build vertical (one-sided or alternating), horizontal or tabbed timelines, with themes, templates, icons, images, a lightbox and scroll animation.', 'chrono-timeline-block' ) . '</p>',
				'changelog'   => $release && '' !== trim( $release['body'] )
					? $this->markdown_to_html( $release['body'] )
					: '<p><a href="https://github.com/' . esc_attr( self::REPO ) . '/releases" target="_blank" rel="noopener">GitHub releases</a></p>',
			),
		);
	}

	/**
	 * Conversion Markdown minimale pour les notes de version.
	 */
	private function markdown_to_html( $md ) {
		$html    = '';
		$in_list = false;
		foreach ( preg_split( '/\r\n|\r|\n/', $md ) as $line ) {
			$line = trim( $line );
			if ( preg_match( '/^[-*]\s+(.*)$/', $line, $m ) ) {
				if ( ! $in_list ) {
					$html   .= '<ul>';
					$in_list = true;
				}
				$html .= '<li>' . $this->inline_md( $m[1] ) . '</li>';
				continue;
			}
			if ( $in_list ) {
				$html   .= '</ul>';
				$in_list = false;
			}
			if ( '' === $line ) {
				continue;
			}
			if ( preg_match( '/^#{1,6}\s+(.*)$/', $line, $m ) ) {
				$html .= '<h4>' . $this->inline_md( $m[1] ) . '</h4>';
			} else {
				$html .= '<p>' . $this->inline_md( $line ) . '</p>';
			}
		}
		if ( $in_list ) {
			$html .= '</ul>';
		}
		return $html;
	}

	private function inline_md( $text ) {
		$text = esc_html( $text );
		$text = preg_replace( '/\*\*(.+?)\*\*/', '<strong>$1</strong>', $text );
		$text = preg_replace( '/`(.+?)`/', '<code>$1</code>', $text );
		return $text;
	}

	/**
	 * Les archives GitHub contiennent un dossier au nom variable
	 * (ex. « cedlelensois-lang-WP-Chrono-timeline-block-a1b2c3d ») :
	 * on le renomme comme le dossier actuel pour que le plugin reste activé.
	 */
	public function fix_source_dir( $source, $remote_source, $upgrader, $hook_extra = array() ) {
		if ( empty( $hook_extra['plugin'] ) || $hook_extra['plugin'] !== $this->basename ) {
			return $source;
		}

		global $wp_filesystem;
		$target = trailingslashit( $remote_source ) . $this->slug . '/';

		if ( untrailingslashit( $source ) === untrailingslashit( $target ) ) {
			return $source;
		}

		if ( $wp_filesystem && $wp_filesystem->move( untrailingslashit( $source ), untrailingslashit( $target ), true ) ) {
			return $target;
		}

		return new WP_Error( 'ctb_rename_failed', __( 'Could not rename the update folder.', 'chrono-timeline-block' ) );
	}

	public function purge_cache( $upgrader, $options ) {
		if ( isset( $options['type'] ) && 'plugin' === $options['type'] ) {
			delete_site_transient( self::CACHE_KEY );
		}
	}

	/**
	 * Lien « Rechercher les mises à jour » sous le nom du plugin.
	 */
	public function action_links( $links ) {
		if ( current_user_can( 'update_plugins' ) ) {
			$url     = wp_nonce_url( admin_url( 'plugins.php?ctb_check_updates=1' ), 'ctb_check_updates' );
			$links[] = '<a href="' . esc_url( $url ) . '">' . esc_html__( 'Check for updates', 'chrono-timeline-block' ) . '</a>';
		}
		return $links;
	}

	public function handle_manual_check() {
		if ( empty( $_GET['ctb_check_updates'] ) || ! current_user_can( 'update_plugins' ) ) {
			return;
		}
		check_admin_referer( 'ctb_check_updates' );

		delete_site_transient( self::CACHE_KEY );
		$release = $this->get_release( true );
		delete_site_transient( 'update_plugins' );
		wp_update_plugins();

		if ( ! $release ) {
			$status = 'error';
		} elseif ( version_compare( $release['version'], $this->version, '>' ) ) {
			$status = 'available';
		} else {
			$status = 'latest';
		}

		wp_safe_redirect( add_query_arg( 'ctb_checked', $status, admin_url( 'plugins.php' ) ) );
		exit;
	}

	public function manual_check_notice() {
		if ( empty( $_GET['ctb_checked'] ) || ! current_user_can( 'update_plugins' ) ) {
			return;
		}
		$status = sanitize_key( wp_unslash( $_GET['ctb_checked'] ) );

		if ( 'available' === $status ) {
			$release = $this->get_release();
			$class   = 'notice-warning';
			/* translators: %s: version number */
			$message = sprintf( __( 'WP Chrono timeline block: version %s is available. Use the "Update now" link below.', 'chrono-timeline-block' ), $release ? $release['version'] : '' );
		} elseif ( 'latest' === $status ) {
			$class = 'notice-success';
			/* translators: %s: version number */
			$message = sprintf( __( 'WP Chrono timeline block is up to date (version %s).', 'chrono-timeline-block' ), $this->version );
		} else {
			$class   = 'notice-error';
			$message = __( 'WP Chrono timeline block: could not reach GitHub. Please try again later.', 'chrono-timeline-block' );
		}

		printf( '<div class="notice %s is-dismissible"><p>%s</p></div>', esc_attr( $class ), esc_html( $message ) );
	}
}
