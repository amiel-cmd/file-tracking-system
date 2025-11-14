<?php
require_once dirname(__DIR__) . '/includes/session.php';

// Destroy all session data
session_destroy();
$_SESSION = array();

// Delete session cookie
if (isset($_COOKIE[session_name()])) {
    setcookie(session_name(), '', time() - 3600, '/');
}

// Redirect to login
header("Location: " . getUrl('login'));
exit();
?>
