import test from 'node:test';
import assert from 'node:assert/strict';

import { createAttachmentManager, formatAttachmentNotice } from '../../js/chat/app/attachment-manager.js';

function createEventTarget() {
    const listeners = new Map();
    const bindCount = new Map();

    return {
        listeners,
        bindCount,
        addEventListener(type, handler) {
            listeners.set(type, handler);
            bindCount.set(type, (bindCount.get(type) || 0) + 1);
        },
        async dispatch(type, event) {
            const handler = listeners.get(type);
            if (!handler) {
                return;
            }
            return handler(event);
        }
    };
}

function createAttachButton() {
    return {
        title: '',
        classList: {
            toggles: [],
            toggle(name, value) {
                this.toggles.push({ name, value });
            }
        },
        ...createEventTarget()
    };
}

function createImageInput() {
    return {
        value: '',
        files: [],
        clickCalled: 0,
        click() {
            this.clickCalled += 1;
        },
        ...createEventTarget()
    };
}

function createChatInput() {
    return {
        ...createEventTarget()
    };
}

function createDomElement(tagName) {
    return {
        tagName,
        children: [],
        appendChild(child) {
            this.children.push(child);
            return child;
        },
        ...createEventTarget()
    };
}

function createAttachmentsElement() {
    const element = createDomElement('div');
    Object.defineProperty(element, 'innerHTML', {
        set() {
            element.children = [];
        }
    });
    return element;
}

globalThis.document = {
    createElement: createDomElement
};

function createFileReaderMock() {
    return class MockFileReader {
        constructor() {
            this.result = '';
            this.onload = null;
            this.onerror = null;
        }

        readAsDataURL(file) {
            this.result = `data:${file.type};base64,AAAA`;
            if (typeof this.onload === 'function') {
                this.onload();
            }
        }
    };
}

test('formatAttachmentNotice keeps singular/plural text', () => {
    assert.equal(formatAttachmentNotice(1), '已上传 1 张图片');
    assert.equal(formatAttachmentNotice(3), '已上传 3 张图片');
});

test('image selection and clearPendingImages keep attachment state in sync', async () => {
    const originalFileReader = globalThis.FileReader;
    globalThis.FileReader = createFileReaderMock();

    try {
        const attachBtn = createAttachButton();
        const imageInput = createImageInput();
        const attachmentsEl = createAttachmentsElement();
        const manager = createAttachmentManager({
            elements: {
                attachBtn,
                imageInput,
                chatInput: createChatInput(),
                attachmentsEl
            },
            ui: {
                addSystemNotice() {}
            }
        });

        assert.equal(attachBtn.title, 'Attach images');

        imageInput.files = [{ type: 'image/png' }, { type: 'text/plain' }];
        await imageInput.dispatch('change');
        assert.equal(manager.getPendingImageParts().length, 1);
        assert.equal(attachBtn.title, '已上传 1 张图片');
        assert.equal(attachmentsEl.children[0].children[1].textContent, '×');

        manager.clearPendingImages();
        assert.equal(manager.getPendingImageParts().length, 0);
        assert.equal(attachBtn.title, 'Attach images');
    } finally {
        globalThis.FileReader = originalFileReader;
    }
});

test('attachment manager binds once during initialization and supports change/paste inputs', async () => {
    const originalFileReader = globalThis.FileReader;
    globalThis.FileReader = createFileReaderMock();

    try {
        const attachBtn = createAttachButton();
        const imageInput = createImageInput();
        const chatInput = createChatInput();
        const notices = [];

        const manager = createAttachmentManager({
            elements: {
                attachBtn,
                imageInput,
                chatInput,
                attachmentsEl: createAttachmentsElement()
            },
            ui: {
                addSystemNotice(message) {
                    notices.push(message);
                }
            }
        });

        assert.equal(attachBtn.bindCount.get('click'), 1);
        assert.equal(imageInput.bindCount.get('change'), 1);
        assert.equal(chatInput.bindCount.get('paste'), 1);

        await attachBtn.dispatch('click');
        assert.equal(imageInput.clickCalled, 1);

        imageInput.files = [{ type: 'image/png' }];
        await imageInput.dispatch('change');
        assert.equal(manager.getPendingImageParts().length, 1);

        await chatInput.dispatch('paste', {
            clipboardData: {
                items: [{
                    type: 'image/png',
                    getAsFile() {
                        return { type: 'image/png' };
                    }
                }]
            },
            preventDefault() {}
        });
        assert.equal(manager.getPendingImageParts().length, 2);
        assert.deepEqual(notices, []);
        assert.deepEqual(Object.keys(manager).sort(), ['clearPendingImages', 'getPendingImageParts']);
    } finally {
        globalThis.FileReader = originalFileReader;
    }
});
