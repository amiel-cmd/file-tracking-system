<?php
// Use absolute path that works from anywhere
require_once dirname(__DIR__) . '/includes/session.php';

// Redirect if already logged in
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
    <title>Register - Document Tracking</title>
    <link rel="stylesheet" href="<?php echo getUrl('assests/css/style.css'); ?>">
</head>
<body>
    <div class="container">
        <div class="card" style="max-width: 550px; margin: 50px auto;">
            <div class="card__header">
                <h2 style="margin: 0; text-align: center;">Create Account</h2>
            </div>
            <div class="card__body">
                
                <?php if (isset($_SESSION['error'])): ?>
                    <div class="status status--error">
                        <?php 
                        echo $_SESSION['error']; 
                        unset($_SESSION['error']);
                        ?>
                    </div>
                <?php endif; ?>
                
                <form action="<?php echo getUrl('actions/register-action'); ?>" method="POST">
                    <div class="form-group">
                        <label class="form-label">Full Name</label>
                        <input type="text" name="full_name" class="form-control" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Username</label>
                        <input type="text" name="username" class="form-control" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" name="email" class="form-control" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <input type="password" name="password" class="form-control" required minlength="6">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Confirm Password</label>
                        <input type="password" name="confirm_password" class="form-control" required>
                    </div>
                    
                    <button type="submit" class="btn btn--primary btn--full-width">Register</button>
                </form>
                
                <p style="text-align: center; margin-top: var(--space-24); color: var(--color-text-secondary);">
                    Already have an account? <a href="<?php echo getUrl('login'); ?>">Login here</a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>
