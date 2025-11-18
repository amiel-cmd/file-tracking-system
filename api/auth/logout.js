module.exports = async function handler(req, res) {
    // Logout is handled client-side by removing the token
    // This endpoint can be used for server-side token blacklisting if needed
    
    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
};

