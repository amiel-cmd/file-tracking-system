<?php
class Database {
    private $host;
    private $port;
    private $db;
    private $user;
    private $pass;
    public $conn;

    public function __construct() {
        // Get environment variables with fallback defaults
        $this->host = getenv('DB_HOST') ?: 'localhost';
        $this->port = getenv('DB_PORT') ?: '5432';
        $this->db = getenv('DB_NAME') ?: 'file_tracking_system';
        $this->user = getenv('DB_USER') ?: 'postgres';
        $this->pass = getenv('DB_PASSWORD') ?: 'postgres';
    }

    public function getConnection() {
        $this->conn = null;
        
        try {
            // Use DATABASE_URL if available (recommended for Vercel)
            $database_url = getenv('DATABASE_URL');
            
            if ($database_url) {
                // Parse PostgreSQL connection URL
                $this->conn = new PDO($database_url);
            } else {
                // Build DSN from individual components
                $dsn = "pgsql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->db;
                $this->conn = new PDO($dsn, $this->user, $this->pass);
            }
            
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch(PDOException $e) {
            error_log("Connection Error: " . $e->getMessage());
            if (getenv('APP_ENV') !== 'production') {
                echo "Connection Error: " . $e->getMessage();
            } else {
                echo "Database connection failed. Please contact administrator.";
            }
        }
        
        return $this->conn;
    }
}
?>
