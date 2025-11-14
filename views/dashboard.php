<?php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/includes/session.php';
require_once dirname(__DIR__) . '/includes/functions.php';

requireLogin();

$user = getCurrentUser();
$user_id = $user['user_id'];

$database = new Database();
$conn = $database->getConnection();

// Get documents for current user
$query = "SELECT d.*, u.full_name as uploader 
          FROM documents d
          LEFT JOIN users u ON d.uploaded_by = u.user_id
          WHERE d.is_archived = 0 
          AND (d.current_holder = :user_id OR d.uploaded_by = :user_id)
          ORDER BY d.uploaded_at DESC";

$stmt = $conn->prepare($query);
$stmt->bindParam(':user_id', $user_id);
$stmt->execute();
$documents = $stmt->fetchAll();

// Get all users for routing dropdown
$users = getAllUsers($conn);
$usersJson = json_encode($users);

// Prepare documents JSON for JavaScript (for edit functionality)
$documentsJson = json_encode($documents);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Document Tracking</title>
    <link rel="stylesheet" href="<?php echo getUrl('assests/css/style.css'); ?>">
</head>
<body>
    <nav>
        <div class="container">
            <h1>Document Tracking System</h1>
            <div>
                <span>Welcome, <?php echo htmlspecialchars($user['full_name']); ?></span>
                <button onclick="openDocumentFormModal()" class="btn btn--primary btn--sm">+ Add Document</button>
                <a href="<?php echo getUrl('archived-documents'); ?>" class="btn btn--secondary btn--sm">Archives</a>
                <?php if ($user['role'] === 'admin'): ?>
                    <a href="<?php echo getUrl('admin'); ?>" class="btn btn--secondary btn--sm">Admin Panel</a>
                <?php endif; ?>
                <a href="<?php echo getUrl('logout'); ?>" class="btn btn--outline btn--sm">Logout</a>
            </div>
        </div>
    </nav>
    
    <div class="container" style="padding: var(--space-32) 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-24);">
            <h2 style="margin: 0;">My Documents</h2>
            <button onclick="openDocumentFormModal()" class="btn btn--primary">+ Add Document</button>
        </div>
        
        <?php if (isset($_SESSION['success'])): ?>
            <div class="status status--success">
                <?php echo $_SESSION['success']; unset($_SESSION['success']); ?>
            </div>
        <?php endif; ?>
        
        <?php if (isset($_SESSION['error'])): ?>
            <div class="status status--error">
                <?php echo $_SESSION['error']; unset($_SESSION['error']); ?>
            </div>
        <?php endif; ?>
        
        <div class="card">
            <div class="card__body">
                <?php if (count($documents) > 0): ?>
                    <table id="documentsTable" class="table" data-table data-items-per-page="10" data-searchable="true" data-search-placeholder="Search documents...">
                        <thead>
                            <tr>
                                <th>Document #</th>
                                <th>Title</th>
                                <th>Type</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Uploaded By</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($documents as $doc): ?>
                                <tr>
                                    <td><?php echo htmlspecialchars($doc['document_number']); ?></td>
                                    <td><?php echo htmlspecialchars($doc['title']); ?></td>
                                    <td><?php echo htmlspecialchars($doc['document_type']); ?></td>
                                    <td><?php echo getPriorityBadge($doc['priority']); ?></td>
                                    <td><?php echo getStatusBadge($doc['status']); ?></td>
                                    <td><?php echo htmlspecialchars($doc['uploader']); ?></td>
                                    <td><?php echo date('M d, Y', strtotime($doc['uploaded_at'])); ?></td>
                                    <td>
                                        <div style="display: flex; gap: var(--space-8); flex-wrap: wrap;">
                                            <a href="<?php echo getUrl('actions/view-file?id=' . $doc['document_id']); ?>" 
                                               target="_blank" 
                                               class="btn btn--sm" style="background: var(--color-info); color: white; border-color: var(--color-info);">View File</a>
                                            <button onclick="openRouteModal(<?php echo $doc['document_id']; ?>, <?php echo htmlspecialchars($usersJson); ?>)" 
                                                    class="btn btn--sm btn--primary">Route</button>
                                            <a href="<?php echo getUrl('document-history?id=' . $doc['document_id']); ?>" 
                                               class="btn btn--sm btn--secondary">History</a>
                                            
                                            <?php if ($doc['uploaded_by'] == $user_id): ?>
                                                <button onclick="openDocumentFormModal(<?php echo $doc['document_id']; ?>)" 
                                                        class="btn btn--sm" style="background: var(--color-info); color: white; border-color: var(--color-info);">Edit</button>
                                                <form action="<?php echo getUrl('actions/delete-document-action'); ?>" method="POST" style="display: inline;" 
                                                      onsubmit="return confirm('Are you sure you want to delete this document? This action cannot be undone.');">
                                                    <input type="hidden" name="document_id" value="<?php echo $doc['document_id']; ?>">
                                                    <button type="submit" class="btn btn--sm" style="background: var(--color-error); color: white; border-color: var(--color-error);">Delete</button>
                                                </form>
                                            <?php endif; ?>
                                            
                                            <?php if ($doc['status'] !== 'archived'): ?>
                                                <form action="<?php echo getUrl('actions/archive-action'); ?>" method="POST" style="display: inline;" 
                                                      onsubmit="return confirm('Archive this document?');">
                                                    <input type="hidden" name="document_id" value="<?php echo $doc['document_id']; ?>">
                                                    <button type="submit" class="btn btn--sm btn--outline">Archive</button>
                                                </form>
                                            <?php endif; ?>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <div class="empty-state">
                        <p style="font-size: var(--font-size-lg); margin-bottom: var(--space-8);">No documents found</p>
                        <p style="color: var(--color-text-secondary); margin-bottom: var(--space-24);">Get started by adding your first document</p>
                        <button onclick="openDocumentFormModal()" class="btn btn--primary">Add Document</button>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
    
    <script>
        // Pass action URLs to JavaScript
        const ROUTE_ACTION_URL = '<?php echo getUrl('actions/route-action'); ?>';
        const UPLOAD_ACTION_URL = '<?php echo getUrl('actions/upload-action'); ?>';
        const EDIT_DOCUMENT_ACTION_URL = '<?php echo getUrl('actions/edit-document-action'); ?>';
        const DOCUMENTS_DATA = <?php echo $documentsJson; ?>;
    </script>
    <script src="<?php echo getUrl('assests/js/table-utils.js'); ?>"></script>
    <script src="<?php echo getUrl('assests/js/modal.js'); ?>"></script>
</body>
</html>
