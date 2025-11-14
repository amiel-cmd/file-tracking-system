<?php
// Use absolute paths
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/includes/session.php';
require_once dirname(__DIR__) . '/includes/functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header("Location: " . getUrl('login'));
    exit();
}

$username = sanitize($_POST['username']);
$password = $_POST['password'];

if (empty($username) || empty($password)) {
    $_SESSION['error'] = "Username and password are required";
    header("Location: " . getUrl('login'));
    exit();
}

$database = new Database();
$conn = $database->getConnection();

$query = "SELECT user_id, username, email, password, full_name, department, role, is_active 
          FROM users 
          WHERE (username = :username OR email = :username) 
          AND is_active = 1";

$stmt = $conn->prepare($query);
$stmt->bindParam(':username', $username);
$stmt->execute();

if ($stmt->rowCount() === 0) {
    $_SESSION['error'] = "Invalid credentials";
    header("Location: " . getUrl('login'));
    exit();
}

$user = $stmt->fetch();

if (!password_verify($password, $user['password'])) {
    $_SESSION['error'] = "Invalid credentials";
    header("Location: " . getUrl('login'));
    exit();
}

$_SESSION['user_id'] = $user['user_id'];
$_SESSION['username'] = $user['username'];
$_SESSION['full_name'] = $user['full_name'];
$_SESSION['role'] = $user['role'];
$_SESSION['department'] = $user['department'];

session_regenerate_id(true);

header("Location: " . getUrl('dashboard'));
exit();
?>
