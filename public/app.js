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

      const text = await response.text();
      console.log('API raw response for', endpoint, ':', text);

      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        console.error('Failed to parse JSON from API:', text);
        throw new Error('Server returned invalid response');
      }

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
  },

  // New method for multipart form data (file uploads)
  async uploadFile(endpoint, formData) {
    const token = auth.getToken();
    const headers = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData // Don't set Content-Type, browser will set it with boundary
      });

      const text = await response.text();
      console.log('API raw response for', endpoint, ':', text);

      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        console.error('Failed to parse JSON from API:', text);
        throw new Error('Server returned invalid response');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
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
        const result = await api.post('/auth', {
          action: 'login',
          ...data
        });
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
        const result = await api.post('/auth', {
          action: 'register',
          ...data
        });
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
            <button onclick="openUploadModal()" class="btn btn--primary">+ Upload Document</button>
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
          <button onclick="openUploadModal()" class="btn btn--primary">Upload Document</button>
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
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.id = 'uploadModal';
  
  modalOverlay.innerHTML = `
    <div class="modal">
      <div class="modal__header">
        <h3 class="modal__title">Upload Document</h3>
        <button class="modal__close" onclick="closeUploadModal()">&times;</button>
      </div>
      <div class="modal__body">
        <div id="uploadMessage"></div>
        <form id="uploadForm" enctype="multipart/form-data">
          <!-- File Upload Area -->
          <div class="form-group">
            <label class="form-label">Document File *</label>
            <div class="file-upload-area" id="fileUploadArea" onclick="document.getElementById('fileInput').click()">
              <input type="file" id="fileInput" name="file" style="display: none;" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" required>
              <div id="fileUploadText">
                <p style="font-size: var(--font-size-lg); margin-bottom: var(--space-8);">📁 Click to upload file</p>
                <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                  Supported: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                </p>
              </div>
            </div>
          </div>

          <!-- Title -->
          <div class="form-group">
            <label class="form-label">Document Title *</label>
            <input type="text" name="title" class="form-control" placeholder="Enter document title" required maxlength="255">
          </div>

          <!-- Description -->
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea name="description" class="form-control" rows="3" placeholder="Enter document description (optional)"></textarea>
          </div>

          <!-- Document Type -->
          <div class="form-group">
            <label class="form-label">Document Type *</label>
            <select name="document_type" class="form-control" required>
              <option value="">Select document type</option>
              <option value="Memo">Memo</option>
              <option value="Letter">Letter</option>
              <option value="Report">Report</option>
              <option value="Invoice">Invoice</option>
              <option value="Contract">Contract</option>
              <option value="incoming">Incoming</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <!-- Priority -->
          <div class="form-group">
            <label class="form-label">Priority *</label>
            <select name="priority" class="form-control" required>
              <option value="">Select priority</option>
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <!-- Submit Buttons -->
          <div style="display: flex; gap: var(--space-12); justify-content: flex-end; margin-top: var(--space-24);">
            <button type="button" onclick="closeUploadModal()" class="btn btn--outline">Cancel</button>
            <button type="submit" class="btn btn--primary" id="uploadSubmitBtn">
              <span id="uploadBtnText">Upload Document</span>
              <span id="uploadBtnSpinner" style="display: none;">⏳ Uploading...</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.appendChild(modalOverlay);
  
  // Show modal with animation
  setTimeout(() => {
    modalOverlay.classList.add('active');
  }, 10);
  
  // File input change handler
  const fileInput = document.getElementById('fileInput');
  const fileUploadArea = document.getElementById('fileUploadArea');
  const fileUploadText = document.getElementById('fileUploadText');
  
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        showUploadMessage('File size must be less than 10MB', 'error');
        fileInput.value = '';
        return;
      }
      
      fileUploadArea.classList.add('has-file');
      fileUploadText.innerHTML = `
        <p style="font-size: var(--font-size-lg); margin-bottom: var(--space-8);">✅ ${file.name}</p>
        <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
          ${(file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      `;
    }
  });
  
  // Form submit handler
  document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('uploadSubmitBtn');
    const btnText = document.getElementById('uploadBtnText');
    const btnSpinner = document.getElementById('uploadBtnSpinner');
    
    // Disable button and show loading
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline';
    
    const formData = new FormData(e.target);
    const file = fileInput.files[0];
    
    // Validate file
    if (!file) {
      showUploadMessage('Please select a file', 'error');
      submitBtn.disabled = false;
      btnText.style.display = 'inline';
      btnSpinner.style.display = 'none';
      return;
    }
    
    try {
      // Use the uploadFile method for multipart/form-data
      const result = await api.uploadFile('/document', formData);
      
      showUploadMessage(result.message || 'Document uploaded successfully!', 'success');
      
      // Close modal and refresh documents after 1.5 seconds
      setTimeout(() => {
        closeUploadModal();
        router.showDashboard(); // Refresh the dashboard
      }, 1500);
      
    } catch (error) {
      showUploadMessage(error.message || 'Upload failed. Please try again.', 'error');
      submitBtn.disabled = false;
      btnText.style.display = 'inline';
      btnSpinner.style.display = 'none';
    }
  });
  
  // Close on overlay click
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeUploadModal();
    }
  });
}

function closeUploadModal() {
  const modal = document.getElementById('uploadModal');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

function showUploadMessage(message, type = 'info') {
  const messageDiv = document.getElementById('uploadMessage');
  if (messageDiv) {
    messageDiv.innerHTML = `<div class="status status--${type}" style="margin-bottom: var(--space-16);">${message}</div>`;
  }
}

function viewDocument(id) {
  window.open(`/api/document?id=${id}`, '_blank');
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
