// modal.js - COMPLETE VERSION (File Upload Optional + Button Reset + History Modal)

window.routeModal = null;
window.documentFormModal = null;
window.documentHistoryModal = null; // NEW

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
                    <label style="display:block; margin-bottom:5px; font-weight:500;">Document File <small style="color:#666;">(Optional)</small></label>
                    <input type="file" id="fileInput" name="file" style="display:block; width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; font-size:0.875rem;" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.csv,.zip,.rar">
                    <div id="fileInfo" style="margin-top:8px; font-size:0.875rem; color:#666;"></div>
                    <small style="display:block; margin-top:4px; color:#888; font-size:0.75rem;">Max 10MB. Supported: PDF, Word, Excel, PowerPoint, Images, Text, Archives</small>
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
                            <option value="outgoing">Outgoing</option>
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
                        <span id="uploadBtnText">Create</span>
                        <span id="uploadBtnSpinner" style="display:none;">⏳ Processing...</span>
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

        // File input change handler - show file info
        const fileInput = this.modal.querySelector('#fileInput');
        const fileInfo = this.modal.querySelector('#fileInfo');
        
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const sizeInMB = (file.size / 1024 / 1024).toFixed(2);
                
                if (file.size > 10 * 1024 * 1024) {
                    alert('File size must be less than 10MB');
                    fileInput.value = '';
                    fileInfo.innerHTML = '';
                    return;
                }
                
                fileInfo.innerHTML = `<span style="color:#10b981;">✓ Selected: <strong>${file.name}</strong> (${sizeInMB} MB)</span>`;
            } else {
                fileInfo.innerHTML = '';
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
                    // EDIT existing document (metadata only)
                    res = await api.put('/data/documents', {
                        document_id: id,
                        title: formData.get('title'),
                        description: formData.get('description'),
                        document_type: formData.get('document_type'),
                        priority: formData.get('priority')
                    });
                } else {
                    // CREATE new document (with optional file)
                    // Remove file from FormData if not selected
                    if (!fileInput.files || fileInput.files.length === 0) {
                        formData.delete('file');
                    }
                    res = await api.uploadFile('/data/documents', formData);
                }
                
                alert(res.message || 'Success!');
                this.close();
                
                if (window.router) window.router.showDashboard();
                else location.reload();
                
            } catch (err) {
                alert(err.message || 'Operation failed');
                // CRITICAL FIX: Reset button state on error
                btn.disabled = false;
                btnText.style.display = 'inline';
                btnSpinner.style.display = 'none';
            }
        };
    }

    open(docData = null) {
        // CRITICAL FIX: Reset button state when opening modal
        this.resetButtonState();
        
        const title = this.modal.querySelector('#documentFormTitle');
        const btnText = this.modal.querySelector('#uploadBtnText');
        const fileGroup = this.modal.querySelector('#fileUploadGroup');
        const fileInput = this.modal.querySelector('#fileInput');
        const fileInfo = this.modal.querySelector('#fileInfo');

        if (docData) {
            // Edit mode - hide file upload, no file required
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
            // Create mode - show file upload, but NOT required
            title.innerText = 'Create Document';
            btnText.innerText = 'Create';
            document.getElementById('form_document_id').value = '';
            this.modal.querySelector('form').reset();
            fileGroup.style.display = 'block';
            fileInput.removeAttribute('required'); // CRITICAL FIX: File is optional
            fileInfo.innerHTML = '';
        }
        
        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    // CRITICAL FIX: New method to reset button state
    resetButtonState() {
        const btn = document.getElementById('formSubmitBtn');
        const btnText = document.getElementById('uploadBtnText');
        const btnSpinner = document.getElementById('uploadBtnSpinner');
        
        if (btn) btn.disabled = false;
        if (btnText) btnText.style.display = 'inline';
        if (btnSpinner) btnSpinner.style.display = 'none';
    }

    close() {
        this.modal.style.display = 'none';
        document.body.style.overflow = '';
        
        // Reset upload message
        const msg = this.modal.querySelector('#uploadMessage');
        if (msg) msg.innerHTML = '';
        
        // Reset form
        const form = this.modal.querySelector('form');
        if (form) form.reset();
        
        // Reset file info display
        const fileInfo = this.modal.querySelector('#fileInfo');
        if (fileInfo) fileInfo.innerHTML = '';
        
        // CRITICAL FIX: Reset button state when closing
        this.resetButtonState();
    }
}

// ========== NEW: Document History Modal ==========
class DocumentHistoryModal {
    constructor() {
        this.modal = null;
        this.init();
    }

    init() {
        this.createModal();
        this.attachEventListeners();
    }

    createModal() {
        if (document.getElementById('historyModal')) {
            this.modal = document.getElementById('historyModal');
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'historyModal';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.6); z-index: 2147483647;
            display: none; align-items: center; justify-content: center;
            backdrop-filter: blur(4px);
        `;

        const box = document.createElement('div');
        box.style.cssText = `
            background: white; width: 90%; max-width: 900px;
            border-radius: 12px; padding: 24px; position: relative;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
            max-height: 85vh; overflow-y: auto;
        `;

        box.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:20px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <h3 style="margin:0; font-size:1.25rem;">📜 Document History</h3>
                <button class="modal__close" style="background:none; border:none; font-size:24px; cursor:pointer;">&times;</button>
            </div>
            
            <div id="historyContent" style="min-height:200px;">
                <div style="text-align:center; padding:40px; color:#666;">
                    <div style="font-size:48px; margin-bottom:10px;">⏳</div>
                    Loading history...
                </div>
            </div>
            
            <div style="margin-top:20px; text-align:right;">
                <button class="modal-close-btn" style="padding:10px 24px; background:#6b7280; color:white; border:none; border-radius:6px; cursor:pointer; font-size:0.9rem;">Close</button>
            </div>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);
        this.modal = overlay;
    }

    attachEventListeners() {
        const closeBtn = this.modal.querySelector('.modal__close');
        const closeBottomBtn = this.modal.querySelector('.modal-close-btn');
        
        closeBtn.onclick = () => this.close();
        closeBottomBtn.onclick = () => this.close();
        
        this.modal.onclick = (e) => { 
            if (e.target === this.modal) this.close(); 
        };
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    async open(documentId, documentTitle = 'Document') {
        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        const content = this.modal.querySelector('#historyContent');
        content.innerHTML = `
            <div style="text-align:center; padding:40px; color:#666;">
                <div style="font-size:48px; margin-bottom:10px;">⏳</div>
                <p style="margin:0;">Loading history for <strong>"${documentTitle}"</strong>...</p>
            </div>
        `;

        try {
            
            const response = await api.get(`/data/documents?id=${documentId}&history=true`);
            
            
            if (!response.success) {
                throw new Error(response.error || 'Failed to load history');
            }

            const { history, routing } = response;

            if ((!history || history.length === 0) && (!routing || routing.length === 0)) {
                content.innerHTML = `
                    <div style="text-align:center; padding:40px; color:#666;">
                        <div style="font-size:48px; margin-bottom:10px;">📭</div>
                        <p>No history available for this document</p>
                    </div>
                `;
                return;
            }

            // Render history timeline
            let html = '';

            // Change History Section
            if (history && history.length > 0) {
                html += `
                    <div style="margin-bottom:30px;">
                        <h4 style="margin:0 0 15px 0; color:#374151; font-size:1rem; display:flex; align-items:center; gap:8px;">
                            <span>📝</span> Change History
                        </h4>
                        <div style="border-left:3px solid #e5e7eb; padding-left:20px;">
                `;

                history.forEach((item, index) => {
                    const isFirst = index === 0;
                    html += `
                        <div style="position:relative; margin-bottom:20px; ${isFirst ? 'opacity:1;' : 'opacity:0.85;'}">
                            <div style="position:absolute; left:-29px; width:14px; height:14px; background:${isFirst ? '#10b981' : '#9ca3af'}; border-radius:50%; top:5px; border:3px solid white; box-shadow:0 0 0 1px #e5e7eb;"></div>
                            <div style="background:${isFirst ? '#ecfdf5' : '#f9fafb'}; padding:14px 16px; border-radius:8px; border-left:3px solid ${isFirst ? '#10b981' : '#d1d5db'};">
                                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:6px;">
                                    <div>
                                        <strong style="color:#111827; font-size:0.95rem;">${item.action}</strong>
                                        <div style="font-size:0.85rem; color:#6b7280; margin-top:4px;">
                                            by <strong>${item.user_name || 'System'}</strong>${item.user_department ? ` • ${item.user_department}` : ''}
                                        </div>
                                    </div>
                                    <span style="font-size:0.75rem; color:#9ca3af; white-space:nowrap; margin-left:10px;">
                                        ${this.formatDate(item.created_at)}
                                    </span>
                                </div>
                                ${item.details ? `<div style="font-size:0.875rem; color:#4b5563; margin-top:8px; padding-top:8px; border-top:1px solid #e5e7eb;">${item.details}</div>` : ''}
                            </div>
                        </div>
                    `;
                });

                html += `</div></div>`;
            }

            // Routing History Section
            if (routing && routing.length > 0) {
                html += `
                    <div style="margin-top:30px;">
                        <h4 style="margin:0 0 15px 0; color:#374151; font-size:1rem; display:flex; align-items:center; gap:8px;">
                            <span>🔄</span> Routing History
                        </h4>
                        <div style="border-left:3px solid #dbeafe; padding-left:20px;">
                `;

                routing.forEach((route, index) => {
                    const isFirst = index === 0;
                    html += `
                        <div style="position:relative; margin-bottom:20px; ${isFirst ? 'opacity:1;' : 'opacity:0.85;'}">
                            <div style="position:absolute; left:-29px; width:14px; height:14px; background:${isFirst ? '#3b82f6' : '#9ca3af'}; border-radius:50%; top:5px; border:3px solid white; box-shadow:0 0 0 1px #dbeafe;"></div>
                            <div style="background:${isFirst ? '#eff6ff' : '#f9fafb'}; padding:14px 16px; border-radius:8px; border-left:3px solid ${isFirst ? '#3b82f6' : '#d1d5db'};">
                                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:6px;">
                                    <div>
                                        <strong style="color:#111827; font-size:0.95rem;">${route.action_taken || 'Routed'}</strong>
                                        <div style="font-size:0.85rem; color:#6b7280; margin-top:4px;">
                                            <span style="color:#ef4444;">From:</span> <strong>${route.from_user_name || 'N/A'}</strong> 
                                            <span style="margin:0 6px; color:#d1d5db;">→</span> 
                                            <span style="color:#10b981;">To:</span> <strong>${route.to_user_name || 'N/A'}</strong>
                                        </div>
                                    </div>
                                    <span style="font-size:0.75rem; color:#9ca3af; white-space:nowrap; margin-left:10px;">
                                        ${this.formatDate(route.routed_at)}
                                    </span>
                                </div>
                                ${route.remarks ? `<div style="font-size:0.875rem; color:#4b5563; margin-top:8px; padding-top:8px; border-top:1px solid #e5e7eb; font-style:italic;">"${route.remarks}"</div>` : ''}
                            </div>
                        </div>
                    `;
                });

                html += `</div></div>`;
            }

            content.innerHTML = html;

        } catch (error) {
            console.error('Failed to load history:', error);
            content.innerHTML = `
                <div style="text-align:center; padding:40px; color:#ef4444;">
                    <div style="font-size:48px; margin-bottom:10px;">⚠️</div>
                    <p><strong>Failed to load history</strong></p>
                    <p style="color:#6b7280; font-size:0.9rem; margin-top:8px;">${error.message}</p>
                </div>
            `;
        }
    }

    close() {
        this.modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Initialize All Modals
function initModals() {
    window.routeModal = new DocumentModal();
    window.documentFormModal = new DocumentFormModal();
    window.documentHistoryModal = new DocumentHistoryModal(); // NEW
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

// NEW: Global Helper for History Modal
window.openHistoryModal = (documentId, documentTitle) => {
    if (window.documentHistoryModal) {
        window.documentHistoryModal.open(documentId, documentTitle);
    } else {
        console.error('History modal not initialized');
        alert('History feature not available. Please refresh the page.');
    }
};
