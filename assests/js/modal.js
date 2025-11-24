// modal.js

// Ensure globals exist
window.routeModal = null;
window.documentFormModal = null;
window.openUploadModal = null;
window.openRouteModal = null;
window.openDocumentFormModal = null;

// ========== Route Document Modal ==========
class DocumentModal {
  constructor() {
    this.modal = null;
    this.init();
  }

  init() {
    this.createModal();
    this.attachEventListeners();
  }

  createModal() {
    // Guard against duplicates
    if (document.getElementById('routeModal')) {
      this.modal = document.getElementById('routeModal');
      return;
    }

    const modalHTML = `
      <div id="routeModal" class="modal-overlay" aria-hidden="true" style="display:none">
        <div class="modal">
          <div class="modal__header modal-header">
            <h3 class="modal__title">Route Document</h3>
            <button class="modal__close modal-close" aria-label="Close">&times;</button>
          </div>
          <div class="modal__body modal-body">
            <form id="routeForm" method="POST">
              <input type="hidden" name="document_id" id="modal_document_id">

              <div class="form-group">
                <label class="form-label" for="route_to_user_id">Route To:</label>
                <select id="route_to_user_id" name="to_user_id" class="form-control" required>
                  <option value="">Select User</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="route_action_taken">Action:</label>
                <select id="route_action_taken" name="action_taken" class="form-control" required>
                  <option value="forwarded">Forward</option>
                  <option value="returned">Return</option>
                  <option value="completed">Mark as Completed</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="route_remarks">Remarks:</label>
                <textarea id="route_remarks" name="remarks" class="form-control" rows="3" required></textarea>
              </div>

              <div class="modal-footer" style="display:flex; gap: var(--space-12); justify-content:flex-end; margin-top: var(--space-24);">
                <button type="button" class="btn btn--outline modal-cancel">Cancel</button>
                <button type="submit" class="btn btn--primary">Route Document</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('routeModal');
  }

  attachEventListeners() {
    const closeBtn = this.modal.querySelector('.modal__close');
    closeBtn.addEventListener('click', () => this.close());

    const cancelBtn = this.modal.querySelector('.modal-cancel');
    cancelBtn.addEventListener('click', () => this.close());

    const form = this.modal.querySelector('#routeForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = Object.fromEntries(formData);

      try {
        const result = await api.post('/route', data);
        alert(result.message || 'Document routed successfully!');
        this.close();
        if (typeof router !== 'undefined') router.showDashboard();
      } catch (error) {
        alert(error.message || 'Failed to route document');
      }
    });

    // Click outside the panel closes (only when clicking overlay)
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('active')) {
        this.close();
      }
    });
  }

  open(documentId, users) {
    document.getElementById('modal_document_id').value = documentId;

    // Populate users dropdown
    const select = this.modal.querySelector('select[name="to_user_id"]');
    select.innerHTML = '<option value="">Select User</option>';

    (users || []).forEach(user => {
      const option = document.createElement('option');
      option.value = user.user_id;
      const dept = user.department || 'N/A';
      option.textContent = `${user.full_name} (${dept})`;
      select.appendChild(option);
    });

    // Force overlay visible and accessible
    this.modal.classList.add('active');
    this.modal.setAttribute('aria-hidden', 'false');
    this.modal.style.setProperty('display', 'flex', 'important');
    this.modal.style.position = 'fixed';
    this.modal.style.inset = '0';
    this.modal.style.zIndex = '2147483647';
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.modal.classList.remove('active');
    this.modal.setAttribute('aria-hidden', 'true');
    this.modal.style.display = 'none';
    document.body.style.overflow = '';
    this.modal.querySelector('form').reset();
  }
}

// ========== Document Upload/Edit Modal ==========
class DocumentFormModal {
  constructor() {
    this.modal = null;
    this.init();
  }

  init() {
    this.createModal();
    this.attachEventListeners();
  }

  createModal() {
    // Guard against duplicates
    if (document.getElementById('documentFormModal')) {
      this.modal = document.getElementById('documentFormModal');
      return;
    }

    const modalHTML = `
      <div id="documentFormModal" class="modal-overlay" aria-hidden="true" style="display:none">
        <div class="modal">
          <div class="modal__header modal-header">
            <h3 class="modal__title" id="documentFormTitle">Upload Document</h3>
            <button class="modal__close modal-close" aria-label="Close">&times;</button>
          </div>
          <div class="modal__body modal-body">
            <div id="uploadMessage"></div>
            <form id="documentForm" enctype="multipart/form-data">
              <input type="hidden" name="document_id" id="form_document_id">

              <div class="form-group" id="fileUploadGroup">
                <label class="form-label" for="fileInput">Document File *</label>
                <div class="file-upload-area" id="fileUploadArea" onclick="document.getElementById('fileInput').click()">
                  <input type="file" id="fileInput" name="file" style="display:none" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" required>
                  <div id="fileUploadText">
                    <p style="font-size: var(--font-size-lg); margin-bottom: var(--space-8);">📁 Click to upload file</p>
                    <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                      Supported: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                    </p>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="form_title">Document Title *</label>
                <input type="text" name="title" id="form_title" class="form-control" placeholder="Enter document title" required maxlength="255">
              </div>

              <div class="form-group">
                <label class="form-label" for="form_description">Description</label>
                <textarea name="description" id="form_description" class="form-control" rows="3" placeholder="Enter document description (optional)"></textarea>
              </div>

              <div class="form-group">
                <label class="form-label" for="form_document_type">Document Type *</label>
                <select name="document_type" id="form_document_type" class="form-control" required>
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

              <div class="form-group">
                <label class="form-label" for="form_priority">Priority *</label>
                <select name="priority" id="form_priority" class="form-control" required>
                  <option value="">Select priority</option>
                  <option value="low">Low</option>
                  <option value="medium" selected>Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div class="modal-footer" style="display:flex; gap: var(--space-12); justify-content:flex-end; margin-top: var(--space-24);">
                <button type="button" class="btn btn--outline modal-cancel">Cancel</button>
                <button type="submit" class="btn btn--primary" id="formSubmitBtn">
                  <span id="uploadBtnText">Upload Document</span>
                  <span id="uploadBtnSpinner" style="display:none;">⏳ Uploading...</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('documentFormModal');
  }

  attachEventListeners() {
    const closeBtn = this.modal.querySelector('.modal__close');
    closeBtn.addEventListener('click', () => this.close());

    const cancelBtn = this.modal.querySelector('.modal-cancel');
    cancelBtn.addEventListener('click', () => this.close());

    const fileInput = document.getElementById('fileInput');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileUploadText = document.getElementById('fileUploadText');

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          this.showMessage('File size must be less than 10MB', 'error');
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

    const form = this.modal.querySelector('#documentForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = document.getElementById('formSubmitBtn');
      const btnText = document.getElementById('uploadBtnText');
      const btnSpinner = document.getElementById('uploadBtnSpinner');

      submitBtn.disabled = true;
      btnText.style.display = 'none';
      btnSpinner.style.display = 'inline';

      const formData = new FormData(form);
      const documentId = document.getElementById('form_document_id').value;

      try {
        let result;
        if (documentId) {
          // Edit mode (no file)
          const data = {
            document_id: documentId,
            newTitle: formData.get('title'),
            newDescription: formData.get('description'),
            newType: formData.get('document_type'),
            newPriority: formData.get('priority')
          };
          result = await api.put('/document', data);
        } else {
          // Upload mode (requires file)
          const file = fileInput.files[0];
          if (!file) {
            this.showMessage('Please select a file', 'error');
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnSpinner.style.display = 'none';
            return;
          }
          result = await api.uploadFile('/document', formData);
        }

        this.showMessage(result.message || 'Success!', 'success');

        setTimeout(() => {
          this.close();
          if (typeof router !== 'undefined') {
            router.showDashboard();
          } else {
            location.reload();
          }
        }, 1500);

      } catch (error) {
        this.showMessage(error.message || 'Operation failed. Please try again.', 'error');
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
      }
    });

    // Click outside the panel closes (only when clicking overlay)
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('active')) {
        this.close();
      }
    });
  }

  showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('uploadMessage');
    if (messageDiv) {
      messageDiv.innerHTML = `<div class="status status--${type}" style="margin-bottom: var(--space-16);">${message}</div>`;
    }
  }

  open(docData = null) {
    const form = this.modal.querySelector('#documentForm');
    const titleEl = document.getElementById('documentFormTitle');
    const btnText = document.getElementById('uploadBtnText');
    const fileGroup = document.getElementById('fileUploadGroup');
    const fileInput = document.getElementById('fileInput');

    if (docData) {
      // Edit mode
      titleEl.textContent = 'Edit Document';
      btnText.textContent = 'Update Document';
      document.getElementById('form_document_id').value = docData.document_id;
      document.getElementById('form_title').value = docData.title || '';
      document.getElementById('form_document_type').value = docData.document_type || '';
      document.getElementById('form_priority').value = docData.priority || 'medium';
      document.getElementById('form_description').value = docData.description || '';
      fileGroup.style.display = 'none';
      fileInput.removeAttribute('required');
    } else {
      // Upload mode
      titleEl.textContent = 'Upload Document';
      btnText.textContent = 'Upload Document';
      document.getElementById('form_document_id').value = '';
      form.reset();
      fileGroup.style.display = 'block';
      fileInput.setAttribute('required', 'required');

      const fileUploadArea = document.getElementById('fileUploadArea');
      const fileUploadText = document.getElementById('fileUploadText');
      fileUploadArea.classList.remove('has-file');
      fileUploadText.innerHTML = `
        <p style="font-size: var(--font-size-lg); margin-bottom: var(--space-8);">📁 Click to upload file</p>
        <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
          Supported: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
        </p>
      `;
    }

    // Force overlay visible and accessible
    this.modal.classList.add('active');
    this.modal.setAttribute('aria-hidden', 'false');
    this.modal.style.setProperty('display', 'flex', 'important');
    this.modal.style.position = 'fixed';
    this.modal.style.inset = '0';
    this.modal.style.zIndex = '2147483647';
    document.body.style.overflow = 'hidden';

    console.log('Modal opened, display:', this.modal.style.display);
  }

  close() {
    this.modal.classList.remove('active');
    this.modal.setAttribute('aria-hidden', 'true');
    this.modal.style.display = 'none';
    document.body.style.overflow = '';
    this.modal.querySelector('form').reset();
    const msg = document.getElementById('uploadMessage');
    if (msg) msg.innerHTML = '';
  }
}

// ===== Initialize modals once DOM is ready =====
function initModals() {
  console.log('Initializing modals...');
  window.routeModal = new DocumentModal();
  window.documentFormModal = new DocumentFormModal();
  console.log('Modals initialized:', { routeModal, documentFormModal });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initModals);
} else {
  initModals();
}

// ===== Global helpers (for inline onclick bindings) =====
window.openUploadModal = function () {
  console.log('openUploadModal called');
  if (window.documentFormModal) {
    window.documentFormModal.open(null);
  } else {
    alert('Modal system not ready yet. Please reload.');
  }
};

window.openRouteModal = function (documentId, users) {
  console.log('openRouteModal called');
  if (window.routeModal) {
    window.routeModal.open(documentId, users || []);
  } else {
    alert('Modal system not ready yet. Please reload.');
  }
};

window.openDocumentFormModal = function (documentId = null) {
  console.log('openDocumentFormModal called');
  if (!window.documentFormModal) {
    alert('Modal system not ready yet. Please reload.');
    return;
  }
  if (documentId && typeof api !== 'undefined') {
    api.get(`/document?id=${documentId}`)
      .then(response => {
        window.documentFormModal.open(response.document);
      })
      .catch(error => {
        alert('Failed to load document: ' + error.message);
      });
  } else {
    window.documentFormModal.open(null);
  }
};
