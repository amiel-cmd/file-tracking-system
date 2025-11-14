<?php
// Use absolute paths
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/includes/session.php';
require_once dirname(__DIR__) . '/includes/functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header("Location: " . getUrl('register'));
    exit();
}

$full_name = sanitize($_POST['full_name']);
$username = sanitize($_POST['username']);
$email = sanitize($_POST['email']);
$password = $_POST['password'];
$confirm_password = $_POST['confirm_password'];

// Validation
$errors = [];

if (empty($full_name) || empty($username) || empty($email) || empty($password)) {
    $errors[] = "All fields are required";
}

if ($password !== $confirm_password) {
    $errors[] = "Passwords do not match";
}

if (strlen($password) < 6) {
    $errors[] = "Password must be at least 6 characters";
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = "Invalid email format";
}

if (count($errors) > 0) {
    $_SESSION['error'] = implode('<br>', $errors);
    header("Location: " . getUrl('register'));
    exit();
}

// Database operations
$database = new Database();
$conn = $database->getConnection();

// Check if username exists
$query = "SELECT user_id FROM users WHERE username = :username";
$stmt = $conn->prepare($query);
$stmt->bindParam(':username', $username);
$stmt->execute();

if ($stmt->rowCount() > 0) {
    $_SESSION['error'] = "Username already exists";
    header("Location: " . getUrl('register'));
    exit();
}

// Check if email exists
$query = "SELECT user_id FROM users WHERE email = :email";
$stmt = $conn->prepare($query);
$stmt->bindParam(':email', $email);
$stmt->execute();

if ($stmt->rowCount() > 0) {
    $_SESSION['error'] = "Email already registered";
    header("Location: " . getUrl('register'));
    exit();
}

// Hash password
$hashed_password = password_hash($password, PASSWORD_DEFAULT);

// Insert new user with pending status (is_active = 0)
$query = "INSERT INTO users (username, email, password, full_name, role, is_active) 
          VALUES (:username, :email, :password, :full_name, 'staff', 0)";

$stmt = $conn->prepare($query);
$stmt->bindParam(':username', $username);
$stmt->bindParam(':email', $email);
$stmt->bindParam(':password', $hashed_password);
$stmt->bindParam(':full_name', $full_name);

if ($stmt->execute()) {
    $_SESSION['success'] = "Registration submitted! Your account is pending approval. You will be able to login once an admin approves your registration.";
    header("Location: " . getUrl('login'));
} else {
    $_SESSION['error'] = "Registration failed. Please try again.";
    header("Location: " . getUrl('register'));
}

exit();
?>
