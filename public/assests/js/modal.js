// Modal functionality
class DocumentModal {
    constructor() {
        this.modal = null;
        this.init();
    }
    
    init() {
        // Create modal structure
        this.createModal();
        this.attachEventListeners();
    }
    
    createModal() {
        const modalHTML = `
            <div id="routeModal" class="modal">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Route Document</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <form id="routeForm" method="POST">
                                <input type="hidden" name="document_id" id="modal_document_id">
                                
                                <div class="form-group">
                                    <label class="form-label">Route To:</label>
                                    <select name="to_user_id" class="form-control" required>
                                        <option value="">Select User</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Action:</label>
                                    <select name="action_taken" class="form-control" required>
                                        <option value="forwarded">Forward</option>
                                        <option value="returned">Return</option>
                                        <option value="completed">Mark as Completed</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Remarks:</label>
                                    <textarea name="remarks" class="form-control" rows="3" required></textarea>
                                </div>
                                
                                <div class="modal-footer">
                                    <button type="submit" class="btn btn--primary">Route Document</button>
                                    <button type="button" class="btn btn--secondary modal-cancel">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('routeModal');
    }
    
    attachEventListeners() {
        // Close button
        const closeBtn = this.modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => this.close());
        
        // Cancel button
        const cancelBtn = this.modal.querySelector('.modal-cancel');
        cancelBtn.addEventListener('click', () => this.close());
        
        // Form submission
        const form = this.modal.querySelector('#routeForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (typeof ROUTE_ACTION_URL !== 'undefined') {
                form.action = ROUTE_ACTION_URL;
                form.submit();
            } else {
                alert('Error: Route action URL not defined');
            }
        });
        
        // Click outside modal
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
        
        // ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'block') {
                this.close();
            }
        });
    }
    
    open(documentId, users) {
        document.getElementById('modal_document_id').value = documentId;
        
        // Populate users dropdown
        const select = this.modal.querySelector('select[name="to_user_id"]');
        select.innerHTML = '<option value="">Select User</option>';
        
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.user_id;
            const dept = user.department || 'N/A';
            option.textContent = `${user.full_name} (${dept})`;
            select.appendChild(option);
        });
        
        this.modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
    
    close() {
        this.modal.style.display = 'none';
        document.body.style.overflow = '';
        this.modal.querySelector('form').reset();
    }
}

// Document Add/Edit Modal
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
        const modalHTML = `
            <div id="documentFormModal" class="modal">
                <div class="modal-dialog" style="max-width: 700px;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 id="documentFormTitle">Add Document</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <form id="documentForm" method="POST" enctype="multipart/form-data">
                                <input type="hidden" name="document_id" id="form_document_id">
                                
                                <div class="form-group">
                                    <label class="form-label">Document Title *</label>
                                    <input type="text" name="title" id="form_title" class="form-control" required>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Document Type *</label>
                                    <select name="document_type" id="form_document_type" class="form-control" required>
                                        <option value="">Select Type</option>
                                        <option value="incoming">Incoming</option>
                                        <option value="outgoing">Outgoing</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Priority *</label>
                                    <select name="priority" id="form_priority" class="form-control" required>
                                        <option value="low">Low</option>
                                        <option value="medium" selected>Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Description</label>
                                    <textarea name="description" id="form_description" class="form-control" rows="4"></textarea>
                                </div>
                                
                                <div class="form-group" id="fileUploadGroup">
                                    <label class="form-label">Upload File * (Max 10MB)</label>
                                    <input type="file" name="document_file" id="form_document_file" class="form-control">
                                    <small>Allowed: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, ZIP</small>
                                </div>
                                
                                <div class="modal-footer">
                                    <button type="submit" class="btn btn--primary" id="formSubmitBtn">Add Document</button>
                                    <button type="button" class="btn btn--secondary modal-cancel">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('documentFormModal');
    }
    
    attachEventListeners() {
        const closeBtn = this.modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => this.close());
        
        const cancelBtn = this.modal.querySelector('.modal-cancel');
        cancelBtn.addEventListener('click', () => this.close());
        
        const form = this.modal.querySelector('#documentForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const documentId = document.getElementById('form_document_id').value;
            
            if (documentId) {
                // Edit mode
                if (typeof EDIT_DOCUMENT_ACTION_URL !== 'undefined') {
                    form.action = EDIT_DOCUMENT_ACTION_URL;
                    // Remove file input for edit (file upload not required for edit)
                    const fileInput = document.getElementById('form_document_file');
                    if (fileInput) {
                        fileInput.removeAttribute('required');
                    }
                    form.submit();
                }
            } else {
                // Add mode
                if (typeof UPLOAD_ACTION_URL !== 'undefined') {
                    form.action = UPLOAD_ACTION_URL;
                    form.submit();
                } else {
                    alert('Error: Upload action URL not defined');
                }
            }
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'block') {
                this.close();
            }
        });
    }
    
    open(docData = null) {
        const form = this.modal.querySelector('#documentForm');
        const titleEl = document.getElementById('documentFormTitle');
        const submitBtn = document.getElementById('formSubmitBtn');
        const fileGroup = document.getElementById('fileUploadGroup');
        
        if (docData) {
            // Edit mode
            titleEl.textContent = 'Edit Document';
            submitBtn.textContent = 'Update Document';
            document.getElementById('form_document_id').value = docData.document_id;
            document.getElementById('form_title').value = docData.title || '';
            document.getElementById('form_document_type').value = docData.document_type || '';
            document.getElementById('form_priority').value = docData.priority || 'medium';
            document.getElementById('form_description').value = docData.description || '';
            fileGroup.style.display = 'none';
        } else {
            // Add mode
            titleEl.textContent = 'Add Document';
            submitBtn.textContent = 'Add Document';
            document.getElementById('form_document_id').value = '';
            form.reset();
            fileGroup.style.display = 'block';
            document.getElementById('form_document_file').setAttribute('required', 'required');
        }
        
        this.modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
    
    close() {
        this.modal.style.display = 'none';
        document.body.style.overflow = '';
        this.modal.querySelector('form').reset();
    }
}

// Initialize modals
let routeModal;
let documentFormModal;

document.addEventListener('DOMContentLoaded', () => {
    routeModal = new DocumentModal();
    documentFormModal = new DocumentFormModal();
});

// Function to open route modal
function openRouteModal(documentId, users) {
    routeModal.open(documentId, users);
}

// Function to open document form modal
function openDocumentFormModal(documentId = null) {
    if (documentId && typeof DOCUMENTS_DATA !== 'undefined') {
        // Find document in the data array
        const doc = DOCUMENTS_DATA.find(d => d.document_id == documentId);
        if (doc) {
            documentFormModal.open(doc);
        } else {
            alert('Document not found');
        }
    } else {
        // Add new document
        documentFormModal.open(null);
    }
}
