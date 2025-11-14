<?php
require_once dirname(__DIR__) . '/config/database.php';

// Sanitize input
function sanitize($data) {
    return htmlspecialchars(strip_tags(trim($data)));
}

// Generate unique document number
function generateDocumentNumber() {
    return 'DOC-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
}

// Log document history
function logDocumentHistory($conn, $document_id, $user_id, $action, $details = null) {
    $ip_address = $_SERVER['REMOTE_ADDR'] ?? null;
    
    $query = "INSERT INTO document_history (document_id, user_id, action, details, ip_address) 
              VALUES (:document_id, :user_id, :action, :details, :ip_address)";
    
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':document_id', $document_id);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->bindParam(':action', $action);
    $stmt->bindParam(':details', $details);
    $stmt->bindParam(':ip_address', $ip_address);
    
    return $stmt->execute();
}

// Get all users for routing
function getAllUsers($conn) {
    $query = "SELECT user_id, full_name, department, role 
              FROM users 
              WHERE is_active = 1 
              ORDER BY full_name ASC";
    
    $stmt = $conn->prepare($query);
    $stmt->execute();
    
    return $stmt->fetchAll();
}

// Get document routing history
function getDocumentRoutingHistory($conn, $document_id) {
    $query = "SELECT dr.*, 
              u_from.full_name as from_user, 
              u_from.department as from_dept,
              u_to.full_name as to_user,
              u_to.department as to_dept
              FROM document_routing dr
              LEFT JOIN users u_from ON dr.from_user_id = u_from.user_id
              LEFT JOIN users u_to ON dr.to_user_id = u_to.user_id
              WHERE dr.document_id = :document_id
              ORDER BY dr.routed_at DESC";
    
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':document_id', $document_id);
    $stmt->execute();
    
    return $stmt->fetchAll();
}

// Format file size
function formatFileSize($bytes) {
    if ($bytes >= 1073741824) {
        return number_format($bytes / 1073741824, 2) . ' GB';
    } elseif ($bytes >= 1048576) {
        return number_format($bytes / 1048576, 2) . ' MB';
    } elseif ($bytes >= 1024) {
        return number_format($bytes / 1024, 2) . ' KB';
    } else {
        return $bytes . ' bytes';
    }
}

// Get allowed file extensions
function getAllowedExtensions() {
    return ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'zip'];
}

// Validate file upload
function validateFile($file) {
    $errors = [];
    
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errors[] = "File upload error occurred";
        return $errors;
    }
    
    $allowed = getAllowedExtensions();
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    
    if (!in_array($extension, $allowed)) {
        $errors[] = "File type not allowed. Allowed types: " . implode(', ', $allowed);
    }
    
    $maxSize = 10 * 1024 * 1024; // 10MB
    if ($file['size'] > $maxSize) {
        $errors[] = "File size exceeds 10MB limit";
    }
    
    return $errors;
}

// Handle file upload
function uploadFile($file, $uploadDir = 'uploads/documents/') {
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $fileName = uniqid() . '_' . time() . '.' . $extension;
    $filePath = $uploadDir . $fileName;
    
    if (move_uploaded_file($file['tmp_name'], $filePath)) {
        return $filePath;
    }
    
    return false;
}

// Get document status badge
function getStatusBadge($status) {
    $badges = [
        'pending' => '<span class="status status--warning">Pending</span>',
        'in_progress' => '<span class="status status--info">In Progress</span>',
        'completed' => '<span class="status status--success">Completed</span>',
        'archived' => '<span class="status">Archived</span>'
    ];
    
    return $badges[$status] ?? '<span class="status">' . $status . '</span>';
}

// Get priority badge
function getPriorityBadge($priority) {
    $badges = [
        'low' => '<span class="status status--info">Low</span>',
        'medium' => '<span class="status status--warning">Medium</span>',
        'high' => '<span class="status status--error">High</span>',
        'urgent' => '<span class="status status--error">URGENT</span>'
    ];
    
    return $badges[$priority] ?? '<span class="status">' . $priority . '</span>';
}
?>
