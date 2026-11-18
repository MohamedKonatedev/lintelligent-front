<?php
/**
 * Plugin Name: L'Intelligent TV — rôle sync YouTube
 * Description: Rôle « Sync YouTube » (yt_sync) pour le compte youtube-sync. Création des vidéos, champs ACF et miniatures uniquement.
 *
 * À copier tel quel dans wp-content/mu-plugins/yt-sync-role.php.
 * Must-use : aucun bouton d'activation. Ne modifie aucune publication à l'installation.
 *
 * Le CPT `videos` n'expose pas ses capacités dans l'API publique. S'il réutilise
 * celles des articles, WordPress exige les primitives edit_posts et publish_posts
 * pour créer une vidéo. Ce fichier les accorde, puis les enferme :
 * - REST limité aux routes de lecture et de création des videos, au téléversement
 *   des médias et à GET /users/me ;
 * - attribution d'une catégorie déjà existante à une vidéo nouvellement créée ;
 * - aucune création, modification ou suppression de catégorie ;
 * - aucune mise à jour d'une vidéo existante ;
 * - aucun autre type (articles, pages, emissions, live, programmation) ;
 * - suppression limitée à ses propres fichiers, pour retirer une miniature orpheline ;
 * - pas d'administration, de XML-RPC, d'options, d'utilisateurs, de commentaires
 *   ni de HTML non filtré.
 *
 * @package LIntelligentTV
 */

if (!defined('ABSPATH')) {
    exit;
}

const LINTELLIGENT_YT_SYNC_ROLE = 'yt_sync';

/**
 * Capacités stockées sur le rôle. Toute capacité absente de cette liste est retirée.
 *
 * @return array<string, bool>
 */
function lintelligent_yt_sync_caps() {
    return array(
        'read' => true,
        'upload_files' => true,
        'edit_posts' => true,
        'publish_posts' => true,
        'edit_video' => true,
        'edit_videos' => true,
        'publish_video' => true,
        'publish_videos' => true,
        'create_videos' => true,
    );
}

/**
 * Vrai seulement si cet utilisateur a le rôle sync et aucun rôle éditorial.
 *
 * @param int $user_id Utilisateur concerné par le contrôle de capacité.
 */
function lintelligent_is_yt_sync_only($user_id) {
    static $checking = false;

    $user_id = (int) $user_id;
    if ($user_id <= 0 || $checking) {
        return false;
    }

    $checking = true;
    $user = get_userdata($user_id);
    $checking = false;

    if (!$user instanceof WP_User) {
        return false;
    }

    $roles = (array) $user->roles;
    if (!in_array(LINTELLIGENT_YT_SYNC_ROLE, $roles, true)) {
        return false;
    }

    foreach (array('administrator', 'editor', 'author', 'contributor') as $privileged) {
        if (in_array($privileged, $roles, true)) {
            return false;
        }
    }

    return true;
}

/**
 * Crée le rôle ou retire les capacités qui ne sont plus voulues.
 */
function lintelligent_yt_sync_register_role() {
    $caps = lintelligent_yt_sync_caps();
    $role = get_role(LINTELLIGENT_YT_SYNC_ROLE);

    if (!$role instanceof WP_Role) {
        add_role(LINTELLIGENT_YT_SYNC_ROLE, 'Sync YouTube', $caps);
        return;
    }

    $allowed = array_keys($caps);
    foreach (array_keys($role->capabilities) as $existing) {
        if (!in_array($existing, $allowed, true)) {
            $role->remove_cap($existing);
        }
    }
    foreach ($allowed as $cap) {
        $role->add_cap($cap);
    }
}
add_action('init', 'lintelligent_yt_sync_register_role');

/**
 * @param string[] $caps    Capacités primitives exigées.
 * @param string   $cap     Capacité demandée.
 * @param int      $user_id Utilisateur.
 * @param mixed[]  $args    Arguments, souvent l'ID du contenu.
 * @return string[]
 */
function lintelligent_yt_sync_map_meta_cap($caps, $cap, $user_id, $args) {
    if (!lintelligent_is_yt_sync_only($user_id)) {
        return $caps;
    }

    $denied = array(
        'manage_options',
        'unfiltered_html',
        'edit_theme_options',
        'update_core',
        'install_plugins',
        'activate_plugins',
        'update_plugins',
        'delete_plugins',
        'edit_plugins',
        'install_themes',
        'edit_themes',
        'update_themes',
        'delete_themes',
        'edit_users',
        'create_users',
        'delete_users',
        'list_users',
        'promote_users',
        'remove_users',
        'manage_categories',
        'edit_pages',
        'publish_pages',
        'delete_pages',
        'edit_page',
        'publish_page',
        'delete_page',
        'moderate_comments',
        'edit_others_posts',
        'edit_others_pages',
        'edit_others_videos',
        'edit_published_posts',
        'edit_published_videos',
        'edit_published_video',
        'edit_private_posts',
        'read_private_posts',
        'read_private_videos',
        'delete_posts',
        'delete_others_posts',
        'delete_published_posts',
        'delete_private_posts',
        'delete_videos',
        'delete_video',
        'delete_others_videos',
        'delete_published_videos',
        'edit_term',
        'delete_term',
        'manage_terms',
    );
    if ($cap === 'assign_term') {
        $term_id = (!empty($args[0]) && is_numeric($args[0])) ? (int) $args[0] : 0;
        $term = $term_id > 0 ? get_term($term_id) : null;
        if ($term instanceof WP_Term && $term->taxonomy === 'category') {
            return array('read');
        }
        return array('do_not_allow');
    }
    if (in_array($cap, $denied, true)) {
        return array('do_not_allow');
    }

    $post_id = (!empty($args[0]) && is_numeric($args[0])) ? (int) $args[0] : 0;
    $post = $post_id > 0 ? get_post($post_id) : null;

    if ($post instanceof WP_Post) {
        if ($post->post_type === 'attachment') {
            if ((int) $post->post_author !== (int) $user_id) {
                return array('do_not_allow');
            }
            if ($cap === 'delete_post') {
                return array('upload_files');
            }
            if ($cap === 'edit_post') {
                return array('upload_files');
            }
            return array('do_not_allow');
        }

        if ($post->post_type !== 'videos') {
            return array('do_not_allow');
        }
        if (
            strpos($cap, 'delete_') === 0
            || in_array($cap, array('edit_post', 'edit_video', 'publish_post', 'publish_video'), true)
        ) {
            return array('do_not_allow');
        }
        if ($post->post_status !== 'publish' && in_array($cap, array('read_post', 'read_video'), true)) {
            return array('do_not_allow');
        }
    }

    return $caps;
}
add_filter('map_meta_cap', 'lintelligent_yt_sync_map_meta_cap', 10, 4);

/**
 * Empêche l'insertion ou la mise à jour d'un contenu hors vidéos et fichiers.
 *
 * @param bool    $maybe_empty Contenu considéré vide par WordPress.
 * @param mixed[] $postarr     Données proposées.
 */
function lintelligent_yt_sync_block_foreign_writes($maybe_empty, $postarr) {
    if (!lintelligent_is_yt_sync_only(get_current_user_id())) {
        return $maybe_empty;
    }

    $type = isset($postarr['post_type']) ? (string) $postarr['post_type'] : 'post';
    $post_id = isset($postarr['ID']) ? (int) $postarr['ID'] : 0;

    if ($post_id > 0) {
        $existing = get_post($post_id);
        if ($existing instanceof WP_Post && $existing->post_type === 'videos') {
            return true;
        }
    }

    if (!in_array($type, array('videos', 'attachment', 'revision'), true)) {
        return true;
    }

    return $maybe_empty;
}
add_filter('wp_insert_post_empty_content', 'lintelligent_yt_sync_block_foreign_writes', 10, 2);

/**
 * @param mixed           $result  Réponse déjà prête.
 * @param WP_REST_Server  $server  Serveur REST.
 * @param WP_REST_Request $request Requête.
 * @return mixed
 */
function lintelligent_yt_sync_rest_allowlist($result, $server, $request) {
    unset($server);
    if (!lintelligent_is_yt_sync_only(get_current_user_id())) {
        return $result;
    }

    $route = (string) $request->get_route();
    $method = strtoupper((string) $request->get_method());
    $allowed = false;

    if ($route === '/wp/v2/videos' && in_array($method, array('GET', 'POST', 'OPTIONS'), true)) {
        $allowed = true;
    }
    if (preg_match('#^/wp/v2/videos/[0-9]+$#', $route) && in_array($method, array('GET', 'OPTIONS'), true)) {
        $allowed = true;
    }
    if ($route === '/wp/v2/media' && in_array($method, array('POST', 'OPTIONS'), true)) {
        $allowed = true;
    }
    if (preg_match('#^/wp/v2/media/[0-9]+$#', $route) && in_array($method, array('POST', 'DELETE'), true)) {
        $allowed = true;
    }
    if ($route === '/wp/v2/users/me' && $method === 'GET') {
        $allowed = true;
    }

    if ($allowed) {
        return $result;
    }

    return new WP_Error(
        'lintelligent_yt_sync_forbidden',
        'Ce compte ne peut créer que des vidéos et leurs miniatures.',
        array('status' => 403)
    );
}
add_filter('rest_pre_dispatch', 'lintelligent_yt_sync_rest_allowlist', 10, 3);

/**
 * Bloque une mise à jour REST d'une vidéo déjà créée.
 *
 * @param stdClass        $prepared Vidéo préparée.
 * @param WP_REST_Request $request  Requête.
 * @return stdClass|WP_Error
 */
function lintelligent_yt_sync_block_video_update($prepared, $request) {
    if (!lintelligent_is_yt_sync_only(get_current_user_id())) {
        return $prepared;
    }
    if ((int) $request->get_param('id') > 0) {
        return new WP_Error(
            'lintelligent_yt_sync_no_update',
            'Ce compte ne modifie pas les vidéos existantes.',
            array('status' => 403)
        );
    }
    return $prepared;
}
add_filter('rest_pre_insert_videos', 'lintelligent_yt_sync_block_video_update', 10, 2);

/**
 * La liste REST reste limitée aux vidéos publiques, même si status=any est demandé.
 * Les brouillons de la rédaction ne sont pas exposés. Les créations de ce compte
 * restent dédoublonnées par le fichier d'état du script.
 *
 * @param mixed[]         $args    Arguments WP_Query.
 * @param WP_REST_Request $request Requête.
 * @return mixed[]
 */
function lintelligent_yt_sync_public_videos_only($args, $request) {
    unset($request);
    if (!lintelligent_is_yt_sync_only(get_current_user_id())) {
        return $args;
    }
    $args['post_status'] = 'publish';
    return $args;
}
add_filter('rest_videos_query', 'lintelligent_yt_sync_public_videos_only', 10, 2);

/**
 * @param bool $enabled XML-RPC actif.
 */
function lintelligent_yt_sync_disable_xmlrpc($enabled) {
    if (lintelligent_is_yt_sync_only(get_current_user_id())) {
        return false;
    }
    return $enabled;
}
add_filter('xmlrpc_enabled', 'lintelligent_yt_sync_disable_xmlrpc');

/**
 * Le compte de synchro n'ouvre pas wp-admin. Un administrateur crée le mot de passe
 * d'application depuis la fiche de l'utilisateur.
 */
function lintelligent_yt_sync_block_admin() {
    if (!lintelligent_is_yt_sync_only(get_current_user_id())) {
        return;
    }
    wp_die(
        'Ce compte n’a pas accès à l’administration.',
        'Accès refusé',
        array('response' => 403)
    );
}
add_action('admin_init', 'lintelligent_yt_sync_block_admin');

/**
 * @param bool $show Barre d'administration.
 */
function lintelligent_yt_sync_hide_admin_bar($show) {
    if (lintelligent_is_yt_sync_only(get_current_user_id())) {
        return false;
    }
    return $show;
}
add_filter('show_admin_bar', 'lintelligent_yt_sync_hide_admin_bar');
