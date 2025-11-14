<?php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/includes/session.php';
require_once dirname(__DIR__) . '/includes/functions.php';

requireLogin();

$user = getCurrentUser();
$database = new Database();
$conn = $database->getConnection();

// Get archived documents
$query = "SELECT d.*, 
          u_uploaded.full_name as uploader,
          u_archived.full_name as archived_by_name,
          ad.archive_reason,
          ad.archived_at as archive_date
          FROM documents d
          LEFT JOIN users u_uploaded ON d.uploaded_by = u_uploaded.user_id
          LEFT JOIN archived_documents ad ON d.document_id = ad.document_id
          LEFT JOIN users u_archived ON ad.archived_by = u_archived.user_id
          WHERE d.is_archived = 1
          ORDER BY d.archived_at DESC";

$stmt = $conn->prepare($query);
$stmt->execute();
$archivedDocs = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Archived Documents</title>
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
            <h2 style="margin: 0;">Archived Documents</h2>
            <a href="<?php echo getUrl('dashboard'); ?>" class="btn btn--secondary">Back to Dashboard</a>
        </div>
        
        <div class="card">
            <div class="card__body">
                <?php if (count($archivedDocs) > 0): ?>
                    <table id="archivedDocsTable" class="table" data-table data-items-per-page="10" data-searchable="true" data-search-placeholder="Search archived documents...">
                        <thead>
                            <tr>
                                <th>Document #</th>
                                <th>Title</th>
                                <th>Type</th>
                                <th>Uploaded By</th>
                                <th>Archived By</th>
                                <th>Archive Date</th>
                                <th>Reason</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($archivedDocs as $doc): ?>
                                <tr>
                                    <td><?php echo htmlspecialchars($doc['document_number']); ?></td>
                                    <td><?php echo htmlspecialchars($doc['title']); ?></td>
                                    <td><?php echo htmlspecialchars($doc['document_type']); ?></td>
                                    <td><?php echo htmlspecialchars($doc['uploader']); ?></td>
                                    <td><?php echo htmlspecialchars($doc['archived_by_name']); ?></td>
                                    <td><?php echo date('M d, Y', strtotime($doc['archive_date'])); ?></td>
                                    <td><?php echo htmlspecialchars($doc['archive_reason']); ?></td>
                                    <td>
                                        <div style="display: flex; gap: var(--space-8); flex-wrap: wrap;">
                                            <a href="<?php echo getUrl('actions/view-file?id=' . $doc['document_id']); ?>" 
                                               target="_blank" 
                                               class="btn btn--sm" style="background: var(--color-info); color: white; border-color: var(--color-info);">View File</a>
                                            <a href="<?php echo getUrl('document-history?id=' . $doc['document_id']); ?>" 
                                               class="btn btn--sm btn--secondary">History</a>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <div class="empty-state">
                        <p style="font-size: var(--font-size-lg); margin-bottom: var(--space-8);">No archived documents</p>
                        <p style="color: var(--color-text-secondary);">Archived documents will appear here</p>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
    <script src="<?php echo getUrl('assests/js/table-utils.js'); ?>"></script>
</body>
</html>
