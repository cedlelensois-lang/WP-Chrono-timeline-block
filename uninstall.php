<?php
/**
 * Nettoyage à la suppression du plugin.
 *
 * Les timelines restent dans le contenu des pages (HTML enregistré) :
 * seules les données techniques du plugin sont supprimées.
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

delete_site_transient( 'ctb_github_release' );
