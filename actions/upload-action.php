<?php
// Use absolute paths
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/includes/session.php';
require_once dirname(__DIR__) . '/includes/functions.php';

requireLogin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header("Location: " . getUrl('upload-document'));
    exit();
}

$user_id = getCurrentUserId();
$title = sanitize($_POST['title']);
$description = sanitize($_POST['description'] ?? '');
$document_type = sanitize($_POST['document_type']);
$priority = sanitize($_POST['priority']);

// Validate file
$errors = validateFile($_FILES['document_file']);

if (count($errors) > 0) {
    $_SESSION['error'] = implode('<br>', $errors);
    header("Location: " . getUrl('upload-document'));
    exit();
}

// Upload file
$filePath = uploadFile($_FILES['document_file']);

if (!$filePath) {
    $_SESSION['error'] = "Failed to upload file";
    header("Location: " . getUrl('upload-document'));
    exit();
}

// Database operations
$database = new Database();
$conn = $database->getConnection();

// Generate document number
$document_number = generateDocumentNumber();
$file_size = $_FILES['document_file']['size'];

// Insert document
$query = "INSERT INTO documents (document_number, title, description, document_type, 
          file_path, file_size, uploaded_by, current_holder, priority) 
          VALUES (:doc_num, :title, :desc, :doc_type, :file_path, :file_size, 
          :uploaded_by, :current_holder, :priority)";

$stmt = $conn->prepare($query);
$stmt->bindParam(':doc_num', $document_number);
$stmt->bindParam(':title', $title);
$stmt->bindParam(':desc', $description);
$stmt->bindParam(':doc_type', $document_type);
$stmt->bindParam(':file_path', $filePath);
$stmt->bindParam(':file_size', $file_size);
$stmt->bindParam(':uploaded_by', $user_id);
$stmt->bindParam(':current_holder', $user_id);
$stmt->bindParam(':priority', $priority);

if ($stmt->execute()) {
    $document_id = $conn->lastInsertId();
    
    // Log history
    logDocumentHistory($conn, $document_id, $user_id, 'Document Uploaded', 
                       "Document '$title' was uploaded");
    
    $_SESSION['success'] = "Document uploaded successfully! Document Number: $document_number";
    header("Location: " . getUrl('dashboard'));
} else {
    $_SESSION['error'] = "Failed to save document";
    header("Location: " . getUrl('upload-document'));
}

exit();
?>
