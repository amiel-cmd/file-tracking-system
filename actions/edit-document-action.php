<?php
// Use absolute paths
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/includes/session.php';
require_once dirname(__DIR__) . '/includes/functions.php';

requireLogin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header("Location: " . getUrl('dashboard'));
    exit();
}

$user_id = getCurrentUserId();
$document_id = (int)$_POST['document_id'];
$title = sanitize($_POST['title']);
$description = sanitize($_POST['description'] ?? '');
$document_type = sanitize($_POST['document_type']);
$priority = sanitize($_POST['priority']);

// Validation
if (empty($document_id) || empty($title) || empty($document_type) || empty($priority)) {
    $_SESSION['error'] = "All required fields must be filled";
    header("Location: " . getUrl('dashboard'));
    exit();
}

$database = new Database();
$conn = $database->getConnection();

// Check if user owns the document
$query = "SELECT uploaded_by FROM documents WHERE document_id = :document_id";
$stmt = $conn->prepare($query);
$stmt->bindParam(':document_id', $document_id);
$stmt->execute();
$document = $stmt->fetch();

if (!$document) {
    $_SESSION['error'] = "Document not found";
    header("Location: " . getUrl('dashboard'));
    exit();
}

if ($document['uploaded_by'] != $user_id) {
    $_SESSION['error'] = "You don't have permission to edit this document";
    header("Location: " . getUrl('dashboard'));
    exit();
}

// Update document
$query = "UPDATE documents 
          SET title = :title, description = :description, document_type = :document_type, priority = :priority 
          WHERE document_id = :document_id";

$stmt = $conn->prepare($query);
$stmt->bindParam(':title', $title);
$stmt->bindParam(':description', $description);
$stmt->bindParam(':document_type', $document_type);
$stmt->bindParam(':priority', $priority);
$stmt->bindParam(':document_id', $document_id);

if ($stmt->execute()) {
    // Log history
    logDocumentHistory($conn, $document_id, $user_id, 'Document Updated', "Document '$title' was updated");
    
    $_SESSION['success'] = "Document updated successfully!";
} else {
    $_SESSION['error'] = "Failed to update document";
}

header("Location: " . getUrl('dashboard'));
exit();
?>

