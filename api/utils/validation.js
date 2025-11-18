// Validate email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate password strength
function isValidPassword(password) {
    return password && password.length >= 6;
}

// Validate registration data
function validateRegistration(data) {
    const errors = [];
    
    if (!data.full_name || !data.full_name.trim()) {
        errors.push('Full name is required');
    }
    
    if (!data.username || !data.username.trim()) {
        errors.push('Username is required');
    }
    
    if (!data.email || !data.email.trim()) {
        errors.push('Email is required');
    } else if (!isValidEmail(data.email)) {
        errors.push('Invalid email format');
    }
    
    if (!data.password) {
        errors.push('Password is required');
    } else if (!isValidPassword(data.password)) {
        errors.push('Password must be at least 6 characters');
    }
    
    if (data.password !== data.confirm_password) {
        errors.push('Passwords do not match');
    }
    
    return errors;
}

// Validate login data
function validateLogin(data) {
    const errors = [];
    
    if (!data.username || !data.username.trim()) {
        errors.push('Username is required');
    }
    
    if (!data.password) {
        errors.push('Password is required');
    }
    
    return errors;
}

// Validate document data
function validateDocument(data) {
    const errors = [];
    
    if (!data.title || !data.title.trim()) {
        errors.push('Title is required');
    }
    
    if (!data.document_type || !data.document_type.trim()) {
        errors.push('Document type is required');
    }
    
    if (!data.priority || !data.priority.trim()) {
        errors.push('Priority is required');
    }
    
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (data.priority && !validPriorities.includes(data.priority)) {
        errors.push('Invalid priority value');
    }
    
    return errors;
}

// Validate routing data
function validateRouting(data) {
    const errors = [];
    
    if (!data.document_id) {
        errors.push('Document ID is required');
    }
    
    if (!data.to_user_id) {
        errors.push('Recipient user is required');
    }
    
    if (!data.action_taken || !data.action_taken.trim()) {
        errors.push('Action taken is required');
    }
    
    return errors;
}

module.exports = {
    isValidEmail,
    isValidPassword,
    validateRegistration,
    validateLogin,
    validateDocument,
    validateRouting
};

