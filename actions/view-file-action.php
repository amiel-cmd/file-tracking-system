<?php
// Use absolute paths
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/includes/session.php';
require_once dirname(__DIR__) . '/includes/functions.php';

requireLogin();

$document_id = (int)($_GET['id'] ?? 0);

if (empty($document_id)) {
    http_response_code(400);
    die("Document ID is required");
}

$database = new Database();
$conn = $database->getConnection();

// Get document file path
$query = "SELECT file_path, title FROM documents WHERE document_id = :document_id";
$stmt = $conn->prepare($query);
$stmt->bindParam(':document_id', $document_id);
$stmt->execute();
$document = $stmt->fetch();

if (!$document || !$document['file_path']) {
    http_response_code(404);
    die("Document not found");
}

$filePath = $document['file_path'];

// Check if file exists
if (!file_exists($filePath)) {
    http_response_code(404);
    die("File not found on server");
}

// Get file info
$fileName = basename($filePath);
$fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
$mimeTypes = [
    'pdf' => 'application/pdf',
    'doc' => 'application/msword',
    'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls' => 'application/vnd.ms-excel',
    'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png' => 'image/png',
    'zip' => 'application/zip'
];

$mimeType = $mimeTypes[$fileExtension] ?? 'application/octet-stream';

// Set headers for file download/view
header('Content-Type: ' . $mimeType);
header('Content-Disposition: inline; filename="' . htmlspecialchars($document['title']) . '.' . $fileExtension . '"');
header('Content-Length: ' . filesize($filePath));
header('Cache-Control: private, max-age=0, must-revalidate');
header('Pragma: public');

// Output file
readfile($filePath);
exit();
?>

