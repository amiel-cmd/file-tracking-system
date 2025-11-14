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
$to_user_id = (int)$_POST['to_user_id'];
$action_taken = sanitize($_POST['action_taken']);
$remarks = sanitize($_POST['remarks'] ?? '');

// Validation
if (empty($document_id) || empty($to_user_id) || empty($action_taken)) {
    $_SESSION['error'] = "All required fields must be filled";
    header("Location: " . getUrl('dashboard'));
    exit();
}

$database = new Database();
$conn = $database->getConnection();

// Begin transaction
$conn->beginTransaction();

try {
    // Get current document holder
    $query = "SELECT current_holder, status FROM documents WHERE document_id = :document_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':document_id', $document_id);
    $stmt->execute();
    $document = $stmt->fetch();
    
    if (!$document) {
        throw new Exception("Document not found");
    }
    
    $from_user_id = $document['current_holder'];
    
    // Get user names for logging
    $query = "SELECT full_name FROM users WHERE user_id = :user_id";
    $stmt = $conn->prepare($query);
    
    // Get from user name
    $stmt->bindParam(':user_id', $from_user_id);
    $stmt->execute();
    $from_user = $stmt->fetch();
    $from_user_name = $from_user ? $from_user['full_name'] : 'Unknown User';
    
    // Get to user name
    $stmt->bindParam(':user_id', $to_user_id);
    $stmt->execute();
    $to_user = $stmt->fetch();
    $to_user_name = $to_user ? $to_user['full_name'] : 'Unknown User';
    
    // Set all previous routing records for this document as not current
    $query = "UPDATE document_routing 
              SET is_current = 0 
              WHERE document_id = :document_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':document_id', $document_id);
    $stmt->execute();
    
    // Insert new routing record with is_current = 1
    $is_current = 1;
    $query = "INSERT INTO document_routing (document_id, from_user_id, to_user_id, action_taken, remarks, routed_at, is_current) 
              VALUES (:document_id, :from_user_id, :to_user_id, :action_taken, :remarks, NOW(), :is_current)";
    
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':document_id', $document_id);
    $stmt->bindParam(':from_user_id', $from_user_id);
    $stmt->bindParam(':to_user_id', $to_user_id);
    $stmt->bindParam(':action_taken', $action_taken);
    $stmt->bindParam(':remarks', $remarks);
    $stmt->bindParam(':is_current', $is_current);
    $stmt->execute();
    
    // Update document current holder and status
    $new_status = ($action_taken === 'completed') ? 'completed' : 'in_progress';
    
    $query = "UPDATE documents 
              SET current_holder = :to_user_id, status = :status 
              WHERE document_id = :document_id";
    
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':to_user_id', $to_user_id);
    $stmt->bindParam(':status', $new_status);
    $stmt->bindParam(':document_id', $document_id);
    $stmt->execute();
    
    // Log history with user names
    $actionText = ucfirst($action_taken);
    $details = "Document routed from $from_user_name to $to_user_name. Remarks: $remarks";
    logDocumentHistory($conn, $document_id, $user_id, $actionText, $details);
    
    $conn->commit();
    
    $_SESSION['success'] = "Document routed successfully!";
    
} catch (Exception $e) {
    $conn->rollBack();
    $_SESSION['error'] = "Failed to route document: " . $e->getMessage();
}

header("Location: " . getUrl('dashboard'));
exit();
?>

