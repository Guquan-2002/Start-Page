/**
 * 本地消息规范化工具
 *
 * 职责：
 * - 定义统一的本地消息格式（支持文本+图片多模态）
 * - 规范化混合内容（text/image parts）为一致的数据结构
 * - 提供消息部分（part）的验证和转换
 * - 支持多种图片来源类型（data_url、base64、url 等）
 *
 * 本地消息格式：
 * {
 *   role: 'user' | 'assistant',
 *   parts: [
 *     { type: 'text', text: '...' },
 *     { type: 'image', image: { sourceType: '...', value: '...', mimeType: '...', detail: '...' } }
 *   ]
 * }
 *
 * 依赖：无
 * 被依赖：message-model, context-window, provider adapters
 */

import { asTrimmedString } from '../../shared/string-utils.js';

// 有效的消息部分类型
const LOCAL_PART_TYPES = new Set(['text', 'image']);

// 支持的图片来源类型
const IMAGE_SOURCE_TYPES = new Set(['url', 'data_url', 'base64', 'file_uri', 'file_id']);

// 图片细节级别（用于控制图片处理质量）
const IMAGE_DETAIL_LEVELS = new Set(['low', 'high', 'auto']);

/**
 * 规范化图片细节级别
 * @param {*} value - 原始细节级别值
 * @returns {string} 规范化后的细节级别（'low'/'high'/'auto'），无效时返回空字符串
 */
function normalizeImageDetail(value) {
    const normalized = asTrimmedString(value).toLowerCase();
    return IMAGE_DETAIL_LEVELS.has(normalized) ? normalized : '';
}

/**
 * 解析 Data URL 格式的图片数据
 * @param {*} value - Data URL 字符串（格式：data:image/png;base64,xxx）
 * @returns {Object|null} 解析结果 { mimeType, data } 或 null（解析失败）
 */
function parseDataUrl(value) {
    const raw = asTrimmedString(value);
    const match = /^data:([^;,]+);base64,(.+)$/i.exec(raw);
    if (!match) {
        return null;
    }

    return {
        mimeType: match[1].trim().toLowerCase(),
        data: match[2].trim()
    };
}

/**
 * 规范化文本部分
 * @param {Object} part - 原始文本部分对象
 * @returns {Object|null} 规范化后的文本部分 { type: 'text', text } 或 null（无效时）
 */
function normalizeTextPart(part) {
    const text = typeof part?.text === 'string' ? part.text : '';
    if (!text.trim()) {
        return null;
    }

    return {
        type: 'text',
        text
    };
}

/**
 * 规范化图片部分
 * @param {Object} part - 原始图片部分对象
 * @returns {Object|null} 规范化后的图片部分 { type: 'image', image: {...} } 或 null（无效时）
 *
 * 支持的图片来源类型：
 * - data_url: 完整的 data URL（自动解析 mimeType）
 * - base64: 纯 base64 数据（需要提供 mimeType）
 * - url: 图片 URL
 * - file_uri: 文件 URI
 * - file_id: 文件 ID
 */
function normalizeImagePart(part) {
    if (!part?.image || typeof part.image !== 'object') {
        return null;
    }

    const rawImage = part.image;
    const sourceType = asTrimmedString(rawImage?.sourceType).toLowerCase();
    if (!IMAGE_SOURCE_TYPES.has(sourceType)) {
        return null;
    }

    const value = asTrimmedString(rawImage?.value);
    if (!value) {
        return null;
    }

    const detail = normalizeImageDetail(rawImage?.detail);
    const normalized = {
        type: 'image',
        image: {
            sourceType,
            value
        }
    };

    if (sourceType === 'data_url') {
        const parsedDataUrl = parseDataUrl(value);
        if (!parsedDataUrl) {
            return null;
        }

        normalized.image.mimeType = parsedDataUrl.mimeType;
    } else if (sourceType === 'base64') {
        const mimeType = asTrimmedString(rawImage?.mimeType).toLowerCase();
        if (!mimeType) {
            return null;
        }

        normalized.image.mimeType = mimeType;
    } else {
        const mimeType = asTrimmedString(rawImage?.mimeType).toLowerCase();
        if (mimeType) {
            normalized.image.mimeType = mimeType;
        }
    }

    if (detail) {
        normalized.image.detail = detail;
    }

    return normalized;
}

/**
 * 规范化单个消息部分（part）
 * @param {Object} part - 原始消息部分对象
 * @returns {Object|null} 规范化后的部分对象或 null（无效时）
 */
export function normalizeLocalPart(part) {
    if (!part || typeof part !== 'object') {
        return null;
    }

    const partType = asTrimmedString(part.type).toLowerCase();
    if (!LOCAL_PART_TYPES.has(partType)) {
        return null;
    }

    if (partType === 'text') {
        return normalizeTextPart(part);
    }

    return normalizeImagePart(part);
}

/**
 * 规范化消息部分数组
 * @param {Array} parts - 原始消息部分数组
 * @returns {Array} 规范化后的部分数组（过滤掉无效部分）
 */
export function normalizeLocalParts(parts) {
    if (!Array.isArray(parts)) {
        return [];
    }

    return parts
        .map((part) => normalizeLocalPart(part))
        .filter(Boolean);
}

/**
 * 获取本地消息的纯文本内容
 * @param {Object} message - 本地消息对象
 * @param {Object} options - 选项
 * @param {string} options.imagePlaceholder - 图片占位符文本
 * @returns {string} 消息的纯文本内容
 */
export function getLocalMessageText(message, {
    imagePlaceholder = ''
} = {}) {
    const text = message.parts
        .map((part) => (part.type === 'text' ? part.text : ''))
        .filter((partText) => partText.trim())
        .join('\n\n');

    if (text) {
        return text;
    }

    if (!imagePlaceholder) {
        return '';
    }

    const hasImage = message.parts.some((part) => part.type === 'image');
    return hasImage ? imagePlaceholder : '';
}

/**
 * 检查消息是否包含图片部分
 * @param {Object} message - 本地消息对象
 * @returns {boolean} 是否包含图片
 */
export function hasImageParts(message) {
    return message.parts.some((part) => part.type === 'image');
}

/**
 * 解析图片 Data URL（导出版本）
 * @param {string} value - Data URL 字符串
 * @returns {Object|null} 解析结果 { mimeType, data } 或 null
 */
export function parseImageDataUrl(value) {
    return parseDataUrl(value);
}
