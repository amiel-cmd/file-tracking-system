<?php
// Define the base URL dynamically for Vercel deployment
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';

// Get base path from VERCEL_URL or construct from request
if (getenv('VERCEL_URL')) {
    $base_url = $protocol . '://' . getenv('VERCEL_URL');
} else {
    // For local development or custom domains
    $script_name = dirname($_SERVER['SCRIPT_NAME'] ?? '');
    $base_url = $protocol . '://' . $host . ($script_name !== '/' ? $script_name : '');
}

// Define BASE_URL constant
define('BASE_URL', $base_url);

// Helper function to get absolute file path
function getPath($path) {
    $root_path = getenv('VERCEL') ? '/var/task' : __DIR__ . '/..';
    return rtrim($root_path, '/') . '/' . ltrim($path, '/');
}

// Helper function to get URL
function getUrl($path = '') {
    $route = ltrim($path, '/');
    // If path doesn't start with http, use relative path for Vercel
    if (strpos($route, 'http') === 0) {
        return $route;
    }
    
    // Use query parameter routing for Vercel
    if (getenv('VERCEL')) {
        return BASE_URL . '/?route=' . urlencode($route);
    }
    
    return BASE_URL . '/' . $route;
}
?>
