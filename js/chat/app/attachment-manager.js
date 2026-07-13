/**
 * Chat attachment manager.
 *
 * Responsibility:
 * - Manage pending image attachments (preview UI, add/remove)
 * - Handle file input, paste events, and DataURL conversion
 * - Expose attachment state to message submitter
 */

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.readAsDataURL(file);
    });
}

export function formatAttachmentNotice(count) {
    return count === 1 ? '已上传 1 张图片' : `已上传 ${count} 张图片`;
}

export function createAttachmentManager({ elements, ui }) {
    const { attachBtn, imageInput, attachmentsEl, chatInput } = elements;

    let pendingImageParts = [];

    function updateAttachmentButtonState() {
        attachBtn.classList.toggle('has-attachments', pendingImageParts.length > 0);
        attachBtn.title = pendingImageParts.length > 0
            ? formatAttachmentNotice(pendingImageParts.length)
            : 'Attach images';
    }

    function renderAttachmentPreview() {
        attachmentsEl.innerHTML = '';
        pendingImageParts.forEach((part, index) => {
            const chip = document.createElement('div');
            chip.className = 'chat-attachment-chip';

            const image = document.createElement('img');
            image.src = part.image.value;
            image.alt = `attachment-${index + 1}`;
            chip.appendChild(image);

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'chat-attachment-remove';
            removeBtn.textContent = '×';
            removeBtn.title = 'Remove image';
            removeBtn.addEventListener('click', () => {
                pendingImageParts = pendingImageParts.filter((_, i) => i !== index);
                renderAttachmentPreview();
            });
            chip.appendChild(removeBtn);

            attachmentsEl.appendChild(chip);
        });

        updateAttachmentButtonState();
    }

    function clearPendingImages() {
        pendingImageParts = [];
        imageInput.value = '';
        renderAttachmentPreview();
    }

    async function appendImageFiles(files) {
        if (files.length === 0) return;

        const nextParts = [];
        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;
            const dataUrl = await fileToDataUrl(file);
            nextParts.push({
                type: 'image',
                image: { sourceType: 'data_url', value: dataUrl, mimeType: file.type }
            });
        }

        if (nextParts.length === 0) return;

        pendingImageParts = [...pendingImageParts, ...nextParts];
        renderAttachmentPreview();
    }

    function getPendingImageParts() {
        return pendingImageParts;
    }

    function bindAttachmentEvents() {
        attachBtn.addEventListener('click', () => imageInput.click());

        imageInput.addEventListener('change', async () => {
            try {
                await appendImageFiles(Array.from(imageInput.files));
            } catch (error) {
                ui.addSystemNotice(error.message, 3000);
            } finally {
                imageInput.value = '';
            }
        });

        chatInput.addEventListener('paste', async (event) => {
            const imageFiles = Array.from(event.clipboardData.items)
                .filter((item) => item.type.startsWith('image/'))
                .map((item) => item.getAsFile())
                .filter(Boolean);

            if (imageFiles.length === 0) return;

            event.preventDefault();
            try {
                await appendImageFiles(imageFiles);
            } catch (error) {
                ui.addSystemNotice(error.message, 3000);
            }
        });
    }

    bindAttachmentEvents();
    renderAttachmentPreview();

    return { clearPendingImages, getPendingImageParts };
}
