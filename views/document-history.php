<?php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/includes/session.php';
require_once dirname(__DIR__) . '/includes/functions.php';

requireLogin();

$user = getCurrentUser();

$document_id = (int)($_GET['id'] ?? 0);

$database = new Database();
$conn = $database->getConnection();

// Get document details
$query = "SELECT d.*, u.full_name as uploader 
          FROM documents d
          LEFT JOIN users u ON d.uploaded_by = u.user_id
          WHERE d.document_id = :document_id";

$stmt = $conn->prepare($query);
$stmt->bindParam(':document_id', $document_id);
$stmt->execute();
$document = $stmt->fetch();

if (!$document) {
    $_SESSION['error'] = "Document not found";
    header("Location: " . getUrl('dashboard'));
    exit();
}

// Get routing history
$routingHistory = getDocumentRoutingHistory($conn, $document_id);

// Get full history log
$query = "SELECT dh.*, u.full_name 
          FROM document_history dh
          LEFT JOIN users u ON dh.user_id = u.user_id
          WHERE dh.document_id = :document_id
          ORDER BY dh.created_at DESC";

$stmt = $conn->prepare($query);
$stmt->bindParam(':document_id', $document_id);
$stmt->execute();
$fullHistory = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document History - <?php echo htmlspecialchars($document['title']); ?></title>
    <link rel="stylesheet" href="<?php echo getUrl('assests/css/style.css'); ?>">
</head>
<body>
    <nav>
        <div class="container">
            <h1>
                <a href="<?php echo getUrl('dashboard'); ?>">
                    Document Tracking System
                </a>
            </h1>
            <div>
                <span>Welcome, <?php echo htmlspecialchars($user['full_name']); ?></span>
                <a href="<?php echo getUrl('dashboard'); ?>" class="btn btn--secondary btn--sm">Dashboard</a>
                <a href="<?php echo getUrl('upload-document'); ?>" class="btn btn--primary btn--sm">Upload Document</a>
                <a href="<?php echo getUrl('archived-documents'); ?>" class="btn btn--secondary btn--sm">Archives</a>
                <a href="<?php echo getUrl('logout'); ?>" class="btn btn--outline btn--sm">Logout</a>
            </div>
        </div>
    </nav>
    
    <div class="container" style="padding: var(--space-32) 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-24);">
            <h2 style="margin: 0;">Document History</h2>
            <a href="<?php echo getUrl('dashboard'); ?>" class="btn btn--secondary">Back to Dashboard</a>
        </div>
        
        <!-- Document Info Card -->
        <div class="card" style="margin-bottom: 30px;">
            <div class="card__header">
                <h3>Document Information</h3>
            </div>
            <div class="card__body">
                <table class="info-table">
                    <tr>
                        <th>Document Number:</th>
                        <td><?php echo htmlspecialchars($document['document_number']); ?></td>
                    </tr>
                    <tr>
                        <th>Title:</th>
                        <td><?php echo htmlspecialchars($document['title']); ?></td>
                    </tr>
                    <tr>
                        <th>Type:</th>
                        <td><?php echo htmlspecialchars($document['document_type']); ?></td>
                    </tr>
                    <tr>
                        <th>Status:</th>
                        <td><?php echo getStatusBadge($document['status']); ?></td>
                    </tr>
                    <tr>
                        <th>Priority:</th>
                        <td><?php echo getPriorityBadge($document['priority']); ?></td>
                    </tr>
                    <tr>
                        <th>Uploaded By:</th>
                        <td><?php echo htmlspecialchars($document['uploader']); ?></td>
                    </tr>
                    <tr>
                        <th>Upload Date:</th>
                        <td><?php echo date('M d, Y h:i A', strtotime($document['uploaded_at'])); ?></td>
                    </tr>
                    <?php if ($document['file_path']): ?>
                    <tr>
                        <th>File:</th>
                        <td>
                            <a href="<?php echo getUrl('actions/view-file?id=' . $document['document_id']); ?>" 
                               target="_blank" 
                               class="btn btn--sm" style="background: var(--color-info); color: white; border-color: var(--color-info);">
                                View/Download File
                            </a>
                        </td>
                    </tr>
                    <?php endif; ?>
                </table>
            </div>
        </div>
        
        <!-- Routing History -->
        <div class="card" style="margin-bottom: 30px;">
            <div class="card__header">
                <h3>Routing History</h3>
            </div>
            <div class="card__body">
                <?php if (count($routingHistory) > 0): ?>
                    <div class="timeline">
                        <?php foreach ($routingHistory as $route): ?>
                            <div class="timeline-item <?php echo $route['is_current'] ? 'active' : ''; ?>">
                                <div class="timeline-marker"></div>
                                <div class="timeline-content">
                                    <div class="timeline-header">
                                        <strong><?php echo ucfirst($route['action_taken']); ?></strong>
                                        <?php if ($route['is_current']): ?>
                                            <span class="status status--success">Current</span>
                                        <?php endif; ?>
                                    </div>
                                    <div class="timeline-body">
                                        <p>
                                            <strong>From:</strong> <?php echo htmlspecialchars($route['from_user']); ?> 
                                            (<?php echo htmlspecialchars($route['from_dept']); ?>)
                                        </p>
                                        <p>
                                            <strong>To:</strong> <?php echo htmlspecialchars($route['to_user']); ?> 
                                            (<?php echo htmlspecialchars($route['to_dept']); ?>)
                                        </p>
                                        <p><strong>Remarks:</strong> <?php echo htmlspecialchars($route['remarks']); ?></p>
                                    </div>
                                    <div class="timeline-footer">
                                        <?php echo date('M d, Y h:i A', strtotime($route['routed_at'])); ?>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php else: ?>
                    <p>No routing history available.</p>
                <?php endif; ?>
            </div>
        </div>
        
        <!-- Full Activity Log -->
        <div class="card">
            <div class="card__header">
                <h3>Activity Log</h3>
            </div>
            <div class="card__body">
                <table id="activityLogTable" class="table" data-table data-items-per-page="10" data-searchable="true" data-search-placeholder="Search activity log...">
                    <thead>
                        <tr>
                            <th>Date & Time</th>
                            <th>User</th>
                            <th>Action</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($fullHistory as $log): ?>
                            <tr>
                                <td><?php echo date('M d, Y h:i A', strtotime($log['created_at'])); ?></td>
                                <td><?php echo htmlspecialchars($log['full_name']); ?></td>
                                <td><?php echo htmlspecialchars($log['action']); ?></td>
                                <td><?php echo htmlspecialchars($log['details'] ?? '-'); ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    <script src="<?php echo getUrl('assests/js/table-utils.js'); ?>"></script>
</body>
</html>
