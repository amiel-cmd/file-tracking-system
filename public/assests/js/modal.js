// modal.js - SELF-CONTAINED VERSION (Styles Built-in)

// Ensure globals exist
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
        if (document.getElementById('routeModal')) document.getElementById('routeModal').remove();

        // 1. Create Overlay with INLINE STYLES
        const overlay = document.createElement('div');
        overlay.id = 'routeModal';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.6); z-index: 2147483647;
            display: none; align-items: center; justify-content: center;
            backdrop-filter: blur(4px);
        `;

        // 2. Create Box with INLINE STYLES
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
        
        const close = () => this.close();
        closeBtn.onclick = close;
        cancelBtn.onclick = close;

        this.modal.onclick = (e) => { if(e.target === this.modal) close(); };

        const form = this.modal.querySelector('#routeForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            try {
                const result = await api.post('/route', Object.fromEntries(formData));
                alert(result.message || 'Success!');
                this.close();
                if(window.router) window.router.showDashboard();
            } catch(err) { alert(err.message); }
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
    }

    close() {
        this.modal.style.display = 'none';
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
        if (document.getElementById('documentFormModal')) document.getElementById('documentFormModal').remove();

        // 1. Create Overlay with INLINE STYLES
        const overlay = document.createElement('div');
        overlay.id = 'documentFormModal';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.6); z-index: 2147483647;
            display: none; align-items: center; justify-content: center;
            backdrop-filter: blur(4px);
        `;

        // 2. Create Box with INLINE STYLES
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
                    <div id="fileUploadArea" onclick="document.getElementById('fileInput').click()" 
                         style="border:2px dashed #ccc; padding:20px; text-align:center; cursor:pointer; border-radius:8px;">
                        <input type="file" id="fileInput" name="file" style="display:none;" accept=".pdf,.doc,.docx,.jpg,.png" required>
                        <div id="fileUploadText">📁 Click to upload file</div>
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
                        <span id="uploadBtnSpinner" style="display:none;">⏳</span>
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
        
        const close = () => this.close();
        closeBtn.onclick = close;
        cancelBtn.onclick = close;
        this.modal.onclick = (e) => { if(e.target === this.modal) close(); };

        const fileInput = document.getElementById('fileInput');
        fileInput.onchange = (e) => {
            if(e.target.files[0]) document.getElementById('fileUploadText').innerHTML = `✅ ${e.target.files[0].name}`;
        };

        const form = this.modal.querySelector('#documentForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('formSubmitBtn');
            btn.disabled = true;
            
            const formData = new FormData(form);
            const id = document.getElementById('form_document_id').value;
            
            try {
                let res;
                if(id) {
                    res = await api.put('/document', {
                        document_id: id,
                        newTitle: formData.get('title'),
                        newDescription: formData.get('description'),
                        newType: formData.get('document_type'),
                        newPriority: formData.get('priority')
                    });
                } else {
                    if(!fileInput.files[0]) throw new Error("File required");
                    res = await api.uploadFile('/document', formData);
                }
                alert(res.message || 'Success!');
                this.close();
                window.location.reload();
            } catch(err) {
                alert(err.message);
                btn.disabled = false;
            }
        };
    }

    open(docData = null) {
        const title = document.getElementById('documentFormTitle');
        const btn = document.getElementById('uploadBtnText');
        const group = document.getElementById('fileUploadGroup');
        const input = document.getElementById('fileInput');

        if(docData) {
            title.innerText = 'Edit Document';
            btn.innerText = 'Update';
            document.getElementById('form_document_id').value = docData.document_id;
            document.getElementById('form_title').value = docData.title || '';
            document.getElementById('form_description').value = docData.description || '';
            document.getElementById('form_document_type').value = docData.document_type || '';
            document.getElementById('form_priority').value = docData.priority || 'medium';
            group.style.display = 'none';
            input.removeAttribute('required');
        } else {
            title.innerText = 'Upload Document';
            btn.innerText = 'Upload';
            document.getElementById('form_document_id').value = '';
            this.modal.querySelector('form').reset();
            group.style.display = 'block';
            input.setAttribute('required', 'true');
            document.getElementById('fileUploadText').innerText = '📁 Click to upload file';
        }
        
        this.modal.style.display = 'flex';
        console.log("Modal Force Opened via Inline Styles");
    }

    close() {
        this.modal.style.display = 'none';
    }
}

// Init
function initModals() {
    window.routeModal = new DocumentModal();
    window.documentFormModal = new DocumentFormModal();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initModals);
else initModals();

// Globals
window.openUploadModal = () => window.documentFormModal && window.documentFormModal.open(null);
window.openRouteModal = (id, users) => window.routeModal && window.routeModal.open(id, users);
window.openDocumentFormModal = (id) => {
    if(id && window.api) api.get(`/document?id=${id}`).then(r => window.documentFormModal.open(r.document));
    else if(window.documentFormModal) window.documentFormModal.open(null);
};
