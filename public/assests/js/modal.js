// modal.js - FIXED VERSION (Handles Close/Reopen + File Upload)

window.routeModal = null;
window.documentFormModal = null;

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
        if (document.getElementById('routeModal')) {
            this.modal = document.getElementById('routeModal');
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'routeModal';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.6); z-index: 2147483647;
            display: none; align-items: center; justify-content: center;
            backdrop-filter: blur(4px);
        `;

        const box = document.createElement('div');
        box.style.cssText = `
            background: white; width: 90%; max-width: 600px;
            border-radius: 12px; padding: 24px; position: relative;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        `;

        box.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:20px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <h3 style="margin:0; font-size:1.25rem;">Route Document</h3>
                <button class="modal__close" style="background:none; border:none; font-size:24px; cursor:pointer;">&times;</button>
            </div>
            <form id="routeForm">
                <input type="hidden" name="document_id" id="modal_document_id">
                <div style="margin-bottom:15px;">
                    <label style="display:block; margin-bottom:5px; font-weight:500;">Route To:</label>
                    <select name="to_user_id" class="form-control" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;" required>
                        <option value="">Select User</option>
                    </select>
                </div>
                <div style="margin-bottom:15px;">
                    <label style="display:block; margin-bottom:5px; font-weight:500;">Action:</label>
                    <select name="action_taken" class="form-control" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;" required>
                        <option value="forwarded">Forward</option>
                        <option value="returned">Return</option>
                        <option value="completed">Mark as Completed</option>
                    </select>
                </div>
                <div style="margin-bottom:15px;">
                    <label style="display:block; margin-bottom:5px; font-weight:500;">Remarks:</label>
                    <textarea name="remarks" rows="3" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;" required></textarea>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:10px;">
                    <button type="button" class="modal-cancel" style="padding:8px 16px; border:1px solid #ccc; background:white; border-radius:4px; cursor:pointer;">Cancel</button>
                    <button type="submit" style="padding:8px 16px; background:#2563eb; color:white; border:none; border-radius:4px; cursor:pointer;">Route Document</button>
                </div>
            </form>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);
        this.modal = overlay;
    }

    attachEventListeners() {
        const closeBtn = this.modal.querySelector('.modal__close');
        const cancelBtn = this.modal.querySelector('.modal-cancel');
        
        closeBtn.onclick = () => this.close();
        cancelBtn.onclick = () => this.close();

        this.modal.onclick = (e) => { 
            if (e.target === this.modal) this.close(); 
        };

        const form = this.modal.querySelector('#routeForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            try {
                const result = await api.post('/route', Object.fromEntries(formData));
                alert(result.message || 'Success!');
                this.close();
                if (window.router) window.router.showDashboard();
            } catch (err) { 
                alert(err.message || 'Failed to route document'); 
            }
        };
    }

    open(documentId, users) {
        document.getElementById('modal_document_id').value = documentId;
        const select = this.modal.querySelector('select[name="to_user_id"]');
        select.innerHTML = '<option value="">Select User</option>';
        users.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.user_id;
            opt.text = `${u.full_name} (${u.department || 'N/A'})`;
            select.appendChild(opt);
        });
        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.modal.style.display = 'none';
        document.body.style.overflow = '';
        this.modal.querySelector('form').reset();
    }
}

// ========== Document Upload Modal ==========
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
        if (document.getElementById('documentFormModal')) {
            this.modal = document.getElementById('documentFormModal');
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'documentFormModal';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.6); z-index: 2147483647;
            display: none; align-items: center; justify-content: center;
            backdrop-filter: blur(4px);
        `;

        const box = document.createElement('div');
        box.style.cssText = `
            background: white; width: 90%; max-width: 600px;
            border-radius: 12px; padding: 24px; position: relative;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
            max-height: 90vh; overflow-y: auto;
        `;

        box.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:20px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <h3 id="documentFormTitle" style="margin:0; font-size:1.25rem;">Upload Document</h3>
                <button class="modal__close" style="background:none; border:none; font-size:24px; cursor:pointer;">&times;</button>
            </div>
            <div id="uploadMessage"></div>
            <form id="documentForm" enctype="multipart/form-data">
                <input type="hidden" name="document_id" id="form_document_id">
                
                <div id="fileUploadGroup" style="margin-bottom:15px;">
                    <label style="display:block; margin-bottom:5px; font-weight:500;">Document File *</label>
                    <div id="fileUploadArea" style="border:2px dashed #ccc; padding:20px; text-align:center; cursor:pointer; border-radius:8px; background:#f9f9f9;">
                        <input type="file" id="fileInput" name="file" style="display:none;" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" required>
                        <div id="fileUploadText">📁 Click to upload file<br><small style="color:#666;">PDF, DOC, DOCX, JPG, PNG (Max 10MB)</small></div>
                    </div>
                </div>

                <div style="margin-bottom:15px;">
                    <label style="display:block; margin-bottom:5px; font-weight:500;">Title *</label>
                    <input type="text" name="title" id="form_title" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;" required>
                </div>

                <div style="margin-bottom:15px;">
                    <label style="display:block; margin-bottom:5px; font-weight:500;">Description</label>
                    <textarea name="description" id="form_description" rows="2" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;"></textarea>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:20px;">
                    <div>
                        <label style="display:block; margin-bottom:5px; font-weight:500;">Type *</label>
                        <select name="document_type" id="form_document_type" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;" required>
                            <option value="">Select...</option>
                            <option value="Memo">Memo</option>
                            <option value="Letter">Letter</option>
                            <option value="Report">Report</option>
                            <option value="Invoice">Invoice</option>
                            <option value="Contract">Contract</option>
                            <option value="incoming">Incoming</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block; margin-bottom:5px; font-weight:500;">Priority *</label>
                        <select name="priority" id="form_priority" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;" required>
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                </div>

                <div style="display:flex; justify-content:flex-end; gap:10px;">
                    <button type="button" class="modal-cancel" style="padding:8px 16px; border:1px solid #ccc; background:white; border-radius:4px; cursor:pointer;">Cancel</button>
                    <button type="submit" id="formSubmitBtn" style="padding:8px 16px; background:#2563eb; color:white; border:none; border-radius:4px; cursor:pointer;">
                        <span id="uploadBtnText">Upload</span>
                        <span id="uploadBtnSpinner" style="display:none;">⏳ Uploading...</span>
                    </button>
                </div>
            </form>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);
        this.modal = overlay;
    }

    attachEventListeners() {
        const closeBtn = this.modal.querySelector('.modal__close');
        const cancelBtn = this.modal.querySelector('.modal-cancel');
        
        closeBtn.onclick = () => this.close();
        cancelBtn.onclick = () => this.close();
        
        this.modal.onclick = (e) => { 
            if (e.target === this.modal) this.close(); 
        };

        // File upload click handler
        const fileUploadArea = this.modal.querySelector('#fileUploadArea');
        const fileInput = this.modal.querySelector('#fileInput');
        
        fileUploadArea.onclick = () => {
            fileInput.click();
        };

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const uploadText = this.modal.querySelector('#fileUploadText');
                const sizeInMB = (file.size / 1024 / 1024).toFixed(2);
                
                if (file.size > 10 * 1024 * 1024) {
                    alert('File size must be less than 10MB');
                    fileInput.value = '';
                    return;
                }
                
                uploadText.innerHTML = `✅ ${file.name}<br><small style="color:#10b981;">${sizeInMB} MB</small>`;
                fileUploadArea.style.borderColor = '#10b981';
                fileUploadArea.style.background = '#ecfdf5';
            }
        };

        const form = this.modal.querySelector('#documentForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('formSubmitBtn');
            const btnText = document.getElementById('uploadBtnText');
            const btnSpinner = document.getElementById('uploadBtnSpinner');
            
            btn.disabled = true;
            btnText.style.display = 'none';
            btnSpinner.style.display = 'inline';
            
            const formData = new FormData(form);
            const id = document.getElementById('form_document_id').value;
            
            try {
                let res;
                if (id) {
                    // EDIT existing document -> same handler at /api/data/documents
                    res = await api.put('/data/documents', {
                        document_id: id,
                        newTitle: formData.get('title'),
                        newDescription: formData.get('description'),
                        newType: formData.get('document_type'),
                        newPriority: formData.get('priority')
                    });
                } else {
                    // CREATE new document -> upload to /api/data/documents
                    if (!fileInput.files[0]) {
                        throw new Error("Please select a file");
                    }
                    res = await api.uploadFile('/data/documents', formData);
                }
                
                alert(res.message || 'Success!');
                this.close();
                
                if (window.router) window.router.showDashboard();
                else location.reload();
                
            } catch (err) {
                alert(err.message || 'Operation failed');
                btn.disabled = false;
                btnText.style.display = 'inline';
                btnSpinner.style.display = 'none';
            }
        };
    }

    open(docData = null) {
        const title = this.modal.querySelector('#documentFormTitle');
        const btnText = this.modal.querySelector('#uploadBtnText');
        const fileGroup = this.modal.querySelector('#fileUploadGroup');
        const fileInput = this.modal.querySelector('#fileInput');
        const fileUploadArea = this.modal.querySelector('#fileUploadArea');
        const fileUploadText = this.modal.querySelector('#fileUploadText');

        if (docData) {
            // Edit mode
            title.innerText = 'Edit Document';
            btnText.innerText = 'Update';
            document.getElementById('form_document_id').value = docData.document_id;
            document.getElementById('form_title').value = docData.title || '';
            document.getElementById('form_description').value = docData.description || '';
            document.getElementById('form_document_type').value = docData.document_type || '';
            document.getElementById('form_priority').value = docData.priority || 'medium';
            fileGroup.style.display = 'none';
            fileInput.removeAttribute('required');
        } else {
            // Upload mode
            title.innerText = 'Upload Document';
            btnText.innerText = 'Upload';
            document.getElementById('form_document_id').value = '';
            this.modal.querySelector('form').reset();
            fileGroup.style.display = 'block';
            fileInput.setAttribute('required', 'true');
            fileUploadText.innerHTML = '📁 Click to upload file<br><small style="color:#666;">PDF, DOC, DOCX, JPG, PNG (Max 10MB)</small>';
            fileUploadArea.style.borderColor = '#ccc';
            fileUploadArea.style.background = '#f9f9f9';
        }
        
        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.modal.style.display = 'none';
        document.body.style.overflow = '';
        const msg = this.modal.querySelector('#uploadMessage');
        if (msg) msg.innerHTML = '';
    }
}

// Initialize
function initModals() {
    window.routeModal = new DocumentModal();
    window.documentFormModal = new DocumentFormModal();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModals);
} else {
    initModals();
}

// Global Helpers
window.openUploadModal = () => {
    if (window.documentFormModal) window.documentFormModal.open(null);
};

window.openRouteModal = (id, users) => {
    if (window.routeModal) window.routeModal.open(id, users);
};

window.openDocumentFormModal = (id) => {
    if (!window.documentFormModal) return;
    if (id && window.api) {
        // View/edit document via same /data/documents handler
        api.get(`/data/documents?id=${id}`)
            .then(r => window.documentFormModal.open(r.document))
            .catch(err => alert('Failed to load document: ' + err.message));
    } else {
        window.documentFormModal.open(null);
    }
};
        const startIdx = (this.currentPage - 1) * this.rowsPerPage;
        const endIdx = startIdx + this.rowsPerPage;
        const rowsToShow = this.filteredData.slice(startIdx, endIdx);   