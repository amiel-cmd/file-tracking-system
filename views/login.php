<?php
// Use absolute path that works from anywhere
require_once dirname(__DIR__) . '/includes/session.php';

if (isLoggedIn()) {
    header("Location: " . getUrl('dashboard'));
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Document Tracking</title>
    <link rel="stylesheet" href="<?php echo getUrl('assests/css/style.css'); ?>">
</head>
<body>
    <div class="container">
        <div class="card" style="max-width: 450px; margin: 80px auto;">
            <div class="card__header">
                <h2 style="margin: 0; text-align: center;">Login</h2>
            </div>
            <div class="card__body">
                
                <?php if (isset($_SESSION['success'])): ?>
                    <div class="status status--success">
                        <?php 
                        echo $_SESSION['success']; 
                        unset($_SESSION['success']);
                        ?>
                    </div>
                <?php endif; ?>
                
                <?php if (isset($_SESSION['error'])): ?>
                    <div class="status status--error">
                        <?php 
                        echo $_SESSION['error']; 
                        unset($_SESSION['error']);
                        ?>
                    </div>
                <?php endif; ?>
                
                <form action="<?php echo getUrl('actions/login-action'); ?>" method="POST">
                    <div class="form-group">
                        <label class="form-label">Username or Email</label>
                        <input type="text" name="username" class="form-control" required autofocus>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <input type="password" name="password" class="form-control" required>
                    </div>
                    
                    <button type="submit" class="btn btn--primary btn--full-width">Login</button>
                </form>
                
                <p style="text-align: center; margin-top: var(--space-24); color: var(--color-text-secondary);">
                    Don't have an account? <a href="<?php echo getUrl('register'); ?>">Register here</a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>
