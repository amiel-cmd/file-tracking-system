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
$archive_reason = sanitize($_POST['archive_reason'] ?? 'Archived by user');

$database = new Database();
$conn = $database->getConnection();

// Begin transaction
$conn->beginTransaction();

try {
    // Update document as archived
    $query = "UPDATE documents 
              SET is_archived = 1, status = 'archived', archived_at = NOW() 
              WHERE document_id = :document_id";
    
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':document_id', $document_id);
    $stmt->execute();
    
    // Insert archive record
    $query = "INSERT INTO archived_documents (document_id, archived_by, archive_reason) 
              VALUES (:document_id, :archived_by, :reason)";
    
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':document_id', $document_id);
    $stmt->bindParam(':archived_by', $user_id);
    $stmt->bindParam(':reason', $archive_reason);
    $stmt->execute();
    
    // Log history
    logDocumentHistory($conn, $document_id, $user_id, 'Document Archived', $archive_reason);
    
    $conn->commit();
    
    $_SESSION['success'] = "Document archived successfully!";
    
} catch (Exception $e) {
    $conn->rollBack();
    $_SESSION['error'] = "Failed to archive document: " . $e->getMessage();
}

header("Location: " . getUrl('dashboard'));
exit();
?>
