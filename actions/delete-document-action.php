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

if (empty($document_id)) {
    $_SESSION['error'] = "Document ID is required";
    header("Location: " . getUrl('dashboard'));
    exit();
}

$database = new Database();
$conn = $database->getConnection();

// Check if user owns the document
$query = "SELECT uploaded_by, file_path, title FROM documents WHERE document_id = :document_id";
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
    $_SESSION['error'] = "You don't have permission to delete this document";
    header("Location: " . getUrl('dashboard'));
    exit();
}

// Begin transaction
$conn->beginTransaction();

try {
    // Delete file if exists
    if ($document['file_path'] && file_exists($document['file_path'])) {
        unlink($document['file_path']);
    }
    
    // Delete routing records
    $query = "DELETE FROM document_routing WHERE document_id = :document_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':document_id', $document_id);
    $stmt->execute();
    
    // Delete history records
    $query = "DELETE FROM document_history WHERE document_id = :document_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':document_id', $document_id);
    $stmt->execute();
    
    // Delete archived records if exists
    $query = "DELETE FROM archived_documents WHERE document_id = :document_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':document_id', $document_id);
    $stmt->execute();
    
    // Delete document
    $query = "DELETE FROM documents WHERE document_id = :document_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':document_id', $document_id);
    $stmt->execute();
    
    $conn->commit();
    
    $_SESSION['success'] = "Document deleted successfully!";
    
} catch (Exception $e) {
    $conn->rollBack();
    $_SESSION['error'] = "Failed to delete document: " . $e->getMessage();
}

header("Location: " . getUrl('dashboard'));
exit();
?>

