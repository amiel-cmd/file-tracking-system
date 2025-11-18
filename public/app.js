// Main Application JavaScript
// Handles routing and API calls

const API_BASE = '/api';

// Auth utilities
const auth = {
    getToken() {
        return localStorage.getItem('token');
    },
    
    setToken(token) {
        localStorage.setItem('token', token);
    },
    
    removeToken() {
        localStorage.removeItem('token');
    },
    
    getUser() {
        const token = this.getToken();
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload;
        } catch (e) {
            return null;
        }
    },
    
    isAuthenticated() {
        return !!this.getToken();
    }
};

// API utilities
const api = {
    async request(endpoint, options = {}) {
        const token = auth.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },
    
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

// Router
const router = {
    currentRoute: '',
    
    init() {
        this.handleRoute();
        window.addEventListener('popstate', () => this.handleRoute());
    },
    
    navigate(path) {
        window.history.pushState({}, '', path);
        this.handleRoute();
    },
    
    handleRoute() {
        const path = window.location.pathname;
        this.currentRoute = path;
        
        if (path === '/' || path === '/login') {
            if (auth.isAuthenticated()) {
                this.navigate('/dashboard');
                return;
            }
            this.showLogin();
        } else if (path === '/register') {
            if (auth.isAuthenticated()) {
                this.navigate('/dashboard');
                return;
            }
            this.showRegister();
        } else if (path === '/dashboard') {
            if (!auth.isAuthenticated()) {
                this.navigate('/login');
                return;
            }
            this.showDashboard();
        } else {
            this.navigate('/dashboard');
        }
    },
    
    showLogin() {
        document.getElementById('app').innerHTML = `
            <div class="container">
                <div class="card" style="max-width: 450px; margin: 80px auto;">
                    <div class="card__header">
                        <h2 style="margin: 0; text-align: center;">Login</h2>
                    </div>
                    <div class="card__body">
                        <div id="message"></div>
                        <form id="loginForm">
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
                            Don't have an account? <a href="#" onclick="router.navigate('/register'); return false;">Register here</a>
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            try {
                const result = await api.post('/auth/login', data);
                auth.setToken(result.token);
                this.navigate('/dashboard');
            } catch (error) {
                this.showMessage(error.message, 'error');
            }
        });
    },
    
    showRegister() {
        document.getElementById('app').innerHTML = `
            <div class="container">
                <div class="card" style="max-width: 450px; margin: 80px auto;">
                    <div class="card__header">
                        <h2 style="margin: 0; text-align: center;">Register</h2>
                    </div>
                    <div class="card__body">
                        <div id="message"></div>
                        <form id="registerForm">
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
                                <input type="password" name="password" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Confirm Password</label>
                                <input type="password" name="confirm_password" class="form-control" required>
                            </div>
                            <button type="submit" class="btn btn--primary btn--full-width">Register</button>
                        </form>
                        <p style="text-align: center; margin-top: var(--space-24); color: var(--color-text-secondary);">
                            Already have an account? <a href="#" onclick="router.navigate('/login'); return false;">Login here</a>
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            try {
                const result = await api.post('/auth/register', data);
                this.showMessage(result.message, 'success');
                setTimeout(() => this.navigate('/login'), 2000);
            } catch (error) {
                this.showMessage(error.message, 'error');
            }
        });
    },
    
    async showDashboard() {
        const user = auth.getUser();
        
        try {
            const data = await api.get('/data/dashboard');
            
            document.getElementById('app').innerHTML = `
                <nav>
                    <div class="container">
                        <h1>Document Tracking System</h1>
                        <div>
                            <span>Welcome, ${user.fullName || user.username}</span>
                            <button onclick="openUploadModal()" class="btn btn--primary btn--sm">+ Add Document</button>
                            <a href="#" onclick="router.navigate('/archives'); return false;" class="btn btn--secondary btn--sm">Archives</a>
                            ${user.role === 'admin' ? '<a href="#" onclick="router.navigate(\'/admin\'); return false;" class="btn btn--secondary btn--sm">Admin Panel</a>' : ''}
                            <a href="#" onclick="logout(); return false;" class="btn btn--outline btn--sm">Logout</a>
                        </div>
                    </div>
                </nav>
                <div class="container" style="padding: var(--space-32) 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-24);">
                        <h2 style="margin: 0;">My Documents</h2>
                        <button onclick="openUploadModal()" class="btn btn--primary">+ Add Document</button>
                    </div>
                    <div id="message"></div>
                    <div class="card">
                        <div class="card__body">
                            <div id="documentsList"></div>
                        </div>
                    </div>
                </div>
            `;
            
            this.renderDocuments(data.documents || []);
        } catch (error) {
            if (error.message.includes('Authentication')) {
                auth.removeToken();
                this.navigate('/login');
            } else {
                this.showMessage(error.message, 'error');
            }
        }
    },
    
    renderDocuments(documents) {
        const container = document.getElementById('documentsList');
        
        if (documents.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p style="font-size: var(--font-size-lg); margin-bottom: var(--space-8);">No documents found</p>
                    <p style="color: var(--color-text-secondary); margin-bottom: var(--space-24);">Get started by adding your first document</p>
                    <button onclick="openUploadModal()" class="btn btn--primary">Add Document</button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <table class="table">
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
                    ${documents.map(doc => `
                        <tr>
                            <td>${doc.document_number}</td>
                            <td>${doc.title}</td>
                            <td>${doc.document_type}</td>
                            <td>${this.getPriorityBadge(doc.priority)}</td>
                            <td>${this.getStatusBadge(doc.status)}</td>
                            <td>${doc.uploaded_by_name || 'N/A'}</td>
                            <td>${new Date(doc.uploaded_at).toLocaleDateString()}</td>
                            <td>
                                <div style="display: flex; gap: var(--space-8); flex-wrap: wrap;">
                                    <button onclick="viewDocument(${doc.document_id})" class="btn btn--sm">View</button>
                                    <button onclick="routeDocument(${doc.document_id})" class="btn btn--sm btn--primary">Route</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },
    
    getStatusBadge(status) {
        const badges = {
            'pending': '<span class="status status--warning">Pending</span>',
            'in_progress': '<span class="status status--info">In Progress</span>',
            'completed': '<span class="status status--success">Completed</span>',
            'archived': '<span class="status">Archived</span>'
        };
        return badges[status] || `<span class="status">${status}</span>`;
    },
    
    getPriorityBadge(priority) {
        const badges = {
            'low': '<span class="status status--info">Low</span>',
            'medium': '<span class="status status--warning">Medium</span>',
            'high': '<span class="status status--error">High</span>',
            'urgent': '<span class="status status--error">URGENT</span>'
        };
        return badges[priority] || `<span class="status">${priority}</span>`;
    },
    
    showMessage(message, type = 'info') {
        const messageDiv = document.getElementById('message');
        if (messageDiv) {
            messageDiv.innerHTML = `<div class="status status--${type}">${message}</div>`;
            setTimeout(() => {
                messageDiv.innerHTML = '';
            }, 5000);
        }
    }
};

// Global functions
function logout() {
    auth.removeToken();
    router.navigate('/login');
}

function openUploadModal() {
    alert('Upload modal - to be implemented');
}

function viewDocument(id) {
    window.open(`/api/documents/view?id=${id}`, '_blank');
}

function routeDocument(id) {
    alert('Route document - to be implemented');
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    router.init();
});

// Make router accessible globally
window.router = router;
window.api = api;
window.auth = auth;

