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
      <div id="routeModalOverlay" class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h2>Route Document</h2>
            <p style="margin: 0; color: #64748b; font-size: 0.9rem;">${documentTitle}</p>
          </div>
          
          <form id="routeDocumentForm" style="display: flex; flex-direction: column; flex: 1; min-height: 0;">
            <div class="modal-body">
                <div class="form-group">
                  <label class="form-label">Destination / Recipient <span style="color:red">*</span></label>
                  <input type="text" id="routeDestination" class="form-control" placeholder="e.g., Finance Dept, Mr. Smith" required>
                </div>
                
                <div class="form-group">
                  <label class="form-label">Action Taken / Remarks <span style="color:red">*</span></label>
                  <textarea id="routeRemarks" class="form-control" rows="3" placeholder="What did you do to this document? (e.g., Signed and approved, Reviewed for errors)" required></textarea>
                </div>
            </div>

            <div class="modal-footer">
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

// --- Edit Document Modal ---
const editModal = {
  open(documentData, onSave) {
    const modalHtml = `
      <div id="editModalOverlay" class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h2>Edit Document</h2>
          </div>
          
          <form id="editDocumentForm" style="display: flex; flex-direction: column; flex: 1; min-height: 0;">
            <div class="modal-body">
                <!-- NEW: Manual Document Number (Editable) -->
                <div class="form-group">
                  <label class="form-label">Document Number</label>
                  <input type="text" id="editDocNumber" class="form-control" value="${documentData.document_number || ''}" >
                </div>

                <div class="form-group">
                  <label class="form-label">Title</label>
                  <input type="text" id="editTitle" class="form-control" value="${documentData.title}" required>
                </div>

                <div class="form-group">
                  <label class="form-label">Description</label>
                  <textarea id="editDescription" class="form-control" rows="3">${documentData.description || ''}</textarea>
                </div>

                <div class="form-group">
                  <label class="form-label">Document Type</label>
                  <input type="text" id="editType" class="form-control" value="${documentData.document_type || ''}" required>
                </div>
                
                <!-- ADDED: Signatory Field -->
                <div class="form-group">
                  <label class="form-label">Signatory</label>
                  <input type="text" id="editSignatory" class="form-control" value="${documentData.signatory || ''}" placeholder="e.g. John Doe">
                </div>

                <div class="form-group">
                  <label class="form-label">Priority</label>
                  <select id="editPriority" class="form-control" required>
                    <option value="not_rush" ${documentData.priority === 'not_rush' ? 'selected' : ''}>Not Rush</option>
                    <option value="rush" ${documentData.priority === 'rush' ? 'selected' : ''}>RUSH</option>
                  </select>
                </div>
            </div>

            <div class="modal-footer">
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
        document_number: document.getElementById('editDocNumber').value, // NEW
        title: document.getElementById('editTitle').value,
        description: document.getElementById('editDescription').value,
        document_type: document.getElementById('editType').value,
        priority: document.getElementById('editPriority').value,
        signatory: document.getElementById('editSignatory').value // Added Signatory
      };

      await onSave(updatedData);
      overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }
};

// --- View Document Modal ---
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
      <div id="viewModalOverlay" class="modal-overlay">
        <div class="modal" style="max-width: 90vw; height: 90vh;">
          
          <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h2 style="margin: 0; font-size: 1.5rem; color: #1f2937;">${documentData.title}</h2>
              <p style="margin: 0.25rem 0 0 0; color: #666; font-size: 0.875rem">
  ${documentData.document_number ? `Document #${documentData.document_number} • ` : ''}${documentData.document_type} • Priority: ${documentData.priority === 'rush' ? '🔴 RUSH' : '✅ Not Rush'}
</p>

            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              ${hasFile ? `<a href="${downloadUrl}" class="btn btn--sm btn--primary" style="text-decoration: none;">Download</a>` : ''}
              <button id="viewCloseBtn" class="btn btn--sm" style="padding: 0.5rem; cursor: pointer; font-size: 1.5rem; line-height: 1; color: #333;">&times;</button>
            </div>
          </div>

          <div style="flex: 1; overflow: auto; padding: 1rem; display: flex; justify-content: center; align-items: center; background: #f5f5f5;">
            ${hasFile && isViewable ? (
              isPDF || isOffice ? 
                `<iframe src="${previewUrl}" style="width: 100%; height: 100%; border: none; background: white;"></iframe>` :
                `<img src="${viewUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="${documentData.title}">`
            ) : `
              <div style="text-align: center; padding: 2rem;">
                <p style="font-size: 3rem; margin-bottom: 1rem;">📄</p>
                <p style="font-size: 1.25rem; margin-bottom: 0.5rem; color: #333;">${hasFile ? filePath : 'No file attached'}</p>
                <p style="color: #666; margin-bottom: 1.5rem;">${hasFile ? 'Preview not available for this file type' : 'This document has no attached file'}</p>
                ${hasFile ? `<a href="${downloadUrl}" class="btn btn--primary">Download to View</a>` : ''}
              </div>
            `}
          </div>

          <div class="modal-footer" style="flex-direction: column; align-items: stretch; justify-content: flex-start; gap: 0;">
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
               <div>
                <strong style="color: #666; font-size: 0.875rem;">Signatory</strong>
                <p style="margin: 0.25rem 0 0 0; color: #333;">${documentData.signatory || 'N/A'}</p>
              </div>
              ${hasFile ? `
              <div>
                <strong style="color: #666; font-size: 0.875rem;">File Size</strong>
                <p style="margin: 0.25rem 0 0 0; color: #333;">${formatFileSize(documentData.file_size)}</p>
              </div>
              ` : ''}
            </div>
            ${documentData.description ? `
            <div style="margin-top: 1rem;">
              <strong style="color: #666; font-size: 0.875rem;">Description</strong>
              <p style="margin: 0.25rem 0 0 0; color: #333;">${documentData.description}</p>
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
  currentRoute: '/',
  allDocuments: [],
  filteredDocuments: [],
  
  // PAGINATION SETTINGS
  currentPage: 1,
  itemsPerPage: 10,
  
  sortColumn: 'uploaded_at',
  sortDirection: 'desc',

  showMessage(message, type = 'info') {
    const msgEl = document.getElementById('message');
    if (msgEl) {
      msgEl.innerHTML = `<div class="p-4 mb-4 text-sm rounded-lg ${type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}" role="alert">${message}</div>`;
      setTimeout(() => { msgEl.innerHTML = ''; }, 3000);
    } else {
      alert(message);
    }
  },

  handleSearch(query) {
    const term = query.toLowerCase();
    this.filteredDocuments = this.allDocuments.filter(doc => 
      doc.title.toLowerCase().includes(term) ||
      (doc.description && doc.description.toLowerCase().includes(term)) ||
      (doc.signatory && doc.signatory.toLowerCase().includes(term)) || // Added search by signatory
      doc.document_number.toLowerCase().includes(term)
    );
    this.currentPage = 1; // Reset to page 1 on search
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

    this.currentPage = 1; // Reset to page 1 on filter
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
    this.currentPage = 1; // Reset to page 1
    if(this.currentRoute === '/archives') this.renderArchivedDocuments();
    else this.renderDocuments();
  },

  // NEW: Change Page Function
  goToPage(page) {
    const totalPages = Math.ceil(this.filteredDocuments.length / this.itemsPerPage);
    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;
      if(this.currentRoute === '/archives') this.renderArchivedDocuments();
      else this.renderDocuments();
    }
  },

  // NEW: Pagination Controls Renderer
  renderPaginationControls(totalPages) {
    if (totalPages <= 1) return '';

    let html = `<div style="display: flex; justify-content: center; gap: 0.5rem; margin-top: 1.5rem; align-items: center;">`;
    
    // Previous Button
    html += `<button class="btn btn--sm ${this.currentPage === 1 ? 'disabled' : ''}" 
             onclick="router.goToPage(${this.currentPage - 1})" 
             style="padding: 0.5rem 1rem;" 
             ${this.currentPage === 1 ? 'disabled' : ''}>Previous</button>`;

    // Page Numbers
    for (let i = 1; i <= totalPages; i++) {
        // Show only limited page numbers for large lists (optional optimization)
        if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
            html += `<button class="btn btn--sm" 
                     onclick="router.goToPage(${i})" 
                     style="padding: 0.5rem 1rem; ${i === this.currentPage ? 'background-color: var(--color-primary); color: white;' : 'background-color: white; color: var(--color-text); border: 1px solid #ddd;'}">
                     ${i}
                     </button>`;
        } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
            html += `<span style="padding: 0.5rem;">...</span>`;
        }
    }

    // Next Button
    html += `<button class="btn btn--sm ${this.currentPage === totalPages ? 'disabled' : ''}" 
             onclick="router.goToPage(${this.currentPage + 1})" 
             style="padding: 0.5rem 1rem;" 
             ${this.currentPage === totalPages ? 'disabled' : ''}>Next</button>`;
    
    html += `</div>`;
    html += `<div style="text-align: center; margin-top: 0.5rem; color: #666; font-size: 0.9rem;">
                Showing ${(this.currentPage - 1) * this.itemsPerPage + 1} to 
                ${Math.min(this.currentPage * this.itemsPerPage, this.filteredDocuments.length)} of 
                ${this.filteredDocuments.length} entries
             </div>`;
    
    return html;
  },

  renderDocuments() {
    const list = document.getElementById('documentsList');
    const paginationDiv = document.getElementById('pagination'); // Ensure you have <div id="pagination"></div> in your HTML
    
    if(!list) return;

    if (this.filteredDocuments.length === 0) {
      list.innerHTML = `<div class="empty-state"><p>No documents found.</p></div>`;
      if (paginationDiv) paginationDiv.innerHTML = '';
      return;
    }

    // PAGINATION LOGIC
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginatedDocs = this.filteredDocuments.slice(startIndex, endIndex);

    list.innerHTML = `
      <div style="overflow-x: auto;">
        <table id="documentsTable" class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th style="width: 30%;">Title</th>
              <th>Type</th>
              <th>Signatory</th> <!-- Added Signatory Column -->
              <th>Current Location</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Date</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${paginatedDocs.map(doc => `
              <tr>
                <td>${doc.document_number || ''}</td>
                <td style="white-space: normal; overflow-wrap: anywhere; word-break: break-word;">
                  <div style="font-weight: 500; color: var(--color-text);">${doc.title}</div>
                  <div style="font-size: 0.85em; color: var(--color-text-secondary);">${doc.description ? (doc.description.substring(0, 50) + (doc.description.length>50?'...':'')) : ''}</div>
                </td>
                <td>${doc.document_type}</td>
                <td>${doc.signatory || '-'}</td> <!-- Added Signatory Cell -->
                <td>${doc.current_destination || 'Origin'}</td>
                <td>
                  <span class="badge" style="background: ${doc.status === 'completed' ? 'var(--color-success)' : (doc.status === 'urgent' ? 'var(--color-error)' : '#dbeafe')}; color: ${doc.status === 'completed' ? 'white' : (doc.status === 'urgent' ? 'white' : '#1e40af')}">
                    ${doc.status}
                  </span>
                </td>
                <td>
                  <!-- NEW PRIORITY BADGE LOGIC -->
                  <span class="badge" style="background: ${doc.priority === 'rush' ? 'var(--color-error)' : 'var(--color-success)'}; color: white;">
                    ${doc.priority === 'rush' ? 'RUSH' : 'NOT RUSH'}
                  </span>
                </td>
                <td>${new Date(doc.uploaded_at || doc.created_at).toLocaleDateString()}</td>
               <td style="text-align: right">
  <div style="display: flex; gap: 4px; justify-content: flex-end">
    <button onclick="viewDocument(${doc.document_id})" class="btn" title="View">👁️</button>
    <button onclick="editDocument(${doc.document_id})" class="btn" title="Edit">✏️</button>
    <button onclick="routeDocument(${doc.document_id}, '${doc.title.replace(/'/g, "\\'")}')}" class="btn" title="Route">📤</button>
    <button onclick="viewDocumentHistory(${doc.document_id}, '${doc.title.replace(/'/g, "\\'")}')}" class="btn" title="History">📜</button>
    ${doc.is_archived ? `
      <button onclick="restoreDocument(${doc.document_id})" class="btn" title="Restore">♻️</button>
    ` : `
      <button onclick="archiveDocument(${doc.document_id})" class="btn" title="Archive">📦</button>
    `}
    ${doc.status !== 'completed' ? `
      <button onclick="completeDocument(${doc.document_id}, '${doc.title.replace(/'/g, "\\'")}'))" class="btn" title="Mark as Complete" style="background: #10b981; color: white">✓</button>
    ` : ''}
    <button onclick="deleteDocument(${doc.document_id}, '${doc.title.replace(/'/g, "\\'")}')}" class="btn" title="Delete">🗑️</button>
  </div>
</td>

              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    // Render Pagination Controls
    if (paginationDiv) {
        const totalPages = Math.ceil(this.filteredDocuments.length / this.itemsPerPage);
        paginationDiv.innerHTML = this.renderPaginationControls(totalPages);
    }
  },

  renderArchivedDocuments() {
    this.renderDocuments(); // Re-use main render logic
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

    if (path === '/login') {
      if (auth.isAuthenticated()) { this.navigate('/dashboard'); return; }
      this.showLogin();
    } else if (path === '/register') {
      if (auth.isAuthenticated()) { this.navigate('/dashboard'); return; }
      this.showRegister();
    } else if (path === '/dashboard' || path === '/') {
      if (!auth.isAuthenticated()) { this.navigate('/login'); return; }
      this.showDashboard();
    } else if (path === '/archives') {
      if (!auth.isAuthenticated()) { this.navigate('/login'); return; }
      this.showArchives();
    } else if (path === '/admin') {
       if (!auth.isAuthenticated()) { this.navigate('/login'); return; }
       const user = auth.getUser();
       if (user.role !== 'admin') { alert('Access denied: Admin only'); this.navigate('/dashboard'); return; }
       this.showAdminPanel();
    } else if (path === '/admin/documents') {
       if (!auth.isAuthenticated()) { this.navigate('/login'); return; }
       const user = auth.getUser();
       if (user.role !== 'admin') { alert('Access denied: Admin only'); this.navigate('/dashboard'); return; }
       this.showAdminAllDocuments();
    } else {
      this.navigate('/login');
    }
  },

  showLogin() {
    document.getElementById('app').innerHTML = `
      <style>
        .auth-shell {
          min-height: 100vh;
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 28px 16px;
          background: radial-gradient(1200px 600px at 10% 10%, rgba(59,130,246,.20), transparent 55%),
                      radial-gradient(900px 500px at 90% 20%, rgba(16,185,129,.18), transparent 50%),
                      #f8fafc;
        }
        .auth-card {
          width: 100%;
          max-width: 980px;
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.14);
          background: white;
          border: 1px solid rgba(15, 23, 42, 0.08);
        }
        .auth-brand {
          padding: 44px 42px;
          color: white;
          background: linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 55%, #10b981 120%);
          position: relative;
        }
        .auth-brand::after {
          content:'';
          position:absolute;
          inset:-40px -60px auto auto;
          width: 220px;
          height: 220px;
          background: rgba(255,255,255,0.12);
          border-radius: 999px;
          filter: blur(0px);
        }
        .auth-brand h1 {
          margin: 0 0 10px 0;
          font-size: 1.65rem;
          font-weight: 800;
          letter-spacing: .2px;
          color: white !important;
        }
        .auth-brand p {
          margin: 0 0 18px 0;
          opacity: .95;
          line-height: 1.5;
        }
        .auth-bullets {
          margin: 18px 0 0 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 10px;
          opacity: .95;
        }
        .auth-bullets li {
          display:flex;
          gap: 10px;
          align-items:flex-start;
          line-height: 1.45;
        }
        .auth-dot {
          margin-top: 7px;
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: rgba(255,255,255,0.85);
          flex: 0 0 auto;
        }
        .auth-form {
          padding: 42px 40px;
          display:flex;
          flex-direction: column;
          justify-content: center;
        }
        .auth-form h2 {
          margin: 0 0 6px 0;
          font-size: 1.4rem;
          font-weight: 800;
          color: #0f172a;
        }
        .auth-subtitle {
          margin: 0 0 18px 0;
          color: #64748b;
          font-size: .95rem;
          line-height: 1.4;
        }
        .auth-divider {
          height: 1px;
          background: rgba(15, 23, 42, 0.08);
          margin: 18px 0;
        }
        .auth-help {
          margin-top: 14px;
          text-align: center;
          color: #64748b;
          font-size: 0.95rem;
        }
        .auth-help a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 600;
        }
        .auth-help a:hover { text-decoration: underline; }

        @media (max-width: 900px) {
          .auth-card { grid-template-columns: 1fr; }
          .auth-brand { padding: 28px 24px; }
          .auth-form { padding: 28px 22px; }
        }
      </style>

      <div class="auth-shell">
        <div class="auth-card">
          <section class="auth-brand">
            <h1>PFDCS Document Tracking System</h1>
          </section>

          <section class="auth-form">
            <h2>Sign in</h2>
            <p class="auth-subtitle">Use your username/email and password to access your dashboard.</p>

            <div id="message"></div>

            <form id="loginForm">
              <div class="form-group">
                <label class="form-label">Username or Email</label>
                <input type="text" name="username" class="form-control" required autofocus placeholder="Enter your username or email">
              </div>

              <div class="form-group">
                <label class="form-label">Password</label>
                <input type="password" name="password" class="form-control" required placeholder="Enter your password">
              </div>

              <button type="submit" id="loginBtn" class="btn btn--primary btn--full-width">Login</button>
            </form>

            <div class="auth-divider"></div>

            <p class="auth-help">
              Don't have an account?
              <a href="/register" onclick="event.preventDefault(); router.navigate('/register')">Create one</a>
            </p>
          </section>
        </div>
      </div>`;
    
    // FIXED: Form submission for JSON payload
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('loginBtn');
      btn.classList.add('loading');
      btn.textContent = 'Logging in...';

      const formData = new FormData(e.target);
      const username = formData.get('username');
      const password = formData.get('password');
      
      try {
        // Send as proper JSON object, not FormData
        const result = await api.post('/auth', {
          action: 'login',
          username: username,
          password: password
        });
        
        auth.setToken(result.token);
        this.navigate('/dashboard');
      } catch (error) {
        this.showMessage(error.message, 'error');
        btn.classList.remove('loading');
        btn.textContent = 'Login';
      }
    });
  },

  showRegister() {
     document.getElementById('app').innerHTML = `
      <style>
        .auth-shell {
          min-height: 100vh;
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 28px 16px;
          background: radial-gradient(1200px 600px at 10% 10%, rgba(59,130,246,.20), transparent 55%),
                      radial-gradient(900px 500px at 90% 20%, rgba(16,185,129,.18), transparent 50%),
                      #f8fafc;
        }
        .auth-card {
          width: 100%;
          max-width: 980px;
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.14);
          background: white;
          border: 1px solid rgba(15, 23, 42, 0.08);
        }
        .auth-brand {
          padding: 44px 42px;
          color: white;
          background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 70%, #0ea5e9 130%);
        }
        .auth-brand h1 {
          margin: 0 0 10px 0;
          font-size: 1.65rem;
          font-weight: 800;
          letter-spacing: .2px;
          color: white !important;
        }
        .auth-brand p {
          margin: 0;
          opacity: .95;
          line-height: 1.5;
        }
        .auth-form {
          padding: 42px 40px;
          display:flex;
          flex-direction: column;
          justify-content: center;
        }
        .auth-form h2 {
          margin: 0 0 6px 0;
          font-size: 1.4rem;
          font-weight: 800;
          color: #0f172a;
        }
        .auth-subtitle {
          margin: 0 0 18px 0;
          color: #64748b;
          font-size: .95rem;
          line-height: 1.4;
        }
        .auth-divider {
          height: 1px;
          background: rgba(15, 23, 42, 0.08);
          margin: 18px 0;
        }
        .auth-help {
          margin-top: 14px;
          text-align: center;
          color: #64748b;
          font-size: 0.95rem;
        }
        .auth-help a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 600;
        }
        .auth-help a:hover { text-decoration: underline; }

        @media (max-width: 900px) {
          .auth-card { grid-template-columns: 1fr; }
          .auth-brand { padding: 28px 24px; }
          .auth-form { padding: 28px 22px; }
        }
      </style>

      <div class="auth-shell">
        <div class="auth-card">
          <section class="auth-brand">
            <h1>Create an account</h1>
            <p>Request access to the document tracking system. Accounts may require admin approval.</p>
          </section>

          <section class="auth-form">
            <h2>Register</h2>
            <p class="auth-subtitle">Fill out your details to create an account.</p>

            <div id="message"></div>

            <form id="registerForm">
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" name="fullName" class="form-control" required placeholder="e.g. Juan Dela Cruz">
              </div>

              <div class="form-group">
                <label class="form-label">Username</label>
                <input type="text" name="username" class="form-control" required placeholder="Choose a username">
              </div>

              <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" name="email" class="form-control" required placeholder="name@example.com">
              </div>

              <div class="form-group">
                <label class="form-label">Password</label>
                <input type="password" name="password" class="form-control" required placeholder="Create a password">
              </div>

              <div class="form-group">
                <label class="form-label">Confirm Password</label>
                <input type="password" name="confirmPassword" class="form-control" required placeholder="Confirm your password">
              </div>

              <button type="submit" id="registerBtn" class="btn btn--primary btn--full-width">Register</button>
            </form>

            <div class="auth-divider"></div>

            <p class="auth-help">
              Already have an account?
              <a href="/login" onclick="event.preventDefault(); router.navigate('/login')">Sign in</a>
            </p>
          </section>
        </div>
      </div>`;
          
      // FIXED: Form submission for JSON payload
      document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('registerBtn');
        btn.classList.add('loading');
        
        const formData = new FormData(e.target);
        
        try {
            // Send as proper JSON object
            const result = await api.post('/auth', { 
                action: 'register', 
                username: formData.get('username'),
                password: formData.get('password'),
                email: formData.get('email'),
                full_name: formData.get('fullName'),
                confirm_password: formData.get('confirmPassword')
            });
            this.showMessage(result.message, 'success');
            setTimeout(() => this.navigate('/login'), 2000);
        } catch (error) {
            this.showMessage(error.message, 'error');
            btn.classList.remove('loading');
        }
      });
  },

  async showDashboard() {
    const user = auth.getUser();
    try {
      const data = await api.get('/data/dashboard');
      this.allDocuments = data.documents.filter(doc => doc.is_archived !== 1);
      this.filteredDocuments = [...this.allDocuments];
      
      document.getElementById('app').innerHTML = `
        <div class="app-layout">
          <aside class="sidebar">
            <div class="sidebar-header"><h1>PFDCS FILE TRACKING SYSTEM </h1></div>
            <nav class="sidebar-nav">
              <a href="/dashboard" class="sidebar-link active" onclick="event.preventDefault(); router.navigate('/dashboard')"><span class="sidebar-icon">📄</span><span>My Documents</span></a>
              <a href="/archives" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/archives')"><span class="sidebar-icon">🗄️</span><span>Archives</span></a>
              ${user.role === 'admin' ? `
              <div style="margin-top: 1rem; padding: 0 1rem; color: #64748b; font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Admin</div>
              <a href="/admin" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/admin')"><span class="sidebar-icon">⚙️</span><span>Admin Panel</span></a>
              <a href="/admin/documents" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/admin/documents')"><span class="sidebar-icon">📑</span><span>All Documents</span></a>
              ` : ''}
            </nav>
            <div class="sidebar-footer"><div class="user-info"><div class="user-avatar">👤</div><div class="user-details"><div class="user-name">${user.fullName || user.username}</div><div class="user-role">${user.role === 'admin' ? 'Admin User' : 'User'}</div></div></div><button onclick="logout()" class="btn-logout">Logout</button></div>
          </aside>
          
          <main class="main-content">
            <div class="content-header">
              <h2>My Documents</h2>
              <div style="display: flex; gap: 0.5rem;">
                <button onclick="downloadTableToExcel('documentsTable', 'mydocuments.xlsx')" class="btn btn--secondary" style="display: inline-flex; align-items: center; gap: 0.5rem;">📊 Download Data</button>
                <button onclick="openDocumentFormModal()" class="btn btn--primary">Upload Document</button>
              </div>
            </div>
            
            <div class="search-filters-inline">
              <input type="text" id="searchInput" placeholder="Search..." class="form-control search-inline">
              <select id="statusFilter" class="form-control filter-inline"><option value="">Status</option><option value="pending">Pending</option><option value="inprogress">In Progress</option><option value="routed">Routed</option><option value="completed">Completed</option></select>
              <!-- UPDATED PRIORITY FILTER -->
              <select id="priorityFilter" class="form-control filter-inline"><option value="">Priority</option><option value="not_rush">Not Rush</option><option value="rush">RUSH</option></select>
              <input type="date" id="dateFromFilter" class="form-control filter-inline"><input type="date" id="dateToFilter" class="form-control filter-inline">
              <button onclick="router.resetFilters()" class="btn btn-clear">Clear</button>
            </div>

            <div id="message"></div>
            <div class="documents-container"><div id="documentsList"></div></div>
            <div id="pagination"></div> <!-- Pagination container -->
          </main>
        </div>
      `;
      
      document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
      document.getElementById('statusFilter').addEventListener('change', () => this.applyFilters());
      document.getElementById('priorityFilter').addEventListener('change', () => this.applyFilters());
      document.getElementById('dateFromFilter').addEventListener('change', () => this.applyFilters());
      document.getElementById('dateToFilter').addEventListener('change', () => this.applyFilters());
      
      this.renderDocuments();

    } catch (error) {
      if (error.message.includes('Authentication')) { auth.removeToken(); this.navigate('/login'); }
      else this.showMessage(error.message, 'error');
    }
  },

  async showAdminAllDocuments() {
      // ... (Same structure as showDashboard but for admin all docs)
      const user = auth.getUser();
      try {
        const data = await api.get('/data/documents?all=true');
        this.allDocuments = data.documents.filter(doc => doc.is_archived !== 1);
        this.filteredDocuments = [...this.allDocuments];
        
        document.getElementById('app').innerHTML = `
          <div class="app-layout">
            <aside class="sidebar">
              <!-- ... sidebar ... -->
              <div class="sidebar-header"><h1>PFDCS FILE TRACKING SYSTEM</h1></div>
              <nav class="sidebar-nav">
                <a href="/dashboard" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/dashboard')"><span class="sidebar-icon">📄</span><span>My Documents</span></a>
                <a href="/archives" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/archives')"><span class="sidebar-icon">🗄️</span><span>Archives</span></a>
                <div style="margin-top: 1rem; padding: 0 1rem; color: #64748b; font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Admin</div>
                <a href="/admin" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/admin')"><span class="sidebar-icon">⚙️</span><span>Admin Panel</span></a>
                <a href="/admin/documents" class="sidebar-link active" onclick="event.preventDefault(); router.navigate('/admin/documents')"><span class="sidebar-icon">📑</span><span>All Documents</span></a>
              </nav>
               <div class="sidebar-footer"><div class="user-info"><div class="user-avatar">👤</div><div class="user-details"><div class="user-name">${user.fullName || user.username}</div><div class="user-role">${user.role === 'admin' ? 'Admin User' : 'User'}</div></div></div><button onclick="logout()" class="btn-logout">Logout</button></div>
            </aside>
            <main class="main-content">
              <div class="content-header">
                <h2>System Documents</h2>
                <button onclick="downloadTableToExcel('documentsTable', 'alldocuments.xlsx')" class="btn btn--secondary" style="display: inline-flex; align-items: center; gap: 0.5rem;">📊 Download Data</button>
              </div>
              
              <div class="search-filters-inline">
                  <!-- ... filters ... -->
                  <input type="text" id="searchInput" placeholder="Search..." class="form-control search-inline">
                  <select id="statusFilter" class="form-control filter-inline"><option value="">Status</option><option value="pending">Pending</option><option value="inprogress">In Progress</option><option value="routed">Routed</option><option value="completed">Completed</option></select>
                  <!-- UPDATED PRIORITY FILTER -->
                  <select id="priorityFilter" class="form-control filter-inline"><option value="">Priority</option><option value="not_rush">Not Rush</option><option value="rush">RUSH</option></select>
                  <input type="date" id="dateFromFilter" class="form-control filter-inline"><input type="date" id="dateToFilter" class="form-control filter-inline">
                  <button onclick="router.resetFilters()" class="btn btn-clear">Clear</button>
              </div>
              <div id="message"></div>
              <div class="documents-container"><div id="documentsList"></div></div>
              <div id="pagination"></div>
            </main>
          </div>
        `;
        // ... event listeners ...
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('statusFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('priorityFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('dateFromFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('dateToFilter').addEventListener('change', () => this.applyFilters());
        
        this.renderDocuments();
      } catch (error) {
         if (error.message.includes('Authentication')) { auth.removeToken(); this.navigate('/login'); }
         else this.showMessage(error.message, 'error');
      }
  },

  async showArchives() {
    const user = auth.getUser();
    try {
      const data = await api.get('/data/dashboard'); // Or specific archives endpoint
      this.allDocuments = data.documents.filter(doc => doc.is_archived === 1);
      this.filteredDocuments = [...this.allDocuments];

       document.getElementById('app').innerHTML = `
        <div class="app-layout">
          <aside class="sidebar">
            <div class="sidebar-header"><h1>PFDCS FILE TRACKING SYSTEM</h1></div>
            <nav class="sidebar-nav">
              <a href="/dashboard" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/dashboard')"><span class="sidebar-icon">📄</span><span>My Documents</span></a>
              <a href="/archives" class="sidebar-link active" onclick="event.preventDefault(); router.navigate('/archives')"><span class="sidebar-icon">🗄️</span><span>Archives</span></a>
              ${user.role === 'admin' ? `
              <div style="margin-top: 1rem; padding: 0 1rem; color: #64748b; font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Admin</div>
              <a href="/admin" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/admin')"><span class="sidebar-icon">⚙️</span><span>Admin Panel</span></a>
              <a href="/admin/documents" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/admin/documents')"><span class="sidebar-icon">📑</span><span>All Documents</span></a>
              ` : ''}
            </nav>
            <div class="sidebar-footer"><div class="user-info"><div class="user-avatar">👤</div><div class="user-details"><div class="user-name">${user.fullName || user.username}</div><div class="user-role">${user.role === 'admin' ? 'Admin User' : 'User'}</div></div></div><button onclick="logout()" class="btn-logout">Logout</button></div>
          </aside>
          
          <main class="main-content">
            <div class="content-header">
              <h2>Archives</h2>
              <button onclick="downloadTableToExcel('documentsTable', 'archives.xlsx')" class="btn btn--secondary" style="display: inline-flex; align-items: center; gap: 0.5rem;">📊 Download Data</button>
            </div>
            
            <div class="search-filters-inline">
              <input type="text" id="searchInput" placeholder="Search..." class="form-control search-inline">
              <!-- UPDATED PRIORITY FILTER -->
              <select id="priorityFilter" class="form-control filter-inline"><option value="">Priority</option><option value="not_rush">Not Rush</option><option value="rush">RUSH</option></select>
              <input type="date" id="dateFromFilter" class="form-control filter-inline"><input type="date" id="dateToFilter" class="form-control filter-inline">
              <button onclick="router.resetFilters()" class="btn btn-clear">Clear</button>
            </div>

            <div id="message"></div>
            <div class="documents-container"><div id="documentsList"></div></div>
            <div id="pagination"></div>
          </main>
        </div>
      `;
      
      document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
      document.getElementById('priorityFilter').addEventListener('change', () => this.applyFilters());
      document.getElementById('dateFromFilter').addEventListener('change', () => this.applyFilters());
      document.getElementById('dateToFilter').addEventListener('change', () => this.applyFilters());
      
      this.renderArchivedDocuments();

    } catch (error) {
      if (error.message.includes('Authentication')) { auth.removeToken(); this.navigate('/login'); }
      else this.showMessage(error.message, 'error');
    }
  },
  
  // ... (showAdminPanel implementation remains mostly same, can be condensed)
  async showAdminPanel() {
      // ... implementation for admin dashboard stats
       const user = auth.getUser();
       // ... fetch stats ...
       // ... render admin panel html ...
       // Use existing implementation
       // For brevity, assuming the standard admin panel code here
       // Ensure sidebar links point to correct router.navigate calls
       try {
        const [statsData, usersData, pendingData] = await Promise.all([
            api.get('/users/stats'),
            api.get('/users/list'),
            api.get('/users/pending')
        ]);
        
        document.getElementById('app').innerHTML = `
             <div class="app-layout">
                <aside class="sidebar">
                  <div class="sidebar-header"><h1>PFDCS FILE TRACKING SYSTEM</h1></div>
                  <nav class="sidebar-nav">
                    <a href="/dashboard" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/dashboard')"><span class="sidebar-icon">📄</span><span>My Documents</span></a>
                    <a href="/archives" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/archives')"><span class="sidebar-icon">🗄️</span><span>Archives</span></a>
                    <div style="margin-top: 1rem; padding: 0 1rem; color: #64748b; font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Admin</div>
                    <a href="/admin" class="sidebar-link active" onclick="event.preventDefault(); router.navigate('/admin')"><span class="sidebar-icon">⚙️</span><span>Admin Panel</span></a>
                    <a href="/admin/documents" class="sidebar-link" onclick="event.preventDefault(); router.navigate('/admin/documents')"><span class="sidebar-icon">📑</span><span>All Documents</span></a>
                  </nav>
                  <div class="sidebar-footer"><div class="user-info"><div class="user-avatar">👤</div><div class="user-details"><div class="user-name">${user.fullName || user.username}</div><div class="user-role">${user.role === 'admin' ? 'Admin User' : 'User'}</div></div></div><button onclick="logout()" class="btn-logout">Logout</button></div>
                </aside>
                <main class="main-content">
                    <div class="content-header"><h2>Admin Panel</h2></div>
                    <!-- Stats Cards -->
                    <div style="display: flex; flex-wrap: wrap; gap: var(--space-24); margin-bottom: var(--space-32);">
                        <div style="flex: 1 1 240px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: var(--space-24); border-radius: var(--radius-xl); box-shadow: var(--shadow-lg);">
                            <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">Total Users</div>
                            <div style="font-size: 2.5rem; font-weight: 700;">${statsData.user_stats.total_users || 0}</div>
                        </div>
                        <div style="flex: 1 1 240px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: var(--space-24); border-radius: var(--radius-xl); box-shadow: var(--shadow-lg);">
                            <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">Pending Approvals</div>
                            <div style="font-size: 2.5rem; font-weight: 700;">${statsData.user_stats.pending_users || 0}</div>
                        </div>
                        <div style="flex: 1 1 240px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: var(--space-24); border-radius: var(--radius-xl); box-shadow: var(--shadow-lg);">
                            <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">Active Users</div>
                            <div style="font-size: 2.5rem; font-weight: 700;">${statsData.user_stats.active_users || 0}</div>
                        </div>
                         <div style="flex: 1 1 240px; background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: var(--space-24); border-radius: var(--radius-xl); box-shadow: var(--shadow-lg);">
                            <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">Total Documents</div>
                            <div style="font-size: 2.5rem; font-weight: 700;">${statsData.document_stats.total_documents || 0}</div>
                        </div>
                    </div>
                    
                    <div id="adminMessage"></div>
                    ${pendingData.pending_users.length > 0 ? `
                    <div style="background: white; border-radius: var(--radius-xl); padding: var(--space-24); margin-bottom: 2rem; box-shadow: var(--shadow-md); border-left: 4px solid var(--color-warning);">
                        <h3 style="margin: 0 0 1rem 0; color: var(--color-warning); display: flex; align-items: center; gap: 0.5rem;">
                            <span>⚠️</span> <span>Pending User Registrations (${pendingData.pending_users.length})</span>
                        </h3>
                        <div style="overflow-x: auto;">
                        <table class="table">
                            <thead><tr><th>Full Name</th><th>Username</th><th>Email</th><th>Department</th><th>Registered</th><th>Actions</th></tr></thead>
                            <tbody>
                                ${pendingData.pending_users.map(u => `
                                <tr>
                                    <td>${u.full_name}</td><td>${u.username}</td><td>${u.email}</td><td>${u.department || 'N/A'}</td><td>${new Date(u.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div style="display: flex; gap: 0.5rem;">
                                            <button onclick="approveUser('${u.user_id}', '${u.username}')" class="btn btn--sm" style="background: var(--color-success); color: white;">Approve</button>
                                            <button onclick="rejectUser('${u.user_id}', '${u.username}')" class="btn btn--sm" style="background: var(--color-error); color: white;">Reject</button>
                                        </div>
                                    </td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        </div>
                    </div>` : ''}
                    
                    <div style="background: white; border-radius: var(--radius-xl); padding: var(--space-24); box-shadow: var(--shadow-md);">
                        <h3 style="margin: 0 0 1rem 0; color: var(--color-text);">All Users</h3>
                        <div style="overflow-x: auto;">
                        <table class="table">
                             <thead><tr><th>Full Name</th><th>Username</th><th>Email</th><th>Department</th><th>Role</th><th>Status</th><th>Registered</th><th>Actions</th></tr></thead>
                             <tbody>
                                ${usersData.users.map(u => `
                                <tr style="${u.is_active === 0 ? 'opacity: 0.6; background: #fffbeb;' : ''}">
                                    <td>${u.full_name}</td><td>${u.username}</td><td>${u.email}</td><td>${u.department || 'N/A'}</td>
                                    <td><span class="badge" style="${u.role === 'admin' ? 'background: #dbeafe; color: #1e40af;' : 'background: #e5e7eb; color: #374151;'}">${u.role === 'admin' ? 'Admin' : 'User'}</span></td>
                                    <td><span class="badge" style="${u.is_active === 1 ? 'background: #d1fae5; color: #065f46;' : 'background: #fee2e2; color: #991b1b;'}">${u.is_active === 1 ? 'Active' : 'Inactive'}</span></td>
                                    <td>${new Date(u.created_at).toLocaleDateString()}</td>
                                    <td>
                                        ${u.role !== 'admin' || user.role === 'admin' ? `
                                        <div style="display: flex; gap: 0.5rem;">
                                            ${u.is_active ? 
                                              `<button onclick="deactivateUser('${u.user_id}', '${u.username}')" class="btn btn--sm" style="background: var(--color-warning); color: white;">Deactivate</button>` : 
                                              `<button onclick="reactivateUser('${u.user_id}', '${u.username}')" class="btn btn--sm" style="background: var(--color-success); color: white;">Reactivate</button>`
                                            }
                                            ${u.role !== 'admin' ? 
                                              `<button onclick="makeAdmin('${u.user_id}', '${u.username}')" class="btn btn--sm" style="background: var(--color-primary); color: white;">Make Admin</button>` : 
                                              `<button onclick="removeAdmin('${u.user_id}', '${u.username}')" class="btn btn--sm" style="background: var(--color-text-secondary); color: white;">Demote</button>`
                                            }
                                            <button onclick="deleteUser('${u.user_id}', '${u.username}')" class="btn btn--sm" style="background: var(--color-error); color: white;">🗑️</button>
                                        </div>` : ''}
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
       } catch (e) {
        alert(e.message);
        this.navigate('/dashboard');
       }
  }
};

// --- Helper Functions ---
async function approveUser(userId, username) {
  if (!confirm(`Approve user ${username}?`)) return;
  try { await api.post('/users/approve', { user_id: userId }); alert('User approved!'); router.showAdminPanel(); } catch (error) { alert('Failed: ' + error.message); }
}
async function rejectUser(userId, username) {
  if (!confirm(`Reject user ${username}? Cannot be undone.`)) return;
  try { await api.post('/users/reject', { user_id: userId }); alert('User rejected!'); router.showAdminPanel(); } catch (error) { alert('Failed: ' + error.message); }
}
async function deactivateUser(userId, username) {
  if (!confirm(`Deactivate user ${username}?`)) return;
  try { await api.post('/users/deactivate', { user_id: userId }); alert('User deactivated!'); router.showAdminPanel(); } catch (error) { alert('Failed: ' + error.message); }
}
async function reactivateUser(userId, username) {
  if (!confirm(`Reactivate user ${username}?`)) return;
  try { await api.post('/users/reactivate', { user_id: userId }); alert('User reactivated!'); router.showAdminPanel(); } catch (error) { alert('Failed: ' + error.message); }
}
async function makeAdmin(userId, username) {
  if (!confirm(`Grant admin privileges to ${username}?`)) return;
  try { await api.post('/users/update-role', { user_id: userId, role: 'admin' }); alert('User promoted to admin!'); router.showAdminPanel(); } catch (error) { alert('Failed: ' + error.message); }
}
async function removeAdmin(userId, username) {
  if (!confirm(`Remove admin privileges from ${username}?`)) return;
  try { await api.post('/users/update-role', { user_id: userId, role: 'user' }); alert('Admin privileges removed!'); router.showAdminPanel(); } catch (error) { alert('Failed: ' + error.message); }
}
async function deleteUser(userId, username) {
  if (!confirm(`PERMANENTLY DELETE user ${username}? CANNOT be undone!`)) return;
  try { await api.post('/users/delete', { user_id: userId }); alert('User deleted!'); router.showAdminPanel(); } catch (error) { alert('Failed: ' + error.message); }
}

// Global functions for onClick handlers
window.viewDocument = async function(documentId) {
  try {
    const data = await api.get(`/data/documents?id=${documentId}`);
    if (data.success && data.document) viewModal.open(documentId, data.document);
  } catch (error) { alert('Error loading document: ' + error.message); }
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
        } catch (error) { alert('Error updating document: ' + error.message); }
      });
    }
  } catch (error) { alert('Error loading document: ' + error.message); }
};

window.routeDocument = function(documentId, documentTitle) {
  routeModal.open(documentId, documentTitle);
};

// FIXED: Table styling updated to ensure high visibility of column headers
window.viewDocumentHistory = async function(documentId, documentTitle) {
  try {
    const data = await api.get(`/data/documents?id=${documentId}&history=true`);
    const historyList = data.history;
    const historyHtml = `
      <div id="historyModal" class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h3>History: ${documentTitle}</h3>
          </div>
          
          <div class="modal-body">
            <div style="overflow-x: auto;">
                <table class="table" style="width: 100%; border-collapse: collapse; min-width: 600px;">
                <thead>
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
                        <td style="padding: 12px; font-size: 0.9em; white-space: nowrap;">${new Date(h.created_at).toLocaleString()}</td>
                        <td style="padding: 12px; font-weight: 500;">${h.user_name || 'System'}</td>
                        <td style="padding: 12px;"><span style="padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: 600; background: #e0f2fe; color: #0369a1;">${h.action}</span></td>
                        <td style="padding: 12px; font-size: 0.9em; color: #4b5563;">${h.details}</td>
                    </tr>
                    `).join('') : `
                    <tr><td colspan="4" style="padding: 2rem; text-align: center; color: #666;">No history found for this document.</td></tr>
                    `}
                </tbody>
                </table>
            </div>
          </div>
          
          <div class="modal-footer">
            <button onclick="document.getElementById('historyModal').remove()" class="btn btn--secondary">Close</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', historyHtml);
  } catch (error) { alert('Error loading history: ' + error.message); }
};

window.deleteDocument = async function(documentId, title) {
  if (!confirm(`Are you sure you want to delete "${title}"? This will permanently delete the document and its file from storage. This action CANNOT be undone!`)) return;
  try {
    const result = await api.delete(`/data/documents?id=${documentId}`);
    alert(result.message || 'Document deleted successfully!');
    router.handleRoute();
  } catch (error) { alert('Error deleting document: ' + error.message); }
};

// FIXED: Uses POST with ?action=archive as required by your backend
window.archiveDocument = async function(documentId) {
  if (!confirm(`Archive this document?`)) return;
  try {
    // Backend expects POST to /data/documents?action=archive
    const result = await api.post(`/data/documents?action=archive`, { document_id: documentId });
    alert(result.message || 'Document archived');
    router.handleRoute();
  } catch (error) { alert('Error archiving document: ' + error.message); }
};

// FIXED: Uses POST with ?action=restore as required by your backend
window.restoreDocument = async function(documentId) {
  if (!confirm(`Restore this document from archives?`)) return;
  try {
    // Backend expects POST to /data/documents?action=restore
    const result = await api.post(`/data/documents?action=restore`, { document_id: documentId });
    alert(result.message || 'Document restored');
    router.handleRoute();
  } catch (error) { alert('Error restoring document: ' + error.message); }
};

window.openDocumentFormModal = function() {
    const modalHtml = `
      <div id="uploadModalOverlay" class="modal-overlay">
        <div class="modal">
          <!-- Header (Fixed at top) -->
          <div class="modal-header">
            <h2>Upload Document</h2>
          </div>
          
          <!-- FIXED: Changed 'height: 100%' to 'flex: 1; min-height: 0;' -->
          <!-- This ensures the form fits INSIDE the modal without getting cut off -->
          <form id="uploadDocumentForm" style="display: flex; flex-direction: column; flex: 1; min-height: 0;">
            
            <div class="modal-body">
                <!-- Manual Document Number -->
                <div class="form-group">
                  <label class="form-label">Document Number <span style="color:red">*</span></label>
                  <input type="text" name="document_number" class="form-control" placeholder="e.g. 2024-001">
                </div>

                <div class="form-group">
                  <label class="form-label">Title <span style="color:red">*</span></label>
                  <input type="text" name="title" class="form-control" required>
                </div>

                <div class="form-group">
                  <label class="form-label">Description</label>
                  <textarea name="description" class="form-control" rows="3"></textarea>
                </div>

                <div class="form-group">
                  <label class="form-label">Document Type <span style="color:red">*</span></label>
                  <!-- FIXED: Changed name="documentType" to name="document_type" to match backend expectation -->
                  <input type="text" name="document_type" class="form-control" required placeholder="e.g. Memo, Invoice, Report">
                </div>
                
                 <!-- ADDED: Signatory Field -->
                <div class="form-group">
                  <label class="form-label">Signatory</label>
                  <input type="text" name="signatory" class="form-control" placeholder="e.g. John Doe">
                </div>

                <div class="form-group">
                  <label class="form-label">Priority <span style="color:red">*</span></label>
                  <!-- NEW: Simplified Priority Options -->
                  <select name="priority" class="form-control" required>
                    <option value="not_rush">Not Rush</option>
                    <option value="rush">RUSH</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">File Attachment</label>
                  <input type="file" name="file" class="form-control">
                </div>
            </div>

            <div class="modal-footer">
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
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

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
window.downloadTableToExcel = function(tableId, filename = 'export.xlsx'){
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

    const wb = XLSX.utils.table_to_book(clone, {sheet: "Sheet1"});
    XLSX.writeFile(wb, filename);
};

// Mark document as completed
window.completeDocument = async function(documentId, documentTitle) {
  if (!confirm(`Mark "${documentTitle}" as COMPLETED?`)) {
    return;
  }

  try {
    const result = await api.request('data/documents?action=complete', {
      method: 'POST',
      body: JSON.stringify({ document_id: documentId })
    });
    
    alert(result.message || 'Document marked as completed!');
    router.handleRoute(); // Refresh the current page
  } catch (error) {
    alert('Failed to complete document: ' + error.message);
  }
};



// Initialize App
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
