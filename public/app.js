// Main Application JavaScript
// Handles routing and API calls with full CRUD operations
// Search, Pagination, Sorting
// RESPONSIVE TEXT BUTTONS + FIXED WIDTH TABLE + SIDEBAR LAYOUT + INLINE FILTERS + ARCHIVES + ADMIN PANEL + ADMIN ALL DOCS + LOADING ANIMATIONS + ROUTE MODAL + EXCEL EXPORT

const API_BASE = '/api';

// Auth utilities
const auth = {
  getToken: () => localStorage.getItem('token'),
  setToken: (token) => localStorage.setItem('token', token),
  removeToken: () => localStorage.removeItem('token'),
  getUser: () => {
    const token = auth.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch (e) {
      return null;
    }
  },
  isAuthenticated: () => !!auth.getToken()
};

// API utilities
const api = {
  async request(endpoint, options = {}) {
    const token = auth.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      const text = await response.text();

      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error('Server returned invalid response');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }
      return data;
    } catch (error) {
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
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData
      });

      const text = await response.text();

      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error('Server returned invalid response');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }
      return data;
    } catch (error) {
      throw error;
    }
  }
};

// --- Route Document Modal ---
const routeModal = {
  open(documentId, documentTitle) {
    const modalHtml = `
      <div id="routeModalOverlay" class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
        <div class="modal" style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-width: 500px; width: 90%;">
          <h2 style="margin: 0 0 0.5rem 0; font-size: 1.5rem; color: #1f2937;">Route Document</h2>
          <p style="margin: 0 0 1.5rem 0; color: #64748b; font-size: 0.9rem;">${documentTitle}</p>
          
          <form id="routeDocumentForm">
            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #333;">Destination / Recipient <span style="color:red">*</span></label>
              <input type="text" id="routeDestination" class="form-control" placeholder="e.g., Finance Dept, Mr. Smith" required style="width: 100%; padding: 0.6rem; border: 1px solid #ddd; border-radius: 4px; color: #333;">
            </div>
            
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label class="form-label" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #333;">Action Taken / Remarks <span style="color:red">*</span></label>
              <textarea id="routeRemarks" class="form-control" rows="3" placeholder="What did you do to this document? (e.g., Signed and approved, Reviewed for errors)" required style="width: 100%; padding: 0.6rem; border: 1px solid #ddd; border-radius: 4px; color: #333;"></textarea>
            </div>

            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
              <button type="button" id="routeCancelBtn" class="btn btn--secondary">Cancel</button>
              <button type="submit" id="routeSubmitBtn" class="btn btn--primary">➡️ Route Document</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const overlay = document.getElementById('routeModalOverlay');
    const form = document.getElementById('routeDocumentForm');
    const cancelBtn = document.getElementById('routeCancelBtn');
    const submitBtn = document.getElementById('routeSubmitBtn');

    const close = () => overlay.remove();

    cancelBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const destination = document.getElementById('routeDestination').value;
      const remarks = document.getElementById('routeRemarks').value;

      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
      submitBtn.textContent = 'Routing...';

      try {
        const result = await api.request('/data/documents', {
          method: 'PATCH',
          body: JSON.stringify({
            document_id: documentId,
            destination_text: destination, 
            remarks: remarks
          })
        });

        alert(result.message || 'Document routed successfully!');
        close();
        router.handleRoute(); 
      } catch (error) {
        alert('Error routing document: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        submitBtn.textContent = '➡️ Route Document';
      }
    });
  }
};

// Edit Document Modal
const editModal = {
  open(documentData, onSave) {
    const modalHtml = `
      <div id="editModalOverlay" class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
        <div class="modal" style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-width: 500px; width: 90%;">
          <h2 style="margin: 0 0 1.5rem 0; font-size: 1.5rem; color: #1f2937;">Edit Document</h2>
          <form id="editDocumentForm">
            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #333;">Title</label>
              <input type="text" id="editTitle" class="form-control" value="${documentData.title}" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; color: #333;">
            </div>
            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #333;">Description</label>
              <textarea id="editDescription" class="form-control" rows="3" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; color: #333;">${documentData.description || ''}</textarea>
            </div>
            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #333;">Document Type</label>
              <input type="text" id="editType" class="form-control" value="${documentData.document_type}" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; color: #333;">
            </div>
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label class="form-label" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #333;">Priority</label>
              <select id="editPriority" class="form-control" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; color: #333;">
                <option value="low" ${documentData.priority === 'low' ? 'selected' : ''}>Low</option>
                <option value="medium" ${documentData.priority === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="high" ${documentData.priority === 'high' ? 'selected' : ''}>High</option>
                <option value="urgent" ${documentData.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
              </select>
            </div>
            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
              <button type="button" id="editCancelBtn" class="btn btn--secondary">Cancel</button>
              <button type="submit" id="saveChangesBtn" class="btn btn--primary">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const overlay = document.getElementById('editModalOverlay');
    const form = document.getElementById('editDocumentForm');
    const cancelBtn = document.getElementById('editCancelBtn');
    const saveBtn = document.getElementById('saveChangesBtn');

    cancelBtn.addEventListener('click', () => overlay.remove());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      saveBtn.classList.add('loading');
      saveBtn.textContent = 'Saving...';

      const updatedData = {
        document_id: documentData.document_id,
        title: document.getElementById('editTitle').value,
        description: document.getElementById('editDescription').value,
        document_type: document.getElementById('editType').value,
        priority: document.getElementById('editPriority').value
      };

      await onSave(updatedData);
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
    const filePath = documentData.file_path;
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
              <h2 style="margin: 0; font-size: 1.5rem; color: #1f2937;">${documentData.title}</h2>
              <p style="margin: 0.25rem 0 0 0; color: #666; font-size: 0.875rem;">
                📄 Document ${documentData.document_number} • ${documentData.document_type} • Priority: ${documentData.priority}
              </p>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              ${hasFile ? `<a href="${downloadUrl}" class="btn btn--sm btn--primary" style="text-decoration: none;">📥 Download</a>` : ''}
              <button id="viewCloseBtn" class="btn btn--sm" style="padding: 0.5rem; cursor: pointer; font-size: 1.5rem; line-height: 1; color: #333;">✕</button>
            </div>
          </div>
          <div style="flex: 1; overflow: auto; padding: 1rem; display: flex; justify-content: center; align-items: center; background: #f5f5f5;">
            ${hasFile && isViewable ? (
              isPDF || isOffice
                ? `<iframe src="${previewUrl}" style="width: 100%; height: 100%; border: none; background: white;"></iframe>`
                : `<img src="${viewUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="${documentData.title}">`
            ) : `
              <div style="text-align: center; padding: 2rem;">
                <p style="font-size: 3rem; margin-bottom: 1rem;">📄</p>
                <p style="font-size: 1.25rem; margin-bottom: 0.5rem; color: #333;">${hasFile ? filePath : 'No file attached'}</p>
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
                <strong style="color: #666; font-size: 0.875rem;">Status</strong>
                <p style="margin: 0.25rem 0 0 0; color: #333;">${documentData.status}</p>
              </div>
              <div>
                <strong style="color: #666; font-size: 0.875rem;">Uploaded By</strong>
                <p style="margin: 0.25rem 0 0 0; color: #333;">${documentData.uploaded_by_name || 'N/A'}</p>
              </div>
              <div>
                <strong style="color: #666; font-size: 0.875rem;">Date</strong>
                <p style="margin: 0.25rem 0 0 0; color: #333;">${new Date(documentData.uploaded_at).toLocaleDateString()}</p>
              </div>
              ${hasFile ? `
              <div>
                <strong style="color: #666; font-size: 0.875rem;">File Size</strong>
                <p style="margin: 0.25rem 0 0 0; color: #333;">${formatFileSize(documentData.file_size)}</p>
              </div>` : ''}
            </div>
            ${documentData.description ? `
            <div style="margin-top: 1rem;">
              <strong style="color: #666; font-size: 0.875rem;">Description</strong>
              <p style="margin: 0.25rem 0 0 0; color: #333;">${documentData.description}</p>
            </div>` : ''}
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

  showMessage(message, type = 'info') {
    const msgEl = document.getElementById('message');
    if (msgEl) {
      msgEl.innerHTML = `<div class="p-4 mb-4 text-sm rounded-lg ${type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}" role="alert">${message}</div>`;
      setTimeout(() => msgEl.innerHTML = '', 3000);
    } else {
      alert(message);
    }
  },

  handleSearch(query) {
    const term = query.toLowerCase();
    this.filteredDocuments = this.allDocuments.filter(doc => 
      (doc.title && doc.title.toLowerCase().includes(term)) || 
      (doc.description && doc.description.toLowerCase().includes(term)) ||
      (doc.document_number && doc.document_number.toLowerCase().includes(term))
    );
    if(this.currentRoute === '/archives') this.renderArchivedDocuments();
    else this.renderDocuments();
  },

  applyFilters() {
    const status = document.getElementById('statusFilter')?.value;
    const priority = document.getElementById('priorityFilter')?.value;
    const dateFrom = document.getElementById('dateFromFilter')?.value;
    const dateTo = document.getElementById('dateToFilter')?.value;

    this.filteredDocuments = this.allDocuments.filter(doc => {
      let match = true;
      if (status && doc.status !== status) match = false;
      if (priority && doc.priority !== priority) match = false;
      if (dateFrom && new Date(doc.created_at || doc.uploaded_at) < new Date(dateFrom)) match = false;
      if (dateTo && new Date(doc.created_at || doc.uploaded_at) > new Date(dateTo)) match = false;
      return match;
    });
    if(this.currentRoute === '/archives') this.renderArchivedDocuments();
    else this.renderDocuments();
  },

  resetFilters() {
    const inputs = ['searchInput', 'statusFilter', 'priorityFilter', 'dateFromFilter', 'dateToFilter'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });
    this.filteredDocuments = [...this.allDocuments];
    if(this.currentRoute === '/archives') this.renderArchivedDocuments();
    else this.renderDocuments();
  },

  renderDocuments() {
      const list = document.getElementById('documentsList');
      if(!list) return;
      
      if (this.filteredDocuments.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding: 2rem; color: #666;">No documents found.</div>';
        return;
      }

      list.innerHTML = `
      <div style="overflow-x: auto;">
      <table id="documentsTable" class="table" style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #1f2937; border-bottom: 2px solid #495057;">
            <th style="padding: 12px; text-align: left; color: #ffffff; font-weight: 600;">ID</th>
            <th style="padding: 12px; text-align: left; width: 30%; color: #ffffff; font-weight: 600;">Title</th>
            <th style="padding: 12px; text-align: left; color: #ffffff; font-weight: 600;">Type</th>
            <th style="padding: 12px; text-align: left; color: #ffffff; font-weight: 600;">Current Location</th>
            <th style="padding: 12px; text-align: left; color: #ffffff; font-weight: 600;">Status</th>
            <th style="padding: 12px; text-align: left; color: #ffffff; font-weight: 600;">Priority</th>
            <th style="padding: 12px; text-align: left; color: #ffffff; font-weight: 600;">Date</th>
            <th style="padding: 12px; text-align: right; color: #ffffff; font-weight: 600;">Actions</th>
          </tr>
        </thead>
        <tbody style="color: #333;">
          ${this.filteredDocuments.map(doc => `
            <tr style="border-bottom: 1px solid #ced4da;">
              <td style="padding: 12px;">${doc.document_number || doc.document_id}</td>
              <td style="padding: 12px; white-space: normal; overflow-wrap: anywhere; word-break: break-word;">
                <div style="font-weight: 500; color: #2d3748;">${doc.title}</div>
                <div style="font-size: 0.85em; color: #718096;">${doc.description ? doc.description.substring(0, 50) + (doc.description.length>50?'...':'') : ''}</div>
              </td>
              <td style="padding: 12px;">${doc.document_type}</td>
              <td style="padding: 12px;">${doc.current_destination || 'Origin'}</td>
              <td style="padding: 12px;">
                <span style="padding: 4px 8px; border-radius: 99px; font-size: 0.85em; background: ${doc.status === 'completed' ? '#def7ec' : doc.status === 'urgent' ? '#fde8e8' : '#e1effe'}; color: ${doc.status === 'completed' ? '#03543f' : doc.status === 'urgent' ? '#9b1c1c' : '#1e429f'};">
                  ${doc.status}
                </span>
              </td>
              <td style="padding: 12px;">
                 <span style="padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: bold; color: ${doc.priority === 'urgent' ? '#e53e3e' : doc.priority === 'high' ? '#dd6b20' : '#38a169'};">
                  ${doc.priority.toUpperCase()}
                 </span>
              </td>
              <td style="padding: 12px;">${new Date(doc.uploaded_at || doc.created_at).toLocaleDateString()}</td>
              <td style="padding: 12px; text-align: right;">
                <div style="display: flex; gap: 4px; justify-content: flex-end;">
                  <button onclick="viewDocument(${doc.document_id})" class="btn btn--sm" title="View">👁️</button>
                  <button onclick="editDocument(${doc.document_id})" class="btn btn--sm" title="Edit">✏️</button>
                  <button onclick="routeDocument(${doc.document_id}, '${doc.title.replace(/'/g, "\\'")}')" class="btn btn--sm" title="Route">➡️</button>
                  <button onclick="viewDocumentHistory(${doc.document_id}, '${doc.title.replace(/'/g, "\\'")}')" class="btn btn--sm" title="History">📜</button>
                  ${doc.is_archived ? 
                    `<button onclick="restoreDocument(${doc.document_id})" class="btn btn--sm btn--warning" title="Restore">♻️</button>` : 
                    `<button onclick="archiveDocument(${doc.document_id})" class="btn btn--sm btn--warning" title="Archive">🗄️</button>`
                  }
                  <button onclick="deleteDocument(${doc.document_id}, '${doc.title.replace(/'/g, "\\'")}')" class="btn btn--sm btn--danger" title="Delete">🗑️</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      </div>
     `;
  },
  
  renderArchivedDocuments() {
     this.renderDocuments(); 
  },

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
    } else if (path === '/admin/documents') {
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
      this.showAdminAllDocuments();
    } else {
      this.navigate('/login');
    }
  },

  showLogin() {
    document.getElementById('app').innerHTML = `
      <div class="container">
        <div class="card" style="max-width: 450px; margin: 80px auto;">
          <div class="card-header"><h2 style="margin: 0; text-align: center; color: #1f2937;">Login</h2></div>
          <div class="card-body">
            <div id="message"></div>
            <form id="loginForm">
              <div class="form-group"><label class="form-label" style="color: #333;">Username or Email</label><input type="text" name="username" class="form-control" required autofocus style="color: #333;"></div>
              <div class="form-group"><label class="form-label" style="color: #333;">Password</label><input type="password" name="password" class="form-control" required style="color: #333;"></div>
              <button type="submit" id="loginBtn" class="btn btn--primary btn--full-width">Login</button>
            </form>
            <p style="text-align: center; margin-top: var(--space-24); color: var(--color-text-secondary);">Don't have an account? <a href="/register" onclick="event.preventDefault(); router.navigate('/register')">Register here</a></p>
          </div>
        </div></div>`;
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('loginBtn');
      btn.classList.add('loading'); btn.textContent = 'Logging in...';
      const formData = new FormData(e.target);
      try {
        const result = await api.post('/auth', { action: 'login', ...Object.fromEntries(formData) });
        auth.setToken(result.token);
        this.navigate('/dashboard');
      } catch (error) { this.showMessage(error.message, 'error'); btn.classList.remove('loading'); btn.textContent = 'Login'; }
    });
  },

  showRegister() {
    document.getElementById('app').innerHTML = `
      <div class="container"><div class="card" style="max-width: 450px; margin: 80px auto;">
          <div class="card-header"><h2 style="margin: 0; text-align: center; color: #1f2937;">Register</h2></div>
          <div class="card-body"><div id="message"></div>
            <form id="registerForm">
              <div class="form-group"><label class="form-label" style="color: #333;">Full Name</label><input type="text" name="fullName" class="form-control" required style="color: #333;"></div>
              <div class="form-group"><label class="form-label" style="color: #333;">Username</label><input type="text" name="username" class="form-control" required style="color: #333;"></div>
              <div class="form-group"><label class="form-label" style="color: #333;">Email</label><input type="email" name="email" class="form-control" required style="color: #333;"></div>
              <div class="form-group"><label class="form-label" style="color: #333;">Password</label><input type="password" name="password" class="form-control" required style="color: #333;"></div>
              <div class="form-group"><label class="form-label" style="color: #333;">Confirm Password</label><input type="password" name="confirmPassword" class="form-control" required style="color: #333;"></div>
              <button type="submit" id="registerBtn" class="btn btn--primary btn--full-width">Register</button>
            </form>
            <p style="text-align: center; margin-top: var(--space-24); color: var(--color-text-secondary);">Already have an account? <a href="/login" onclick="event.preventDefault(); router.navigate('/login')">Login here</a></p>
          </div></div></div>`;
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('registerBtn');
      btn.classList.add('loading'); btn.textContent = 'Registering...';
      try {
        const result = await api.post('/auth', { action: 'register', ...Object.fromEntries(new FormData(e.target)) });
        this.showMessage(result.message, 'success');
        setTimeout(() => this.navigate('/login'), 2000);
      } catch (error) { this.showMessage(error.message, 'error'); btn.classList.remove('loading'); btn.textContent = 'Register'; }
    });
  },

  async showDashboard() {
    const user = auth.getUser();
    try {
      const data = await api.get('/data/dashboard');
      this.allDocuments = data.documents.filter(doc => doc.is_archived !== 1);
      this.filteredDocuments = [...this.allDocuments];
      
      // FIXED: Excel button labeled "Download Data" and placed right beside Upload Document
      document.getElementById('app').innerHTML = `
        <div class="app-layout">
          <aside class="sidebar">
            <div class="sidebar-header"><h1>DocTrack</h1></div>
            <nav class="sidebar-nav">
              <a href="/dashboard" class="sidebar-link active" onclick="event.preventDefault(); router.navigate('/dashboard')"><span class="sidebar-icon">📄</span><span>My Documents</span></a>
              <a href="/archives" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/archives')"><span class="sidebar-icon">🗄️</span><span>Archives</span></a>
              ${user.role === 'admin' ? `<div style="margin-top: 1rem; padding: 0 1rem; color: #64748b; font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Admin</div><a href="/admin" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/admin')"><span class="sidebar-icon">⚙️</span><span>Admin Panel</span></a><a href="/admin/documents" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/admin/documents')"><span class="sidebar-icon">📂</span><span>All Documents</span></a>` : ''}
            </nav>
            <div class="sidebar-footer"><div class="user-info"><div class="user-avatar">👤</div><div class="user-details"><div class="user-name">${user.fullName || user.username}</div><div class="user-role">${user.role === 'admin' ? 'Admin' : 'User'}</div></div></div><button onclick="logout()" class="btn-logout">Logout</button></div>
          </aside>
          <main class="main-content">
            <div class="content-header">
              <h2 style="color: #1f2937;">My Documents</h2>
              <div style="display: flex; gap: 0.5rem;">
                <button onclick="downloadTableToExcel('documentsTable', 'my_documents.xlsx')" class="btn btn--secondary" style="display: inline-flex; align-items: center; gap: 0.5rem;">📥 Download Data</button>
                <button onclick="openDocumentFormModal()" class="btn btn--primary">Upload Document</button>
              </div>
            </div>
            <div class="search-filters-inline">
              <input type="text" id="searchInput" placeholder="Search..." class="form-control search-inline" style="color: #333;">
              <select id="statusFilter" class="form-control filter-inline" style="color: #333;"><option value="">Status</option><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="routed">Routed</option><option value="completed">Completed</option></select>
              <select id="priorityFilter" class="form-control filter-inline" style="color: #333;"><option value="">Priority</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select>
              <input type="date" id="dateFromFilter" class="form-control filter-inline" style="max-width: 150px; color: #333;"><input type="date" id="dateToFilter" class="form-control filter-inline" style="max-width: 150px; color: #333;">
              <button onclick="router.resetFilters()" class="btn btn--secondary btn-clear">Clear</button>
            </div>
            <div id="message"></div><div class="documents-container"><div id="documentsList"></div></div><div id="pagination"></div>
          </main>
        </div>`;
      document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
      document.getElementById('statusFilter').addEventListener('change', () => this.applyFilters());
      document.getElementById('priorityFilter').addEventListener('change', () => this.applyFilters());
      document.getElementById('dateFromFilter').addEventListener('change', () => this.applyFilters());
      document.getElementById('dateToFilter').addEventListener('change', () => this.applyFilters());
      this.renderDocuments();
    } catch (error) { if (error.message.includes('Authentication')) { auth.removeToken(); this.navigate('/login'); } else { this.showMessage(error.message, 'error'); } }
  },

  async showAdminAllDocuments() {
      const user = auth.getUser();
      try {
        const data = await api.get('/data/documents?all=true');
        this.allDocuments = data.documents.filter(doc => doc.is_archived !== 1);
        this.filteredDocuments = [...this.allDocuments];
        
        // FIXED: Excel button also labeled "Download Data"
        document.getElementById('app').innerHTML = `
          <div class="app-layout">
            <aside class="sidebar">
              <div class="sidebar-header"><h1>DocTrack</h1></div>
              <nav class="sidebar-nav">
                <a href="/dashboard" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/dashboard')"><span class="sidebar-icon">📄</span><span>My Documents</span></a>
                <a href="/archives" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/archives')"><span class="sidebar-icon">🗄️</span><span>Archives</span></a>
                <div style="margin-top: 1rem; padding: 0 1rem; color: #64748b; font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Admin</div><a href="/admin" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/admin')"><span class="sidebar-icon">⚙️</span><span>Admin Panel</span></a><a href="/admin/documents" class="sidebar-link active" onclick="event.preventDefault(); router.navigate('/admin/documents')"><span class="sidebar-icon">📂</span><span>All Documents</span></a>
              </nav>
              <div class="sidebar-footer"><div class="user-info"><div class="user-avatar">👤</div><div class="user-details"><div class="user-name">${user.fullName || user.username}</div><div class="user-role">${user.role === 'admin' ? 'Admin' : 'User'}</div></div></div><button onclick="logout()" class="btn-logout">Logout</button></div>
            </aside>
            <main class="main-content">
              <div class="content-header">
                <h2 style="color: #1f2937;">System Documents</h2>
                <button onclick="downloadTableToExcel('documentsTable', 'all_documents.xlsx')" class="btn btn--secondary" style="display: inline-flex; align-items: center; gap: 0.5rem;">📥 Download Data</button>
              </div>
              <div class="search-filters-inline">
                <input type="text" id="searchInput" placeholder="Search..." class="form-control search-inline" style="color: #333;">
                <select id="statusFilter" class="form-control filter-inline" style="color: #333;"><option value="">Status</option><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="routed">Routed</option><option value="completed">Completed</option></select>
                <select id="priorityFilter" class="form-control filter-inline" style="color: #333;"><option value="">Priority</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select>
                <input type="date" id="dateFromFilter" class="form-control filter-inline" style="max-width: 150px; color: #333;"><input type="date" id="dateToFilter" class="form-control filter-inline" style="max-width: 150px; color: #333;">
                <button onclick="router.resetFilters()" class="btn btn--secondary btn-clear">Clear</button>
              </div>
              <div id="message"></div><div class="documents-container"><div id="documentsList"></div></div><div id="pagination"></div>
            </main>
          </div>`;
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('statusFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('priorityFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('dateFromFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('dateToFilter').addEventListener('change', () => this.applyFilters());
        this.renderDocuments();
      } catch (error) { if (error.message.includes('Authentication')) { auth.removeToken(); this.navigate('/login'); } else { this.showMessage(error.message, 'error'); } }
  },

  async showArchives() {
      const user = auth.getUser();
      try {
        const data = await api.get('/data/dashboard');
        this.allDocuments = data.documents.filter(doc => doc.is_archived === 1);
        this.filteredDocuments = [...this.allDocuments];
        
        // FIXED: Excel button labeled "Download Data"
        document.getElementById('app').innerHTML = `
          <div class="app-layout">
            <aside class="sidebar">
              <div class="sidebar-header"><h1>DocTrack</h1></div>
              <nav class="sidebar-nav">
                <a href="/dashboard" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/dashboard')"><span class="sidebar-icon">📄</span><span>My Documents</span></a>
                <a href="/archives" class="sidebar-link active" onclick="event.preventDefault(); router.navigate('/archives')"><span class="sidebar-icon">🗄️</span><span>Archives</span></a>
                ${user.role === 'admin' ? `<div style="margin-top: 1rem; padding: 0 1rem; color: #64748b; font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Admin</div><a href="/admin" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/admin')"><span class="sidebar-icon">⚙️</span><span>Admin Panel</span></a><a href="/admin/documents" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/admin/documents')"><span class="sidebar-icon">📂</span><span>All Documents</span></a>` : ''}
              </nav>
              <div class="sidebar-footer"><div class="user-info"><div class="user-avatar">👤</div><div class="user-details"><div class="user-name">${user.fullName || user.username}</div><div class="user-role">${user.role === 'admin' ? 'Admin' : 'User'}</div></div></div><button onclick="logout()" class="btn-logout">Logout</button></div>
            </aside>
            <main class="main-content">
              <div class="content-header">
                <h2 style="color: #1f2937;">Archives</h2>
                <button onclick="downloadTableToExcel('documentsTable', 'archives.xlsx')" class="btn btn--secondary" style="display: inline-flex; align-items: center; gap: 0.5rem;">📥 Download Data</button>
              </div>
              <div class="search-filters-inline">
                <input type="text" id="searchInput" placeholder="Search..." class="form-control search-inline" style="color: #333;">
                <select id="priorityFilter" class="form-control filter-inline" style="color: #333;"><option value="">Priority</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select>
                <input type="date" id="dateFromFilter" class="form-control filter-inline" style="max-width: 150px; color: #333;"><input type="date" id="dateToFilter" class="form-control filter-inline" style="max-width: 150px; color: #333;">
                <button onclick="router.resetFilters()" class="btn btn--secondary btn-clear">Clear</button>
              </div>
              <div id="message"></div><div class="documents-container"><div id="documentsList"></div></div><div id="pagination"></div>
            </main>
          </div>`;
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('priorityFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('dateFromFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('dateToFilter').addEventListener('change', () => this.applyFilters());
        this.renderArchivedDocuments();
      } catch (error) { if (error.message.includes('Authentication')) { auth.removeToken(); this.navigate('/login'); } else { this.showMessage(error.message, 'error'); } }
  },

  async showAdminPanel() {
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
              <h1>DocTrack</h1>
            </div>
            <nav class="sidebar-nav">
              <a href="/dashboard" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/dashboard')">
                <span class="sidebar-icon">📄</span>
                <span>My Documents</span>
              </a>
              <a href="/archives" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/archives')">
                <span class="sidebar-icon">🗄️</span>
                <span>Archives</span>
              </a>
              <div style="margin-top: 1rem; padding: 0 1rem; color: #64748b; font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Admin</div>
              <a href="/admin" class="sidebar-link active" onclick="event.preventDefault(); router.navigate('/admin')">
                <span class="sidebar-icon">⚙️</span>
                <span>Admin Panel</span>
              </a>
              <a href="/admin/documents" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/admin/documents')">
                <span class="sidebar-icon">📂</span>
                <span>All Documents</span>
              </a>
            </nav>
            
            <main class="main-content">
              <div class="content-header">
                <h2 style="color: #1f2937;">Admin Panel</h2>
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
                  <span>⚠️</span> <span>Pending User Registrations (${pendingData.pending_users.length})</span>
                </h3>
                <div style="overflow-x: auto;">
                  <table class="table" style="width: 100%; border-collapse: collapse;">
                    <thead style="background: #f8f9fa; color: #1f2937;">
                      <tr>
                        <th style="padding: 12px; text-align: left;">Full Name</th>
                        <th style="padding: 12px; text-align: left;">Username</th>
                        <th style="padding: 12px; text-align: left;">Email</th>
                        <th style="padding: 12px; text-align: left;">Department</th>
                        <th style="padding: 12px; text-align: left;">Registered</th>
                        <th style="padding: 12px; text-align: left;">Actions</th>
                      </tr>
                    </thead>
                    <tbody style="color: #333;">
                      ${pendingData.pending_users.map(u => `
                        <tr style="border-bottom: 1px solid #eee;">
                          <td style="padding: 12px;">${u.full_name}</td>
                          <td style="padding: 12px;">${u.username}</td>
                          <td style="padding: 12px;">${u.email}</td>
                          <td style="padding: 12px;">${u.department || 'N/A'}</td>
                          <td style="padding: 12px;">${new Date(u.created_at).toLocaleDateString()}</td>
                          <td style="padding: 12px;">
                            <div style="display: flex; gap: 0.5rem;">
                              <button onclick="approveUser(${u.user_id}, '${u.username}')" class="btn btn--sm" style="background: #10b981; color: white;">Approve</button>
                              <button onclick="rejectUser(${u.user_id}, '${u.username}')" class="btn btn--sm" style="background: #ef4444; color: white;">Reject</button>
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
                <h3 style="margin: 0 0 1rem 0; color: #1f2937;">All Users</h3>
                <div style="overflow-x: auto;">
                  <table class="table" style="width: 100%; border-collapse: collapse;">
                    <thead style="background: #f8f9fa; color: #1f2937;">
                      <tr>
                        <th style="padding: 12px; text-align: left;">Full Name</th>
                        <th style="padding: 12px; text-align: left;">Username</th>
                        <th style="padding: 12px; text-align: left;">Email</th>
                        <th style="padding: 12px; text-align: left;">Department</th>
                        <th style="padding: 12px; text-align: left;">Role</th>
                        <th style="padding: 12px; text-align: left;">Status</th>
                        <th style="padding: 12px; text-align: left;">Registered</th>
                        <th style="padding: 12px; text-align: left;">Actions</th>
                      </tr>
                    </thead>
                    <tbody style="color: #333;">
                      ${usersData.users.map(u => `
                        <tr style="border-bottom: 1px solid #eee; ${u.is_active === 0 ? 'opacity: 0.6; background: #fef3c7;' : ''}">
                          <td style="padding: 12px;">${u.full_name}</td>
                          <td style="padding: 12px;">${u.username}</td>
                          <td style="padding: 12px;">${u.email}</td>
                          <td style="padding: 12px;">${u.department || 'N/A'}</td>
                          <td style="padding: 12px;">
                            <span style="padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; ${u.role === 'admin' ? 'background: #dbeafe; color: #1e40af;' : 'background: #e5e7eb; color: #374151;'}">
                              ${u.role === 'admin' ? 'Admin' : 'User'}
                            </span>
                          </td>
                          <td style="padding: 12px;">
                            <span style="padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; ${u.is_active === 1 ? 'background: #d1fae5; color: #065f46;' : 'background: #fee2e2; color: #991b1b;'}">
                              ${u.is_active === 1 ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style="padding: 12px;">${new Date(u.created_at).toLocaleDateString()}</td>
                          <td style="padding: 12px;">
                            ${u.role !== 'admin' || user.role === 'admin' ? `
                              <div style="display: flex; gap: 0.5rem;">
                                ${u.is_active ? 
                                  `<button onclick="deactivateUser(${u.user_id}, '${u.username}')" class="btn btn--sm" style="background: #f59e0b; color: white;">Deactivate</button>` : 
                                  `<button onclick="reactivateUser(${u.user_id}, '${u.username}')" class="btn btn--sm" style="background: #10b981; color: white;">Reactivate</button>`
                                }
                                ${u.role !== 'admin' ? `<button onclick="makeAdmin(${u.user_id}, '${u.username}')" class="btn btn--sm" style="background: #3b82f6; color: white;">Make Admin</button>` : `<button onclick="removeAdmin(${u.user_id}, '${u.username}')" class="btn btn--sm" style="background: #64748b; color: white;">Demote</button>`}
                                <button onclick="deleteUser(${u.user_id}, '${u.username}')" class="btn btn--sm" style="background: #ef4444; color: white;">🗑️</button>
                              </div>
                            ` : ''}
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </main>
          </aside>
        </div>
      `;
    } catch (e) {
      alert(e.message);
      this.navigate('/dashboard');
    }
  }
};

// --- Helper Functions ---

async function approveUser(userId, username) {
  if (!confirm(`Approve user ${username}?`)) return;
  try {
    const result = await api.post('/users/approve', { user_id: userId });
    alert(result.message || 'User approved!');
    router.showAdminPanel();
  } catch (error) {
    alert('Failed: ' + error.message);
  }
}

async function rejectUser(userId, username) {
  if (!confirm(`Reject user ${username}? Cannot be undone.`)) return;
  try {
    const result = await api.post('/users/reject', { user_id: userId });
    alert(result.message || 'User rejected!');
    router.showAdminPanel();
  } catch (error) {
    alert('Failed: ' + error.message);
  }
}

async function deactivateUser(userId, username) {
  if (!confirm(`Deactivate user ${username}?`)) return;
  try {
    const result = await api.post('/users/deactivate', { user_id: userId });
    alert(result.message || 'User deactivated!');
    router.showAdminPanel();
  } catch (error) {
    alert('Failed: ' + error.message);
  }
}

async function reactivateUser(userId, username) {
  if (!confirm(`Reactivate user ${username}?`)) return;
  try {
    const result = await api.post('/users/reactivate', { user_id: userId });
    alert(result.message || 'User reactivated!');
    router.showAdminPanel();
  } catch (error) {
    alert('Failed: ' + error.message);
  }
}

async function makeAdmin(userId, username) {
  if (!confirm(`Grant admin privileges to ${username}?`)) return;
  try {
    const result = await api.post('/users/update-role', { user_id: userId, role: 'admin' });
    alert(result.message || 'User promoted to admin!');
    router.showAdminPanel();
  } catch (error) {
    alert('Failed: ' + error.message);
  }
}

async function removeAdmin(userId, username) {
  if (!confirm(`Remove admin privileges from ${username}?`)) return;
  try {
    const result = await api.post('/users/update-role', { user_id: userId, role: 'user' });
    alert(result.message || 'Admin privileges removed!');
    router.showAdminPanel();
  } catch (error) {
    alert('Failed: ' + error.message);
  }
}

async function deleteUser(userId, username) {
  if (!confirm(`PERMANENTLY DELETE user ${username}? CANNOT be undone!`)) return;
  try {
    const result = await api.post('/users/delete', { user_id: userId });
    alert(result.message || 'User deleted!');
    router.showAdminPanel();
  } catch (error) {
    alert('Failed: ' + error.message);
  }
}

// Global functions for onClick handlers
window.viewDocument = async function(documentId) {
  try {
    const data = await api.get(`/data/documents?id=${documentId}`);
    if (data.success && data.document) {
      viewModal.open(documentId, data.document);
    }
  } catch (error) {
    alert('Error loading document: ' + error.message);
  }
};

window.editDocument = async function(documentId) {
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
};

window.routeDocument = function(documentId, documentTitle) {
  routeModal.open(documentId, documentTitle);
};

// FIXED: Table styling updated to ensure high visibility of column headers
window.viewDocumentHistory = async function(documentId, documentTitle) {
  try {
    const data = await api.get(`/data/documents?id=${documentId}&history=true`);
    const historyList = data.history || [];

    const historyHtml = `
      <div id="historyModal" class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1100;">
        <div class="modal" style="background: white; padding: 2rem; border-radius: 8px; max-width: 800px; width: 90%; max-height: 80vh; overflow-y: auto; display: flex; flex-direction: column;">
          <h3 style="margin-top:0; color:#1f2937; border-bottom: 1px solid #eee; padding-bottom: 1rem; margin-bottom: 1rem;">
             History: ${documentTitle}
          </h3>
          
          <div style="overflow-x: auto;">
            <table class="table" style="width: 100%; border-collapse: collapse; min-width: 600px;">
              <thead>
                <!-- CHANGED: Explicit dark background and white text for high contrast visibility -->
                <tr style="background: #1f2937; border-bottom: 2px solid #e9ecef; color: #ffffff;">
                  <th style="padding: 12px; text-align: left; font-weight: 600; width: 20%; color: #ffffff;">Date & Time</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; width: 20%; color: #ffffff;">User</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; width: 15%; color: #ffffff;">Action</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; width: 45%; color: #ffffff;">Details</th>
                </tr>
              </thead>
              <tbody style="color: #333;">
                ${historyList.length > 0 ? historyList.map(h => `
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px; font-size: 0.9em; white-space: nowrap;">
                      ${new Date(h.created_at).toLocaleString()}
                    </td>
                    <td style="padding: 12px; font-weight: 500;">
                      ${h.user_name || 'System'}
                    </td>
                    <td style="padding: 12px;">
                      <span style="padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: 600; background: #e0f2fe; color: #0369a1;">
                        ${h.action}
                      </span>
                    </td>
                    <td style="padding: 12px; font-size: 0.9em; color: #4b5563;">
                      ${h.details || ''}
                    </td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="4" style="padding: 2rem; text-align: center; color: #666;">
                      No history found for this document.
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>

          <div style="text-align:right; margin-top:1.5rem; pt-4; border-top: 1px solid #eee;">
             <button onclick="document.getElementById('historyModal').remove()" class="btn btn--secondary">Close</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', historyHtml);
  } catch (error) {
    alert('Error loading history: ' + error.message);
  }
};

window.deleteDocument = async function(documentId, title) {
  if (!confirm(`Are you sure you want to delete "${title}"? This will permanently delete the document and its file from storage. This action CANNOT be undone!`)) return;
  try {
    const result = await api.delete(`/data/documents?id=${documentId}`);
    alert(result.message || 'Document deleted successfully!');
    router.handleRoute();
  } catch (error) {
    alert('Error deleting document: ' + error.message);
  }
};

// FIXED: Uses POST with ?action=archive as required by your backend
window.archiveDocument = async function(documentId) {
  if (!confirm('Archive this document?')) return;
  try {
    // Backend expects POST to /data/documents?action=archive
    const result = await api.post('/data/documents?action=archive', { 
        document_id: documentId 
    });
    alert(result.message || 'Document archived');
    router.handleRoute();
  } catch (error) {
    alert('Error archiving document: ' + error.message);
  }
};

// FIXED: Uses POST with ?action=restore as required by your backend
window.restoreDocument = async function(documentId) {
  if (!confirm('Restore this document from archives?')) return;
  try {
    // Backend expects POST to /data/documents?action=restore
    const result = await api.post('/data/documents?action=restore', { 
        document_id: documentId
    });
    alert(result.message || 'Document restored');
    router.handleRoute();
  } catch (error) {
    alert('Error restoring document: ' + error.message);
  }
};

window.openDocumentFormModal = function() {
  const modalHtml = `
    <div id="uploadModalOverlay" class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
      <div class="modal" style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-width: 500px; width: 90%;">
        <h2 style="margin: 0 0 1.5rem 0; font-size: 1.5rem; color: #1f2937;">Upload Document</h2>
        <form id="uploadDocumentForm">
          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #333;">Title</label>
            <input type="text" name="title" class="form-control" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; color: #333;">
          </div>
          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #333;">Description</label>
            <textarea name="description" class="form-control" rows="3" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; color: #333;"></textarea>
          </div>
          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #333;">Document Type</label>
            <!-- FIXED: Changed name="documentType" to name="document_type" to match backend expectation -->
            <input type="text" name="document_type" class="form-control" required placeholder="e.g. Memo, Invoice, Report" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; color: #333;">
          </div>
          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #333;">Priority</label>
            <select name="priority" class="form-control" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; color: #333;">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #333;">File Attachment</label>
            <input type="file" name="file" class="form-control" style="width: 100%; color: #333;">
          </div>
          <div style="display: flex; gap: 1rem; justify-content: flex-end;">
            <button type="button" id="uploadCancelBtn" class="btn btn--secondary">Cancel</button>
            <button type="submit" id="uploadSubmitBtn" class="btn btn--primary">Upload</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const overlay = document.getElementById('uploadModalOverlay');
  const form = document.getElementById('uploadDocumentForm');
  const cancelBtn = document.getElementById('uploadCancelBtn');
  const submitBtn = document.getElementById('uploadSubmitBtn');

  const close = () => overlay.remove();
  cancelBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    submitBtn.textContent = 'Uploading...';

    const formData = new FormData(e.target);
    try {
      const result = await api.uploadFile('/data/documents', formData);
      alert(result.message || 'Upload successful!');
      close();
      router.handleRoute();
    } catch (error) {
      alert('Error uploading: ' + error.message);
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
      submitBtn.textContent = 'Upload';
    }
  });
};

window.logout = function() {
  auth.removeToken();
  router.navigate('/login');
};

// --- Export to Excel Function ---
window.downloadTableToExcel = function(tableId, filename = 'export.xlsx') {
    const table = document.getElementById(tableId);
    if (!table) {
        alert('Table not found');
        return;
    }

    // Clone table to modify for export (remove Actions column)
    const clone = table.cloneNode(true);
    const rows = clone.querySelectorAll('tr');
    rows.forEach(row => {
        if (row.cells.length > 0) {
            row.deleteCell(-1); // Remove last column (Actions)
        }
    });

    // Use SheetJS to generate Excel
    if (typeof XLSX === 'undefined') {
        alert('SheetJS library not found. Please ensure xlsx.full.min.js is included in your HTML.');
        return;
    }

    const wb = XLSX.utils.table_to_book(clone, { sheet: "Sheet1" });
    XLSX.writeFile(wb, filename);
};

router.init();


// Make everything accessible globally
window.router = router;
window.api = api;
window.auth = auth;
window.openDocumentFormModal = openDocumentFormModal;
window.logout = logout;
window.approveUser = approveUser;
window.rejectUser = rejectUser;
window.deactivateUser = deactivateUser;
window.reactivateUser = reactivateUser;
window.makeAdmin = makeAdmin;
window.removeAdmin = removeAdmin;
window.deleteUser = deleteUser;
window.viewDocument = viewDocument;
window.editDocument = editDocument;
window.deleteDocument = deleteDocument;
window.archiveDocument = archiveDocument;
window.restoreDocument = restoreDocument;
window.routeDocument = routeDocument;
window.viewDocumentHistory = viewDocumentHistory;
window.openDocumentFormModal = openDocumentFormModal;
window.downloadTableToExcel = downloadTableToExcel;
