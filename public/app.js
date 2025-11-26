// Main Application JavaScript
// Handles routing and API calls with full CRUD operations

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
    const fileExtension = documentData.file_path.split('.').pop().toLowerCase();
    const isPDF = fileExtension === 'pdf';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension);
    const isOffice = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileExtension);
    const isViewable = isPDF || isImage || isOffice;

    const viewUrl = `/api/data/documents?id=${documentId}&view=true`;
    const downloadUrl = `/api/data/documents?id=${documentId}&download=true`;
    
    // Use Google Docs Viewer for Office documents
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
              <a href="${downloadUrl}" class="btn btn--sm btn--primary" style="text-decoration: none;">
                📥 Download
              </a>
              <button id="viewCloseBtn" class="btn btn--sm" style="padding: 0.5rem; cursor: pointer; font-size: 1.5rem; line-height: 1;">
                ✕
              </button>
            </div>
          </div>
          <div style="flex: 1; overflow: auto; padding: 1rem; display: flex; justify-content: center; align-items: center; background: #f5f5f5;">
            ${isViewable ? `
              ${isPDF || isOffice ? `
                <iframe src="${previewUrl}" style="width: 100%; height: 100%; border: none; background: white;"></iframe>
              ` : `
                <img src="${viewUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="${documentData.title}">
              `}
            ` : `
              <div style="text-align: center; padding: 2rem;">
                <p style="font-size: 3rem; margin-bottom: 1rem;">📄</p>
                <p style="font-size: 1.25rem; margin-bottom: 0.5rem;">${documentData.file_path}</p>
                <p style="color: #666; margin-bottom: 1.5rem;">Preview not available for this file type</p>
                <a href="${downloadUrl}" class="btn btn--primary">Download to View</a>
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
              <div>
                <strong style="color: #666; font-size: 0.875rem;">File Size:</strong>
                <p style="margin: 0.25rem 0 0 0;">${formatFileSize(documentData.file_size)}</p>
              </div>
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

// Route Modal
const routeModal = {
  open(documentId, users, onSelect) {
    const userOptions = users.map(user => `
      <option value="${user.user_id}">${user.full_name || user.username}</option>
    `).join('');

    const modalHtml = `
      <div id="routeModalOverlay" class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
        <div class="modal" style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-width: 400px; width: 90%;">
          <div style="margin-bottom: 1.5rem;">
            <h2 style="margin: 0; font-size: 1.5rem;">Route Document</h2>
            <p style="margin: 0.5rem 0 0 0; color: #666;">Select a user to route this document to:</p>
          </div>
          <div style="margin-bottom: 1.5rem;">
            <select id="routeUserSelect" class="form-control" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
              <option value="">-- Select a user --</option>
              ${userOptions}
            </select>
          </div>
          <div style="display: flex; gap: 1rem; justify-content: flex-end;">
            <button id="routeCancelBtn" class="btn btn--secondary" style="padding: 0.5rem 1rem; cursor: pointer;">Cancel</button>
            <button id="routeConfirmBtn" class="btn btn--primary" style="padding: 0.5rem 1rem; cursor: pointer;">Confirm</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const overlay = document.getElementById('routeModalOverlay');
    const userSelect = document.getElementById('routeUserSelect');
    const cancelBtn = document.getElementById('routeCancelBtn');
    const confirmBtn = document.getElementById('routeConfirmBtn');

    cancelBtn.addEventListener('click', () => overlay.remove());

    confirmBtn.addEventListener('click', () => {
      const selectedUserId = userSelect.value;
      if (selectedUserId) {
        onSelect(selectedUserId);
        overlay.remove();
      } else {
        alert('Please select a user.');
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
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
              <button onclick="openDocumentFormModal()" class="btn btn--primary btn--sm">+ Add Document</button>
              <a href="#" onclick="router.navigate('/archives'); return false;" class="btn btn--secondary btn--sm">Archives</a>
              ${user.role === 'admin' ? '<a href="#" onclick="router.navigate(\'/admin\'); return false;" class="btn btn--secondary btn--sm">Admin Panel</a>' : ''}
              <a href="#" onclick="logout(); return false;" class="btn btn--outline btn--sm">Logout</a>
            </div>
          </div>
        </nav>
        <div class="container" style="padding: var(--space-32) 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-24);">
            <h2 style="margin: 0;">My Documents</h2>
            <button onclick="openDocumentFormModal()" class="btn btn--primary">+ Upload Document</button>
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
          <button onclick="openDocumentFormModal()" class="btn btn--primary">Upload Document</button>
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
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                  <button onclick="viewDocument(${doc.document_id})" class="btn btn--sm" title="View">👁️</button>
                  <button onclick="editDocument(${doc.document_id})" class="btn btn--sm" title="Edit">✏️</button>
                  <button onclick="routeDocument(${doc.document_id})" class="btn btn--sm btn--primary" title="Route">📤</button>
                  <button onclick="archiveDocument(${doc.document_id})" class="btn btn--sm" title="Archive" style="background: #f59e0b; color: white;">📦</button>
                  <button onclick="deleteDocument(${doc.document_id}, '${doc.title}')" class="btn btn--sm" title="Delete" style="background: #ef4444; color: white;">🗑️</button>
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

function routeDocument(documentId) {
  api.get('/users/list')
    .then(response => {
      if (response.users && routeModal) {
        routeModal.open(documentId, response.users, async (selectedUserId) => {
          try {
            const result = await api.request(`/data/documents`, {
              method: 'PATCH',
              body: JSON.stringify({
                document_id: documentId,
                new_holder: selectedUserId
              })
            });

            alert(result.message || 'Document routed successfully!');
            router.showDashboard();
          } catch (error) {
            alert('Failed to route document: ' + error.message);
          }
        });
      } else {
        alert('Failed to load users for routing.');
      }
    })
    .catch(error => {
      alert('Failed to load users: ' + error.message);
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

async function deleteDocument(id, title) {
  if (!confirm(`Are you sure you want to permanently delete "${title}"?\n\nThis will also delete the file from MEGA storage and cannot be undone!`)) {
    return;
  }

  try {
    const result = await api.delete(`/data/documents?id=${id}`);
    alert(result.message || 'Document deleted successfully!');
    router.showDashboard();
  } catch (error) {
    alert('Failed to delete document: ' + error.message);
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  router.init();
});

// Make everything accessible globally
window.router = router;
window.api = api;
window.auth = auth;
window.routeModal = routeModal;
window.viewModal = viewModal;
window.editModal = editModal;
window.formatFileSize = formatFileSize;
window.viewDocument = viewDocument;
window.editDocument = editDocument;
window.routeDocument = routeDocument;
window.archiveDocument = archiveDocument;
window.deleteDocument = deleteDocument;
window.logout = logout;
