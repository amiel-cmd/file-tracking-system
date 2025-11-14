<?php
// Use absolute paths
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/includes/session.php';
require_once dirname(__DIR__) . '/includes/functions.php';

requireLogin();

// Check if user is admin
$user = getCurrentUser();
if ($user['role'] !== 'admin') {
    $_SESSION['error'] = "Access denied. Admin privileges required.";
    header("Location: " . getUrl('dashboard'));
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header("Location: " . getUrl('admin'));
    exit();
}

$user_id = (int)$_POST['user_id'];

if (empty($user_id)) {
    $_SESSION['error'] = "User ID is required";
    header("Location: " . getUrl('admin'));
    exit();
}

$database = new Database();
$conn = $database->getConnection();

// Approve user (set is_active = 1)
$query = "UPDATE users SET is_active = 1 WHERE user_id = :user_id";

$stmt = $conn->prepare($query);
$stmt->bindParam(':user_id', $user_id);

if ($stmt->execute()) {
    $_SESSION['success'] = "User approved successfully!";
} else {
    $_SESSION['error'] = "Failed to approve user";
}

header("Location: " . getUrl('admin'));
exit();
?>

