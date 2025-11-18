<?php
require_once 'includes/session.php';

// Get the route from URL
$route = $_GET['route'] ?? '';
$route = trim($route, '/');

// If empty route, redirect based on login status
if (empty($route)) {
    if (isLoggedIn()) {
        $route = 'dashboard';
    } else {
        $route = 'login';
    }
}

// Define ALL routes
$routes = [
    // Public routes
    'login' => 'views/login.register.php',
    'register' => 'views/register.php',
    
    // Protected routes
    'dashboard' => 'views/dashboard.php',
    'upload-document' => 'views/upload-document.php',
    'document-history' => 'views/document-history.php',
    'archived-documents' => 'views/archived-documents.php',
    'archives' => 'views/archived-documents.php', // Alias for archives
    'admin' => 'views/admin.php',
    
    // Action routes
    'actions/login-action' => 'actions/login-action.php',
    'actions/register-action' => 'actions/register-action.php',
    'actions/logout-action' => 'actions/logout-action.php',
    'actions/upload-action' => 'actions/upload-action.php',
    'actions/edit-document-action' => 'actions/edit-document-action.php',
    'actions/delete-document-action' => 'actions/delete-document-action.php',
    'actions/route-action' => 'actions/route-action.php',
    'actions/archive-action' => 'actions/archive-action.php',
    'actions/approve-user-action' => 'actions/approve-user-action.php',
    'actions/deny-user-action' => 'actions/deny-user-action.php',
    'actions/view-file' => 'actions/view-file-action.php',
    
    // Shortcut action routes (without "actions/" prefix)
    'logout' => 'actions/logout-action.php',
    'logout-action' => 'actions/logout-action.php',
];

// Check if route exists
if (array_key_exists($route, $routes)) {
    $file = $routes[$route];
    
    // Check if file exists
    if (file_exists($file)) {
        require_once $file;
    } else {
        http_response_code(404);
        echo "<h1>404 - File Not Found</h1>";
        echo "<p>The file does not exist: <strong>$file</strong></p>";
        echo "<p>Please create this file or check the path.</p>";
        echo '<a href="' . getUrl('dashboard') . '">Go to Dashboard</a>';
    }
} else {
    // Route not found
    http_response_code(404);
    echo "<h1>404 - Route Not Found</h1>";
    echo "<p>The route '<strong>$route</strong>' is not defined.</p>";
    echo "<p>Available routes:</p>";
    echo "<ul>";
    foreach (array_keys($routes) as $r) {
        echo "<li><a href='" . getUrl($r) . "'>$r</a></li>";
    }
    echo "</ul>";
}
?>
