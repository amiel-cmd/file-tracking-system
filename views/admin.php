<?php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/includes/session.php';
require_once dirname(__DIR__) . '/includes/functions.php';

requireLogin();

// Check if user is admin
$user = getCurrentUser();
if ($user['role'] !== 'admin') {
    $_SESSION['error'] = "Access denied. Admin privileges required.";
    header("Location: " . getUrl('dashboard'));
    exit();
}

$database = new Database();
$conn = $database->getConnection();

// Get pending users (is_active = 0)
$query = "SELECT user_id, username, email, full_name, role 
          FROM users 
          WHERE is_active = 0 
          ORDER BY user_id DESC";

$stmt = $conn->prepare($query);
$stmt->execute();
$pendingUsers = $stmt->fetchAll();

// Get all active users
$query = "SELECT user_id, username, email, full_name, role, department, is_active 
          FROM users 
          WHERE is_active = 1 
          ORDER BY user_id DESC";

$stmt = $conn->prepare($query);
$stmt->execute();
$activeUsers = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel - Document Tracking</title>
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
                <span>Welcome, <?php echo htmlspecialchars($user['full_name']); ?> (Admin)</span>
                <a href="<?php echo getUrl('dashboard'); ?>" class="btn btn--secondary btn--sm">Dashboard</a>
                <a href="<?php echo getUrl('logout'); ?>" class="btn btn--outline btn--sm">Logout</a>
            </div>
        </div>
    </nav>
    
    <div class="container" style="padding: var(--space-32) 0;">
        <h2 style="margin-bottom: var(--space-32);">Admin Panel</h2>
        
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
        
        <!-- Pending Registrations -->
        <div class="card" style="margin-bottom: var(--space-32);">
            <div class="card__header">
                <h3 style="margin: 0;">Pending Registrations (<?php echo count($pendingUsers); ?>)</h3>
            </div>
            <div class="card__body">
                <?php if (count($pendingUsers) > 0): ?>
                    <table id="pendingUsersTable" class="table" data-table data-items-per-page="10" data-searchable="true" data-search-placeholder="Search pending users...">
                        <thead>
                            <tr>
                                <th>Full Name</th>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($pendingUsers as $pendingUser): ?>
                                <tr>
                                    <td><?php echo htmlspecialchars($pendingUser['full_name']); ?></td>
                                    <td><?php echo htmlspecialchars($pendingUser['username']); ?></td>
                                    <td><?php echo htmlspecialchars($pendingUser['email']); ?></td>
                                    <td><?php echo htmlspecialchars($pendingUser['role']); ?></td>
                                    <td>
                                        <div style="display: flex; gap: var(--space-8);">
                                            <form action="<?php echo getUrl('actions/approve-user-action'); ?>" method="POST" style="display: inline;">
                                                <input type="hidden" name="user_id" value="<?php echo $pendingUser['user_id']; ?>">
                                                <button type="submit" class="btn btn--sm" style="background: var(--color-success); color: white; border-color: var(--color-success);">Approve</button>
                                            </form>
                                            <form action="<?php echo getUrl('actions/deny-user-action'); ?>" method="POST" style="display: inline;" 
                                                  onsubmit="return confirm('Are you sure you want to deny this registration?');">
                                                <input type="hidden" name="user_id" value="<?php echo $pendingUser['user_id']; ?>">
                                                <button type="submit" class="btn btn--sm" style="background: var(--color-error); color: white; border-color: var(--color-error);">Deny</button>
                                            </form>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <div class="empty-state">
                        <p>No pending registrations</p>
                    </div>
                <?php endif; ?>
            </div>
        </div>
        
        <!-- All Users -->
        <div class="card">
            <div class="card__header">
                <h3 style="margin: 0;">All Users (<?php echo count($activeUsers); ?>)</h3>
            </div>
            <div class="card__body">
                <?php if (count($activeUsers) > 0): ?>
                    <table id="activeUsersTable" class="table" data-table data-items-per-page="10" data-searchable="true" data-search-placeholder="Search users...">
                        <thead>
                            <tr>
                                <th>Full Name</th>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Department</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($activeUsers as $activeUser): ?>
                                <tr>
                                    <td><?php echo htmlspecialchars($activeUser['full_name']); ?></td>
                                    <td><?php echo htmlspecialchars($activeUser['username']); ?></td>
                                    <td><?php echo htmlspecialchars($activeUser['email']); ?></td>
                                    <td><?php echo htmlspecialchars($activeUser['role']); ?></td>
                                    <td><?php echo htmlspecialchars($activeUser['department'] ?? 'N/A'); ?></td>
                                    <td>
                                        <?php if ($activeUser['is_active']): ?>
                                            <span class="status status--success">Active</span>
                                        <?php else: ?>
                                            <span class="status status--warning">Pending</span>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <div class="empty-state">
                        <p>No active users</p>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
    <script src="<?php echo getUrl('assests/js/table-utils.js'); ?>"></script>
</body>
</html>

