// Main Application JavaScript
// Handles routing and API calls with full CRUD operations + Search, Pagination, Sorting
// RESPONSIVE + TEXT BUTTONS + FIXED WIDTH TABLE + SIDEBAR LAYOUT + INLINE FILTERS + ARCHIVES

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
    console.log('Navigating to:', path); // DEBUG
    window.history.pushState({}, '', path);
    this.handleRoute();
  },

  handleRoute() {
    const path = window.location.pathname;
    console.log('Current path:', path); // DEBUG
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
      console.log('Loading archives page...'); // DEBUG
      if (!auth.isAuthenticated()) {
        this.navigate('/login');
        return;
      }
      this.showArchives();
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
    console.log('showArchives() called'); // DEBUG
    const user = auth.getUser();

    try {
      const data = await api.get('/data/dashboard');
      this.allDocuments = (data.documents || []).filter(doc => doc.is_archived === 1);
      this.filteredDocuments = [...this.allDocuments];
      
      console.log('Archived documents:', this.allDocuments.length); // DEBUG

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
      console.error('Archive error:', error); // DEBUG
      if (error.message.includes('Authentication')) {
        auth.removeToken();
        this.navigate('/login');
      } else {
        this.showMessage(error.message, 'error');
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
                    <button onclick="viewDocumentHistory(${doc.document_id}, '${doc.title.replace(/'/g, "\\'")}')" class="btn btn--sm" title="History" style="background: #6366f1; color: white; min-width: 60px;">History</button>
                    <button onclick="routeDocument(${doc.document_id})" class="btn btn--sm btn--primary" title="Route" style="min-width: 55px;">Route</button>
                    <button onclick="archiveDocument(${doc.document_id})" class="btn btn--sm" title="Archive" style="background: #f59e0b; color: white; min-width: 65px;">Archive</button>
                    <button onclick="deleteDocument(${doc.document_id}, '${doc.title.replace(/'/g, "\\'")}')" class="btn btn--sm" title="Delete" style="background: #ef4444; color: white; min-width: 60px;">Delete</button>
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
                    <button onclick="viewDocumentHistory(${doc.document_id}, '${doc.title.replace(/'/g, "\\'")}')" class="btn btn--sm" title="History" style="background: #6366f1; color: white; min-width: 60px;">History</button>
                    <button onclick="restoreDocument(${doc.document_id})" class="btn btn--sm btn--primary" title="Restore" style="background: #10b981; color: white; min-width: 65px;">Restore</button>
                    <button onclick="deleteDocument(${doc.document_id}, '${doc.title.replace(/'/g, "\\'")}')" class="btn btn--sm" title="Delete" style="background: #ef4444; color: white; min-width: 60px;">Delete</button>
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
    if (page < 1 || page > totalPages) return;
    this.currentPage = page;
    
    if (this.currentRoute === '/archives') {
      this.renderArchivedDocuments();
    } else {
      this.renderDocuments();
    }
  },

  getStatusBadge(status) {
    const badges = {
      'pending': '<span class="status status--warning">Pending</span>',
      'in_progress': '<span class="status status--info">In Progress</span>',
      'completed': '<span class="status status--success">Completed</span>',
      'archived': '<span class="status">Archived</span>',
      'routed': '<span class="status status--info">Routed</span>'
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

// Global CRUD functions
function logout() {
  auth.removeToken();
  router.navigate('/login');
}

async function viewDocument(id) {
  try {
    const response = await api.get(`/data/documents?id=${id}`);
    if (response.success && response.document) {
      viewModal.open(id, response.document);
    } else {
      alert('Failed to load document details');
    }
  } catch (error) {
    alert('Error viewing document: ' + error.message);
  }
}

async function editDocument(id) {
  try {
    const response = await api.get(`/data/documents?id=${id}`);
    if (response.success && response.document) {
      editModal.open(response.document, async (updatedData) => {
        try {
          const result = await api.put('/data/documents', updatedData);
          alert(result.message || 'Document updated successfully!');
          router.showDashboard();
        } catch (error) {
          alert('Failed to update document: ' + error.message);
        }
      });
    } else {
      alert('Failed to load document details');
    }
  } catch (error) {
    alert('Error loading document: ' + error.message);
  }
}

async function viewDocumentHistory(documentId, documentTitle) {
  if (window.openHistoryModal) {
    window.openHistoryModal(documentId, documentTitle);
  } else {
    alert('History modal not loaded. Please refresh the page.');
  }
}

function routeDocument(documentId) {
  const modalHtml = `
    <div id="routeModalOverlay" class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
      <div class="modal" style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-width: 500px; width: 90%;">
        <div style="margin-bottom: 1.5rem;">
          <h2 style="margin: 0 0 0.5rem 0; font-size: 1.5rem;">📤 Route Document</h2>
          <p style="margin: 0; color: #666; font-size: 0.875rem;">Enter where you're sending this document</p>
        </div>
        <form id="routeTextForm">
          <div style="margin-bottom: 1.5rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Send to:</label>
            <input type="text" id="destinationText" placeholder="e.g., Accounting Department, Manager's Office, HR - John Doe" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;" required autofocus>
            <small style="display: block; margin-top: 0.5rem; color: #666;">Type the department, office, or person's name</small>
          </div>
          <div style="display: flex; gap: 1rem; justify-content: flex-end;">
            <button type="button" id="routeTextCancelBtn" class="btn btn--secondary" style="padding: 0.5rem 1rem; cursor: pointer;">Cancel</button>
            <button type="submit" class="btn btn--primary" style="padding: 0.5rem 1.5rem; cursor: pointer;">📤 Route Document</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const overlay = document.getElementById('routeModalOverlay');
  const form = document.getElementById('routeTextForm');
  const input = document.getElementById('destinationText');
  const cancelBtn = document.getElementById('routeTextCancelBtn');

  cancelBtn.addEventListener('click', () => overlay.remove());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const destination = input.value.trim();
    
    if (!destination) {
      alert('Please enter a destination');
      return;
    }

    try {
      const result = await api.request(`/data/documents`, {
        method: 'PATCH',
        body: JSON.stringify({
          document_id: documentId,
          destination_text: destination
        })
      });

      alert(result.message || 'Document routed successfully!');
      overlay.remove();
      router.showDashboard();
    } catch (error) {
      alert('Failed to route document: ' + error.message);
    }
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

async function archiveDocument(id) {
  if (!confirm('Are you sure you want to archive this document?')) {
    return;
  }

  try {
    const result = await api.post('/data/documents?action=archive', {
      document_id: id
    });
    alert(result.message || 'Document archived successfully!');
    router.showDashboard();
  } catch (error) {
    alert('Failed to archive document: ' + error.message);
  }
}

async function restoreDocument(id) {
  if (!confirm('Are you sure you want to restore this document?')) {
    return;
  }

  try {
    const result = await api.post('/data/documents?action=restore', {
      document_id: id
    });
    alert(result.message || 'Document restored successfully!');
    router.showArchives();
  } catch (error) {
    alert('Failed to restore document: ' + error.message);
  }
}

async function deleteDocument(id, title) {
  if (!confirm(`Are you sure you want to permanently delete "${title}"?\n\nThis will also delete the file from MEGA storage and cannot be undone!`)) {
    return;
  }

  try {
    const result = await api.delete(`/data/documents?id=${id}`);
    alert(result.message || 'Document deleted successfully!');
    
    if (router.currentRoute === '/archives') {
      router.showArchives();
    } else {
      router.showDashboard();
    }
  } catch (error) {
    alert('Failed to delete document: ' + error.message);
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  console.log('App initialized'); // DEBUG
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
window.logout = logout;
