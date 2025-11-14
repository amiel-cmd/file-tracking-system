<?php
// Define the base URL
define('BASE_URL', '/file-tracking-system');

// Helper function to get absolute file path
function getPath($path) {
    return ROOT_PATH . $path;
}

// Helper function to get URL
function getUrl($path = '') {
    return BASE_URL . '/' . ltrim($path, '/');
}
?>
