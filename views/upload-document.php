<?php
require_once dirname(__DIR__) . '/includes/session.php';
require_once dirname(__DIR__) . '/includes/functions.php';
requireLogin();

$user = getCurrentUser();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Upload Document</title>
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
                <a href="<?php echo getUrl('archived-documents'); ?>" class="btn btn--secondary btn--sm">Archives</a>
                <a href="<?php echo getUrl('logout'); ?>" class="btn btn--outline btn--sm">Logout</a>
            </div>
        </div>
    </nav>
    
    <div class="container" style="padding: var(--space-32) 0;">
        <div class="card" style="max-width: 700px; margin: 0 auto;">
            <div class="card__header">
                <h2>Upload New Document</h2>
            </div>
            <div class="card__body">
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
                
                <form action="<?php echo getUrl('actions/upload-action'); ?>" method="POST" enctype="multipart/form-data">
                    <div class="form-group">
                        <label class="form-label">Document Title *</label>
                        <input type="text" name="title" class="form-control" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Document Type *</label>
                        <select name="document_type" class="form-control" required>
                            <option value="">Select Type</option>
                            <option value="incoming">Incoming</option>
                            <option value="outgoing">Outgoing</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Priority *</labsel>
                        <select name="priority" class="form-control" required>
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <textarea name="description" class="form-control" rows="4"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Upload File * (Max 10MB)</label>
                        <input type="file" name="document_file" class="form-control" required>
                        <small>Allowed: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, ZIP</small>
                    </div>
                    
                    <div style="display: flex; gap: var(--space-12); margin-top: var(--space-24);">
                        <button type="submit" class="btn btn--primary">Upload Document</button>
                        <a href="<?php echo getUrl('dashboard'); ?>" class="btn btn--secondary">Cancel</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</body>
</html>
