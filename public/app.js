// Main Application JavaScript
// Handles routing and API calls with full CRUD operations + Search, Pagination, Sorting
// RESPONSIVE + TEXT BUTTONS + FIXED WIDTH TABLE + SIDEBAR LAYOUT + INLINE FILTERS + ARCHIVES + ADMIN PANEL

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
        body: formData
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

// Edit Document Modal
const editModal = {
  open(documentData, onSave) {
    const modalHtml = `
      <div id="editModalOverlay" class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
        <div class="modal" style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-width: 500px; width: 90%;">
          <h2 style="margin: 0 0 1.5rem 0; font-size: 1.5rem;">Edit Document</h2>
          <form id="editDocumentForm">
            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Title</label>
              <input type="text" id="editTitle" class="form-control" value="${documentData.title}" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Description</label>
              <textarea id="editDescription" class="form-control" rows="3" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">${documentData.description || ''}</textarea>
            </div>
            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Document Type</label>
              <input type="text" id="editType" class="form-control" value="${documentData.document_type}" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label class="form-label" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Priority</label>
              <select id="editPriority" class="form-control" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                <option value="low" ${documentData.priority === 'low' ? 'selected' : ''}>Low</option>
                <option value="medium" ${documentData.priority === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="high" ${documentData.priority === 'high' ? 'selected' : ''}>High</option>
                <option value="urgent" ${documentData.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
              </select>
            </div>
            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
              <button type="button" id="editCancelBtn" class="btn btn--secondary">Cancel</button>
              <button type="submit" class="btn btn--primary">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const overlay = document.getElementById('editModalOverlay');
    const form = document.getElementById('editDocumentForm');
    const cancelBtn = document.getElementById('editCancelBtn');

    cancelBtn.addEventListener('click', () => overlay.remove());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const updatedData = {
        document_id: documentData.document_id,
        title: document.getElementById('editTitle').value,
        description: document.getElementById('editDescription').value,
        document_type: document.getElementById('editType').value,
        priority: document.getElementById('editPriority').value
      };
      onSave(updatedData);
      overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }
};

// View Document Modal
const viewModal = {
  open(documentId, documentData) {
    const filePath = documentData.file_path || '';
    const hasFile = !!documentData.mega_file_id;
    const fileExtension = filePath ? filePath.split('.').pop().toLowerCase() : '';
    
    const isPDF = fileExtension === 'pdf';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension);
    const isOffice = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileExtension);
    const isViewable = hasFile && (isPDF || isImage || isOffice);

    const viewUrl = `/api/data/documents?id=${documentId}&view=true`;
    const downloadUrl = `/api/data/documents?id=${documentId}&download=true`;
    
    const previewUrl = isOffice 
      ? `https://docs.google.com/gview?url=${encodeURIComponent(window.location.origin + viewUrl)}&embedded=true`
      : viewUrl;
    const modalHtml = `
      <div id="viewModalOverlay" class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.9); display: flex; align-items: center; justify-content: center; z-index: 1000;">
        <div class="modal" style="background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-width: 90vw; max-height: 90vh; width: 100%; height: 100%; display: flex; flex-direction: column;">
          <div style="padding: 1rem 1.5rem; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h2 style="margin: 0; font-size: 1.5rem;">${documentData.title}</h2>
              <p style="margin: 0.25rem 0 0 0; color: #666; font-size: 0.875rem;">
                Document #${documentData.document_number} | 
                ${documentData.document_type} | 
                Priority: ${documentData.priority}
              </p>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              ${hasFile ? `<a href="${downloadUrl}" class="btn btn--sm btn--primary" style="text-decoration: none;">📥 Download</a>` : ''}
              <button id="viewCloseBtn" class="btn btn--sm" style="padding: 0.5rem; cursor: pointer; font-size: 1.5rem; line-height: 1;">
                ✕
              </button>
            </div>
          </div>
          <div style="flex: 1; overflow: auto; padding: 1rem; display: flex; justify-content: center; align-items: center; background: #f5f5f5;">
            ${hasFile && isViewable ? `
              ${isPDF || isOffice ? `
                <iframe src="${previewUrl}" style="width: 100%; height: 100%; border: none; background: white;"></iframe>
              ` : `
                <img src="${viewUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="${documentData.title}">
              `}
            ` : `
              <div style="text-align: center; padding: 2rem;">
                <p style="font-size: 3rem; margin-bottom: 1rem;">📄</p>
                <p style="font-size: 1.25rem; margin-bottom: 0.5rem;">${hasFile ? filePath : 'No file attached'}</p>
                <p style="color: #666; margin-bottom: 1.5rem;">
                  ${hasFile ? 'Preview not available for this file type' : 'This document has no attached file'}
                </p>
                ${hasFile ? `<a href="${downloadUrl}" class="btn btn--primary">Download to View</a>` : ''}
              </div>
            `}
          </div>
          <div style="padding: 1rem 1.5rem; border-top: 1px solid #ddd; background: #f9f9f9;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
              <div>
                <strong style="color: #666; font-size: 0.875rem;">Status:</strong>
                <p style="margin: 0.25rem 0 0 0;">${documentData.status}</p>
              </div>
              <div>
                <strong style="color: #666; font-size: 0.875rem;">Uploaded By:</strong>
                <p style="margin: 0.25rem 0 0 0;">${documentData.uploaded_by_name || 'N/A'}</p>
              </div>
              <div>
                <strong style="color: #666; font-size: 0.875rem;">Date:</strong>
                <p style="margin: 0.25rem 0 0 0;">${new Date(documentData.uploaded_at).toLocaleDateString()}</p>
              </div>
              ${hasFile ? `
              <div>
                <strong style="color: #666; font-size: 0.875rem;">File Size:</strong>
                <p style="margin: 0.25rem 0 0 0;">${formatFileSize(documentData.file_size)}</p>
              </div>
              ` : ''}
            </div>
            ${documentData.description ? `
              <div style="margin-top: 1rem;">
                <strong style="color: #666; font-size: 0.875rem;">Description:</strong>
                <p style="margin: 0.25rem 0 0 0;">${documentData.description}</p>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const overlay = document.getElementById('viewModalOverlay');
    const closeBtn = document.getElementById('viewCloseBtn');

    closeBtn.addEventListener('click', () => overlay.remove());

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    const escHandler = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }
};

// Utility function to format file size
function formatFileSize(bytes) {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Router
const router = {
  currentRoute: '',
  allDocuments: [],
  filteredDocuments: [],
  currentPage: 1,
  itemsPerPage: 10,
  sortColumn: 'uploaded_at',
  sortDirection: 'desc',

  init() {
    this.handleRoute();
    window.addEventListener('popstate', () => this.handleRoute());
  },

  navigate(path) {
    console.log('Navigating to:', path);
    window.history.pushState({}, '', path);
    this.handleRoute();
  },

  handleRoute() {
    const path = window.location.pathname;
    console.log('Current path:', path);
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
    } else if (path === '/archives') {
      if (!auth.isAuthenticated()) {
        this.navigate('/login');
        return;
      }
      this.showArchives();
    } else if (path === '/admin') {
      if (!auth.isAuthenticated()) {
        this.navigate('/login');
        return;
      }
      const user = auth.getUser();
      if (user.role !== 'admin') {
        alert('Access denied: Admin only');
        this.navigate('/dashboard');
        return;
      }
      this.showAdminPanel();
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
              Don't have an account? <a href="#" onclick="event.preventDefault(); router.navigate('/register');">Register here</a>
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
              Already have an account? <a href="#" onclick="event.preventDefault(); router.navigate('/login');">Login here</a>
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
      this.allDocuments = (data.documents || []).filter(doc => doc.is_archived !== 1);
      this.filteredDocuments = [...this.allDocuments];

      document.getElementById('app').innerHTML = `
        <div class="app-layout">
          <aside class="sidebar">
            <div class="sidebar-header">
              <h1>📄 DocTrack</h1>
            </div>
            <nav class="sidebar-nav">
              <a href="/dashboard" class="sidebar-link active" onclick="event.preventDefault(); router.navigate('/dashboard');">
                <span class="sidebar-icon">📋</span>
                <span>My Documents</span>
              </a>
              <a href="/archives" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/archives');">
                <span class="sidebar-icon">📦</span>
                <span>Archives</span>
              </a>
              ${user.role === 'admin' ? `
              <a href="/admin" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/admin');">
                <span class="sidebar-icon">⚙️</span>
                <span>Admin Panel</span>
              </a>
              ` : ''}
            </nav>
            <div class="sidebar-footer">
              <div class="user-info">
                <div class="user-avatar">👤</div>
                <div class="user-details">
                  <div class="user-name">${user.fullName || user.username}</div>
                  <div class="user-role">${user.role || 'User'}</div>
                </div>
              </div>
              <button onclick="logout()" class="btn-logout">Logout</button>
            </div>
          </aside>

          <main class="main-content">
            <div class="content-header">
              <h2>My Documents</h2>
              <button onclick="openDocumentFormModal()" class="btn btn--primary">+ Upload Document</button>
            </div>
            
            <div class="search-filters-inline">
              <input type="text" id="searchInput" placeholder="🔍 Search..." class="form-control search-inline">
              <select id="statusFilter" class="form-control filter-inline">
                <option value="">Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="routed">Routed</option>
                <option value="completed">Completed</option>
              </select>
              <select id="priorityFilter" class="form-control filter-inline">
                <option value="">Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <button onclick="router.resetFilters()" class="btn btn--secondary btn-clear">Clear</button>
            </div>
            
            <div id="message"></div>
            
            <div class="documents-container">
              <div id="documentsList"></div>
              <div id="pagination"></div>
            </div>
          </main>
        </div>
      `;

      document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
      document.getElementById('statusFilter').addEventListener('change', () => this.applyFilters());
      document.getElementById('priorityFilter').addEventListener('change', () => this.applyFilters());

      this.renderDocuments();
    } catch (error) {
      if (error.message.includes('Authentication')) {
        auth.removeToken();
        this.navigate('/login');
      } else {
        this.showMessage(error.message, 'error');
      }
    }
  },

  async showArchives() {
    console.log('showArchives() called');
    const user = auth.getUser();

    try {
      const data = await api.get('/data/dashboard');
      this.allDocuments = (data.documents || []).filter(doc => doc.is_archived === 1);
      this.filteredDocuments = [...this.allDocuments];
      
      console.log('Archived documents:', this.allDocuments.length);

      document.getElementById('app').innerHTML = `
        <div class="app-layout">
          <aside class="sidebar">
            <div class="sidebar-header">
              <h1>📄 DocTrack</h1>
            </div>
            <nav class="sidebar-nav">
              <a href="/dashboard" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/dashboard');">
                <span class="sidebar-icon">📋</span>
                <span>My Documents</span>
              </a>
              <a href="/archives" class="sidebar-link active" onclick="event.preventDefault(); router.navigate('/archives');">
                <span class="sidebar-icon">📦</span>
                <span>Archives</span>
              </a>
              ${user.role === 'admin' ? `
              <a href="/admin" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/admin');">
                <span class="sidebar-icon">⚙️</span>
                <span>Admin Panel</span>
              </a>
              ` : ''}
            </nav>
            <div class="sidebar-footer">
              <div class="user-info">
                <div class="user-avatar">👤</div>
                <div class="user-details">
                  <div class="user-name">${user.fullName || user.username}</div>
                  <div class="user-role">${user.role || 'User'}</div>
                </div>
              </div>
              <button onclick="logout()" class="btn-logout">Logout</button>
            </div>
          </aside>

          <main class="main-content">
            <div class="content-header">
              <div>
                <h2>📦 Archived Documents</h2>
                <p style="margin: 0.5rem 0 0 0; color: #666; font-size: 0.875rem;">View and restore archived documents</p>
              </div>
            </div>
            
            <div class="search-filters-inline">
              <input type="text" id="searchInput" placeholder="🔍 Search archives..." class="form-control search-inline">
              <select id="priorityFilter" class="form-control filter-inline">
                <option value="">Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <button onclick="router.resetFilters()" class="btn btn--secondary btn-clear">Clear</button>
            </div>
            
            <div id="message"></div>
            
            <div class="documents-container">
              <div id="documentsList"></div>
              <div id="pagination"></div>
            </div>
          </main>
        </div>
      `;

      document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
      document.getElementById('priorityFilter').addEventListener('change', () => this.applyFilters());

      this.renderArchivedDocuments();
    } catch (error) {
      console.error('Archive error:', error);
      if (error.message.includes('Authentication')) {
        auth.removeToken();
        this.navigate('/login');
      } else {
        this.showMessage(error.message, 'error');
      }
    }
  },
  async showAdminPanel() {
    console.log('showAdminPanel() called');
    const user = auth.getUser();

    try {
      const [statsData, usersData, pendingData] = await Promise.all([
        api.get('/users/stats'),
        api.get('/users/list'),
        api.get('/users/pending')
      ]);

      document.getElementById('app').innerHTML = `
        <div class="app-layout">
          <aside class="sidebar">
            <div class="sidebar-header">
              <h1>📄 DocTrack</h1>
            </div>
            <nav class="sidebar-nav">
              <a href="/dashboard" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/dashboard');">
                <span class="sidebar-icon">📋</span>
                <span>My Documents</span>
              </a>
              <a href="/archives" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/archives');">
                <span class="sidebar-icon">📦</span>
                <span>Archives</span>
              </a>
              <a href="/admin" class="sidebar-link active" onclick="event.preventDefault(); router.navigate('/admin');">
                <span class="sidebar-icon">⚙️</span>
                <span>Admin Panel</span>
              </a>
            </nav>
            <div class="sidebar-footer">
              <div class="user-info">
                <div class="user-avatar">👤</div>
                <div class="user-details">
                  <div class="user-name">${user.fullName || user.username}</div>
                  <div class="user-role">${user.role || 'User'}</div>
                </div>
              </div>
              <button onclick="logout()" class="btn-logout">Logout</button>
            </div>
          </aside>

          <main class="main-content">
            <div class="content-header">
              <h2>⚙️ Admin Panel</h2>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">Total Users</div>
                <div style="font-size: 2.5rem; font-weight: 700;">${statsData.user_stats.total_users || 0}</div>
              </div>
              <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">Pending Approvals</div>
                <div style="font-size: 2.5rem; font-weight: 700;">${statsData.user_stats.pending_users || 0}</div>
              </div>
              <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">Active Users</div>
                <div style="font-size: 2.5rem; font-weight: 700;">${statsData.user_stats.active_users || 0}</div>
              </div>
              <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">Total Documents</div>
                <div style="font-size: 2.5rem; font-weight: 700;">${statsData.document_stats.total_documents || 0}</div>
              </div>
            </div>

            <div id="adminMessage"></div>

            ${pendingData.pending_users.length > 0 ? `
            <div style="background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid #f59e0b;">
              <h3 style="margin: 0 0 1rem 0; color: #f59e0b; display: flex; align-items: center; gap: 0.5rem;">
                <span>⚠️</span>
                <span>Pending User Registrations (${pendingData.pending_users.length})</span>
              </h3>
              <div style="overflow-x: auto;">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Registered</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${pendingData.pending_users.map(u => `
                      <tr>
                        <td>${u.full_name}</td>
                        <td>${u.username}</td>
                        <td>${u.email}</td>
                        <td>${u.department || 'N/A'}</td>
                        <td>${new Date(u.created_at).toLocaleDateString()}</td>
                        <td>
                          <div style="display: flex; gap: 0.5rem;">
                            <button onclick="approveUser(${u.user_id}, '${u.username}')" class="btn btn--sm" style="background: #10b981; color: white;">✓ Approve</button>
                            <button onclick="rejectUser(${u.user_id}, '${u.username}')" class="btn btn--sm" style="background: #ef4444; color: white;">✕ Reject</button>
                          </div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
            ` : ''}

            <div style="background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h3 style="margin: 0 0 1rem 0;">👥 All Users</h3>
              <div style="overflow-x: auto;">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Registered</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${usersData.users.map(u => `
                      <tr style="${u.is_active === 0 ? 'opacity: 0.6; background: #fef3c7;' : ''}">
                        <td>${u.full_name}</td>
                        <td>${u.username}</td>
                        <td>${u.email}</td>
                        <td>${u.department || 'N/A'}</td>
                        <td>
                          <span style="padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; ${
                            u.role === 'admin' 
                              ? 'background: #dbeafe; color: #1e40af;' 
                              : 'background: #e5e7eb; color: #374151;'
                          }">
                            ${u.role === 'admin' ? '👑 Admin' : 'User'}
                          </span>
                        </td>
                        <td>
                          <span style="padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; ${
                            u.is_active === 1 
                              ? 'background: #d1fae5; color: #065f46;' 
                              : 'background: #fee2e2; color: #991b1b;'
                          }">
                            ${u.is_active === 1 ? '✓ Active' : '✕ Inactive'}
                          </span>
                        </td>
                        <td style="font-size: 0.875rem;">${new Date(u.created_at).toLocaleDateString()}</td>
                        <td>
                          <div style="display: flex; gap: 0.25rem; flex-wrap: wrap;">
                            ${u.is_active === 1 ? `
                              <button onclick="deactivateUser(${u.user_id}, '${u.username}')" class="btn btn--sm" style="background: #f59e0b; color: white; font-size: 0.75rem; padding: 0.4rem 0.6rem;">Deactivate</button>
                            ` : `
                              <button onclick="reactivateUser(${u.user_id}, '${u.username}')" class="btn btn--sm" style="background: #10b981; color: white; font-size: 0.75rem; padding: 0.4rem 0.6rem;">Reactivate</button>
                            `}
                            ${u.role !== 'admin' ? `
                              <button onclick="makeAdmin(${u.user_id}, '${u.username}')" class="btn btn--sm" style="background: #3b82f6; color: white; font-size: 0.75rem; padding: 0.4rem 0.6rem;">Make Admin</button>
                            ` : `
                              <button onclick="removeAdmin(${u.user_id}, '${u.username}')" class="btn btn--sm" style="background: #6b7280; color: white; font-size: 0.75rem; padding: 0.4rem 0.6rem;">Remove Admin</button>
                            `}
                            <button onclick="deleteUser(${u.user_id}, '${u.username}')" class="btn btn--sm" style="background: #ef4444; color: white; font-size: 0.75rem; padding: 0.4rem 0.6rem;">Delete</button>
                          </div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>
      `;

    } catch (error) {
      console.error('Admin panel error:', error);
      if (error.message.includes('Authentication')) {
        auth.removeToken();
        this.navigate('/login');
      } else {
        alert('Error loading admin panel: ' + error.message);
        this.navigate('/dashboard');
      }
    }
  },
  handleSearch(searchTerm) {
    this.applyFilters(searchTerm);
  },

  applyFilters(searchTerm = null) {
    const search = searchTerm !== null ? searchTerm : document.getElementById('searchInput')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const priorityFilter = document.getElementById('priorityFilter')?.value || '';

    this.filteredDocuments = this.allDocuments.filter(doc => {
      const matchesSearch = !search || 
        doc.title.toLowerCase().includes(search.toLowerCase()) ||
        doc.document_type.toLowerCase().includes(search.toLowerCase()) ||
        doc.document_number.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = !statusFilter || doc.status === statusFilter;
      const matchesPriority = !priorityFilter || doc.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });

    this.currentPage = 1;
    
    if (this.currentRoute === '/archives') {
      this.renderArchivedDocuments();
    } else {
      this.renderDocuments();
    }
  },

  resetFilters() {
    document.getElementById('searchInput').value = '';
    if (document.getElementById('statusFilter')) {
      document.getElementById('statusFilter').value = '';
    }
    if (document.getElementById('priorityFilter')) {
      document.getElementById('priorityFilter').value = '';
    }
    this.filteredDocuments = [...this.allDocuments];
    this.currentPage = 1;
    
    if (this.currentRoute === '/archives') {
      this.renderArchivedDocuments();
    } else {
      this.renderDocuments();
    }
  },

  sortDocuments(column) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredDocuments.sort((a, b) => {
      let aVal = a[column];
      let bVal = b[column];

      if (column === 'uploaded_at' || column === 'archived_at') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    if (this.currentRoute === '/archives') {
      this.renderArchivedDocuments();
    } else {
      this.renderDocuments();
    }
  },

  renderDocuments() {
    const container = document.getElementById('documentsList');
    const paginationContainer = document.getElementById('pagination');

    if (this.filteredDocuments.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p style="font-size: var(--font-size-lg); margin-bottom: var(--space-8);">No documents found</p>
          <p style="color: var(--color-text-secondary); margin-bottom: var(--space-24);">
            ${this.allDocuments.length === 0 ? 'Get started by adding your first document' : 'Try adjusting your search or filters'}
          </p>
          ${this.allDocuments.length === 0 ? '<button onclick="openDocumentFormModal()" class="btn btn--primary">Upload Document</button>' : ''}
        </div>
      `;
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    const totalPages = Math.ceil(this.filteredDocuments.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginatedDocs = this.filteredDocuments.slice(startIndex, endIndex);

    const getSortIcon = (column) => {
      if (this.sortColumn !== column) return '⇅';
      return this.sortDirection === 'asc' ? '↑' : '↓';
    };

    container.innerHTML = `
      <div style="margin-bottom: 1rem; color: #666; font-size: 0.9rem; padding: 0 1rem;">
        Showing ${startIndex + 1}-${Math.min(endIndex, this.filteredDocuments.length)} of ${this.filteredDocuments.length} documents
      </div>
      
      <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
        <table class="table" style="min-width: 1200px; table-layout: fixed;">
          <thead>
            <tr>
              <th style="width: 140px; cursor: pointer;" onclick="router.sortDocuments('document_number')">
                Document # ${getSortIcon('document_number')}
              </th>
              <th style="width: 180px; cursor: pointer;" onclick="router.sortDocuments('title')">
                Title ${getSortIcon('title')}
              </th>
              <th style="width: 100px; cursor: pointer;" onclick="router.sortDocuments('document_type')">
                Type ${getSortIcon('document_type')}
              </th>
              <th style="width: 90px; cursor: pointer;" onclick="router.sortDocuments('priority')">
                Priority ${getSortIcon('priority')}
              </th>
              <th style="width: 90px; cursor: pointer;" onclick="router.sortDocuments('status')">
                Status ${getSortIcon('status')}
              </th>
              <th style="width: 140px;">Current Location</th>
              <th style="width: 120px;">Uploaded By</th>
              <th style="width: 100px; cursor: pointer;" onclick="router.sortDocuments('uploaded_at')">
                Date ${getSortIcon('uploaded_at')}
              </th>
              <th style="width: 380px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${paginatedDocs.map(doc => `
              <tr>
                <td style="font-size: 0.85rem;">${doc.document_number}</td>
                <td style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${doc.title}">${doc.title}</td>
                <td>${doc.document_type}</td>
                <td>${this.getPriorityBadge(doc.priority)}</td>
                <td>${this.getStatusBadge(doc.status)}</td>
                <td style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${doc.current_destination || doc.current_holder_name || '-'}">${doc.current_destination || doc.current_holder_name || '-'}</td>
                <td>${doc.uploaded_by_name || 'N/A'}</td>
                <td style="font-size: 0.85rem;">${new Date(doc.uploaded_at).toLocaleDateString()}</td>
                <td>
                  <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                    <button onclick="viewDocument(${doc.document_id})" class="btn btn--sm" title="View" style="min-width: 50px;">View</button>
                    <button onclick="editDocument(${doc.document_id})" class="btn btn--sm" title="Edit" style="min-width: 50px;">Edit</button>
                    <button onclick="viewDocumentHistory(${doc.document_id}, '${doc.title.replace(/'/g, "\\'")}' )" class="btn btn--sm" title="History" style="background: #6366f1; color: white; min-width: 60px;">History</button>
                    <button onclick="routeDocument(${doc.document_id})" class="btn btn--sm btn--primary" title="Route" style="min-width: 55px;">Route</button>
                    <button onclick="archiveDocument(${doc.document_id})" class="btn btn--sm" title="Archive" style="background: #f59e0b; color: white; min-width: 65px;">Archive</button>
                    <button onclick="deleteDocument(${doc.document_id}, '${doc.title.replace(/'/g, "\\'")}' )" class="btn btn--sm" title="Delete" style="background: #ef4444; color: white; min-width: 60px;">Delete</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    this.renderPagination(paginationContainer, totalPages);
  },

  renderArchivedDocuments() {
    const container = document.getElementById('documentsList');
    const paginationContainer = document.getElementById('pagination');

    if (this.filteredDocuments.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p style="font-size: 3rem; margin-bottom: 1rem;">📦</p>
          <p style="font-size: var(--font-size-lg); margin-bottom: var(--space-8);">No archived documents</p>
          <p style="color: var(--color-text-secondary);">
            ${this.allDocuments.length === 0 ? 'Archived documents will appear here' : 'Try adjusting your search'}
          </p>
        </div>
      `;
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    const totalPages = Math.ceil(this.filteredDocuments.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginatedDocs = this.filteredDocuments.slice(startIndex, endIndex);

    const getSortIcon = (column) => {
      if (this.sortColumn !== column) return '⇅';
      return this.sortDirection === 'asc' ? '↑' : '↓';
    };

    container.innerHTML = `
      <div style="margin-bottom: 1rem; color: #666; font-size: 0.9rem; padding: 0 1rem;">
        Showing ${startIndex + 1}-${Math.min(endIndex, this.filteredDocuments.length)} of ${this.filteredDocuments.length} archived documents
      </div>
      
      <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
        <table class="table" style="min-width: 1200px; table-layout: fixed;">
          <thead>
            <tr>
              <th style="width: 140px; cursor: pointer;" onclick="router.sortDocuments('document_number')">
                Document # ${getSortIcon('document_number')}
              </th>
              <th style="width: 200px; cursor: pointer;" onclick="router.sortDocuments('title')">
                Title ${getSortIcon('title')}
              </th>
              <th style="width: 120px; cursor: pointer;" onclick="router.sortDocuments('document_type')">
                Type ${getSortIcon('document_type')}
              </th>
              <th style="width: 100px; cursor: pointer;" onclick="router.sortDocuments('priority')">
                Priority ${getSortIcon('priority')}
              </th>
              <th style="width: 140px;">Archived By</th>
              <th style="width: 120px; cursor: pointer;" onclick="router.sortDocuments('archived_at')">
                Archived Date ${getSortIcon('archived_at')}
              </th>
              <th style="width: 120px; cursor: pointer;" onclick="router.sortDocuments('uploaded_at')">
                Upload Date ${getSortIcon('uploaded_at')}
              </th>
              <th style="width: 300px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${paginatedDocs.map(doc => `
              <tr>
                <td style="font-size: 0.85rem;">${doc.document_number}</td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${doc.title}">${doc.title}</td>
                <td>${doc.document_type}</td>
                <td>${this.getPriorityBadge(doc.priority)}</td>
                <td>${doc.uploaded_by_name || 'N/A'}</td>
                <td style="font-size: 0.85rem;">${doc.archived_at ? new Date(doc.archived_at).toLocaleDateString() : 'N/A'}</td>
                <td style="font-size: 0.85rem;">${new Date(doc.uploaded_at).toLocaleDateString()}</td>
                <td>
                  <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                    <button onclick="viewDocument(${doc.document_id})" class="btn btn--sm" title="View" style="min-width: 50px;">View</button>
                    <button onclick="viewDocumentHistory(${doc.document_id}, '${doc.title.replace(/'/g, "\\'")}' )" class="btn btn--sm" title="History" style="background: #6366f1; color: white; min-width: 60px;">History</button>
                    <button onclick="restoreDocument(${doc.document_id})" class="btn btn--sm btn--primary" title="Restore" style="background: #10b981; color: white; min-width: 65px;">Restore</button>
                    <button onclick="deleteDocument(${doc.document_id}, '${doc.title.replace(/'/g, "\\'")}' )" class="btn btn--sm" title="Delete" style="background: #ef4444; color: white; min-width: 60px;">Delete</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    this.renderPagination(paginationContainer, totalPages);
  },

  renderPagination(paginationContainer, totalPages) {
    if (totalPages > 1) {
      let paginationHTML = '<div style="display: flex; justify-content: center; align-items: center; gap: 0.5rem; flex-wrap: wrap; padding: 1rem;">';
      
      paginationHTML += `
        <button onclick="router.goToPage(${this.currentPage - 1})" 
                ${this.currentPage === 1 ? 'disabled' : ''} 
                class="btn btn--sm" 
                style="${this.currentPage === 1 ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
          ← Previous
        </button>
      `;

      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
          paginationHTML += `
            <button onclick="router.goToPage(${i})" 
                    class="btn btn--sm ${i === this.currentPage ? 'btn--primary' : ''}" 
                    style="min-width: 40px;">
              ${i}
            </button>
          `;
        } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
          paginationHTML += '<span style="padding: 0 0.5rem;">...</span>';
        }
      }

      paginationHTML += `
        <button onclick="router.goToPage(${this.currentPage + 1})" 
                ${this.currentPage === totalPages ? 'disabled' : ''} 
                class="btn btn--sm" 
                style="${this.currentPage === totalPages ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
          Next →
        </button>
      `;

      paginationHTML += '</div>';
      paginationContainer.innerHTML = paginationHTML;
    } else {
      paginationContainer.innerHTML = '';
    }
  },

  goToPage(page) {
    const totalPages = Math.ceil(this.filteredDocuments.length / this.itemsPerPage);
    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;
      if (this.currentRoute === '/archives') {
        this.renderArchivedDocuments();
      } else {
        this.renderDocuments();
      }
    }
  },

  getPriorityBadge(priority) {
    const colors = {
      low: 'background: #dbeafe; color: #1e40af;',
      medium: 'background: #fef3c7; color: #92400e;',
      high: 'background: #fed7aa; color: #9a3412;',
      urgent: 'background: #fee2e2; color: #991b1b;'
    };
    return `<span style="padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; ${colors[priority] || colors.medium}">${priority}</span>`;
  },

  getStatusBadge(status) {
    const colors = {
      pending: 'background: #fef3c7; color: #92400e;',
      in_progress: 'background: #dbeafe; color: #1e40af;',
      routed: 'background: #e0e7ff; color: #3730a3;',
      completed: 'background: #d1fae5; color: #065f46;'
    };
    return `<span style="padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; ${colors[status] || colors.pending}">${status.replace('_', ' ')}</span>`;
  },

  showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('message');
    if (!messageDiv) return;

    const colors = {
      success: 'background: #d1fae5; color: #065f46; border-left: 4px solid #10b981;',
      error: 'background: #fee2e2; color: #991b1b; border-left: 4px solid #ef4444;',
      info: 'background: #dbeafe; color: #1e40af; border-left: 4px solid #3b82f6;'
    };

    messageDiv.innerHTML = `
      <div style="padding: 1rem; margin-bottom: 1rem; border-radius: 4px; ${colors[type] || colors.info}">
        ${message}
      </div>
    `;

    setTimeout(() => {
      messageDiv.innerHTML = '';
    }, 5000);
  }
};
// Admin User Management Functions
async function approveUser(userId, username) {
  if (!confirm(`Approve user "${username}"?`)) return;
  try {
    const result = await api.post('/users/approve', { user_id: userId });
    alert(result.message || 'User approved!');
    router.showAdminPanel();
  } catch (error) {
    alert('Failed: ' + error.message);
  }
}

async function rejectUser(userId, username) {
  if (!confirm(`Reject "${username}"? Cannot be undone.`)) return;
  try {
    const result = await api.post('/users/reject', { user_id: userId });
    alert(result.message || 'User rejected!');
    router.showAdminPanel();
  } catch (error) {
    alert('Failed: ' + error.message);
  }
}

async function deactivateUser(userId, username) {
  if (!confirm(`Deactivate "${username}"?`)) return;
  try {
    const result = await api.post('/users/deactivate', { user_id: userId });
    alert(result.message || 'User deactivated!');
    router.showAdminPanel();
  } catch (error) {
    alert('Failed: ' + error.message);
  }
}

async function reactivateUser(userId, username) {
  if (!confirm(`Reactivate "${username}"?`)) return;
  try {
    const result = await api.post('/users/reactivate', { user_id: userId });
    alert(result.message || 'User reactivated!');
    router.showAdminPanel();
  } catch (error) {
    alert('Failed: ' + error.message);
  }
}

async function makeAdmin(userId, username) {
  if (!confirm(`Grant admin privileges to "${username}"?`)) return;
  try {
    const result = await api.post('/users/update-role', { user_id: userId, role: 'admin' });
    alert(result.message || 'User promoted to admin!');
    router.showAdminPanel();
  } catch (error) {
    alert('Failed: ' + error.message);
  }
}

async function removeAdmin(userId, username) {
  if (!confirm(`Remove admin privileges from "${username}"?`)) return;
  try {
    const result = await api.post('/users/update-role', { user_id: userId, role: 'user' });
    alert(result.message || 'Admin privileges removed!');
    router.showAdminPanel();
  } catch (error) {
    alert('Failed: ' + error.message);
  }
}

async function deleteUser(userId, username) {
  if (!confirm(`PERMANENTLY DELETE user "${username}"?\n\nThis CANNOT be undone!`)) return;
  try {
    const result = await api.post('/users/delete', { user_id: userId });
    alert(result.message || 'User deleted!');
    router.showAdminPanel();
  } catch (error) {
    alert('Failed: ' + error.message);
  }
}

// Document Management Functions (you already have these, keeping them here for completeness)
async function viewDocument(documentId) {
  try {
    const data = await api.get(`/data/documents?id=${documentId}`);
    if (data.success && data.document) {
      viewModal.open(documentId, data.document);
    }
  } catch (error) {
    alert('Error loading document: ' + error.message);
  }
}

async function editDocument(documentId) {
  try {
    const data = await api.get(`/data/documents?id=${documentId}`);
    if (data.success && data.document) {
      editModal.open(data.document, async (updatedData) => {
        try {
          await api.put('/data/documents', updatedData);
          alert('Document updated successfully!');
          router.handleRoute();
        } catch (error) {
          alert('Error updating document: ' + error.message);
        }
      });
    }
  } catch (error) {
    alert('Error loading document: ' + error.message);
  }
}

async function deleteDocument(documentId, title) {
  if (!confirm(`Are you sure you want to delete "${title}"?\n\nThis will permanently delete the document and its file from storage.\n\nThis action CANNOT be undone!`)) {
    return;
  }

  try {
    const result = await api.delete(`/data/documents?id=${documentId}`);
    alert(result.message || 'Document deleted successfully!');
    router.handleRoute();
  } catch (error) {
    alert('Error deleting document: ' + error.message);
  }
}

async function archiveDocument(documentId) {
  if (!confirm('Archive this document?')) return;

  try {
    const result = await api.post('/data/documents?action=archive', { document_id: documentId });
    alert(result.message || 'Document archived successfully!');
    router.handleRoute();
  } catch (error) {
    alert('Error archiving document: ' + error.message);
  }
}

async function restoreDocument(documentId) {
  if (!confirm('Restore this document from archives?')) return;  //update

  try {
    const result = await api.post('/data/documents/documents?action=restore', { document_id: documentId });
    alert(result.message || 'Document restored successfully!');
    router.handleRoute();
  } catch (error) {
    alert('Error restoring document: ' + error.message);
  }
}

async function routeDocument(documentId) {
  const destination = prompt('Enter destination/recipient:');
  if (!destination) return;

  try {
    // FIXED: Use PATCH method with destination_text parameters
    const result = await api.request('/data/documents', {
      method: 'PATCH',
      body: JSON.stringify({
        document_id: documentId,
        destination_text: destination
      })
    });
    alert(result.message || 'Document routed successfully!');
    router.handleRoute();
  } catch (error) {
    alert('Error routing document: ' + error.message);
  }
}


async function viewDocumentHistory(documentId, title) {
  try {
    const data = await api.get(`/data/documents?id=${documentId}&history=true`);
    if (data.success && data.history) {
      let historyHtml = `
        <div id="historyModalOverlay" class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
          <div class="modal" style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-width: 800px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <h2 style="margin: 0 0 1.5rem 0;">Document History: ${title}</h2>
            <div style="overflow-x: auto;">
              <table class="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Action</th>
                    <th>User</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.history.map(h => `
                    <tr>
                      <td style="font-size: 0.875rem;">${new Date(h.created_at).toLocaleString()}</td>
                      <td><strong>${h.action}</strong></td>
                      <td>${h.user_name || 'System'}</td>
                      <td style="max-width: 300px;">${h.details || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div style="margin-top: 1.5rem; text-align: right;">
              <button onclick="document.getElementById('historyModalOverlay').remove()" class="btn btn--primary">Close</button>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', historyHtml);
      
      const overlay = document.getElementById('historyModalOverlay');
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });
    }
  } catch (error) {
    alert('Error loading document history: ' + error.message);
  }
}

function openDocumentFormModal() {
  const modalHtml = `
    <div id="uploadModalOverlay" class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
      <div class="modal" style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-width: 600px; width: 90%;">
        <h2 style="margin: 0 0 1.5rem 0;">Upload New Document</h2>
        <form id="uploadDocumentForm">
          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label">Title</label>
            <input type="text" name="title" class="form-control" required>
          </div>
          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label">Description</label>
            <textarea name="description" class="form-control" rows="3"></textarea>
          </div>
          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label">Document Type</label>
            <input type="text" name="document_type" class="form-control" required>
          </div>
          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label">Priority</label>
            <select name="priority" class="form-control" required>
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label">File (optional)</label>
            <input type="file" name="file" class="form-control">
          </div>
          <div style="display: flex; gap: 1rem; justify-content: flex-end;">
            <button type="button" onclick="document.getElementById('uploadModalOverlay').remove()" class="btn btn--secondary">Cancel</button>
            <button type="submit" class="btn btn--primary">Upload</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('uploadDocumentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      const result = await api.uploadFile('/data/documents', formData);
      alert(result.message || 'Document uploaded successfully!');
      document.getElementById('uploadModalOverlay').remove();
      router.handleRoute();
    } catch (error) {
      alert('Error uploading document: ' + error.message);
    }
  });

  const overlay = document.getElementById('uploadModalOverlay');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

function logout() {
  if (confirm('Are you sure you want to logout?')) {
    auth.removeToken();
    router.navigate('/login');
  }
}

// Initialize router when page loads
document.addEventListener('DOMContentLoaded', () => {
  router.init();
});

// Make everything accessible globally
window.router = router;
window.api = api;
window.auth = auth;
window.viewModal = viewModal;
window.editModal = editModal;
window.formatFileSize = formatFileSize;
window.viewDocument = viewDocument;
window.editDocument = editDocument;
window.viewDocumentHistory = viewDocumentHistory;
window.routeDocument = routeDocument;
window.archiveDocument = archiveDocument;
window.restoreDocument = restoreDocument;
window.deleteDocument = deleteDocument;
window.openDocumentFormModal = openDocumentFormModal;
window.logout = logout;
window.approveUser = approveUser;
window.rejectUser = rejectUser;
window.deactivateUser = deactivateUser;
window.reactivateUser = reactivateUser;
window.makeAdmin = makeAdmin;
window.removeAdmin = removeAdmin;
window.deleteUser = deleteUser;
