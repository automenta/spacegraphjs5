import {CSS3DObject} from 'three/addons/renderers/CSS3DRenderer.js';
import {$, Utils} from '../../utils.js';
import {Node} from './Node.js';
import {applyLabelLOD} from '../../utils/labelUtils.js';
import {GRAPH_CONSTANTS} from '../constants.js';

/**
 * HTML Node class for graph nodes with HTML content
 */
export class HtmlNode extends Node {
    /** @type {string} Node type name */
    static typeName = 'html';
    
    /** @type {Object} Minimum size constraints */
    static MIN_SIZE = {width: 80, height: 40};
    
    /** @type {Object} Content scale range */
    static CONTENT_SCALE_RANGE = {min: 0.3, max: 3.0};
    
    /** @type {HTMLElement|null} HTML element */
    htmlElement = null;
    
    /** @type {Object} Node size */
    size = {width: GRAPH_CONSTANTS.DEFAULT_NODE_SIZE * 3.2, height: GRAPH_CONSTANTS.DEFAULT_NODE_SIZE * 1.4};
    
    /** @type {boolean} Billboard mode */
    billboard = false;

    /**
     * Create a new HtmlNode
     * @param {string|number} id - Node ID
     * @param {Object} position - Node position
     * @param {Object} data - Node data
     * @param {number} mass - Node mass
     */
    constructor(id, position, data = {}, mass = 1.0) {
        super(id, position, data, mass);
        const initialWidth = this.data.width ?? GRAPH_CONSTANTS.DEFAULT_NODE_SIZE * 3.2;
        const initialHeight = this.data.height ?? GRAPH_CONSTANTS.DEFAULT_NODE_SIZE * 1.4;
        this.size = {width: initialWidth, height: initialHeight};
        this.htmlElement = this._createElement();
        this.cssObject = new CSS3DObject(this.htmlElement);
        this.cssObject.userData = {nodeId: this.id, type: 'html-node'};
        this.update();
        this.setContentScale(this.data.contentScale ?? 1.0);
        this.setBackgroundColor(this.data.backgroundColor ?? '#333344');
    }

    /**
     * Get default node data
     * @returns {Object} Default data
     */
    getDefaultData() {
        return {
            label: '',
            content: '',
            width: GRAPH_CONSTANTS.DEFAULT_NODE_SIZE * 3.2,
            height: GRAPH_CONSTANTS.DEFAULT_NODE_SIZE * 1.4,
            contentScale: 1.0,
            backgroundColor: '#333344',
            type: 'html',
            editable: false,
            labelLod: [],
        };
    }

    /**
     * Create the HTML element
     * @returns {HTMLElement} HTML element
     * @private
     */
    _createElement() {
        const el = document.createElement('div');
        el.className = 'node-html node-common';
        el.id = `node-html-${this.id}`;
        el.dataset.nodeId = this.id;
        el.style.width = `${this.size.width}px`;
        el.style.height = `${this.size.height}px`;
        el.draggable = false;
        el.ondragstart = e => e.preventDefault();

        el.innerHTML = `
            <div class="node-inner-wrapper">
                <div class="node-content" spellcheck="false" style="transform: scale(${this.data.contentScale});">
                    ${this.data.content ?? this.data.label ?? ''}
                </div>
                <div class="node-controls">
                    <button class="node-quick-button node-content-zoom-in" title="Zoom In Content (+)">➕</button>
                    <button class="node-quick-button node-content-zoom-out" title="Zoom Out Content (-)">➖</button>
                    <button class="node-quick-button node-grow" title="Grow Node (Ctrl++)">↗️</button>
                    <button class="node-quick-button node-shrink" title="Shrink Node (Ctrl+-)">↙️</button>
                    <button class="node-quick-button delete-button node-delete" title="Delete Node (Del)">🗑️</button>
                </div>
            </div>
            <div class="resize-handle" title="Resize Node"></div>
        `;
        this._initContentEditable(el);
        return el;
    }

    /**
     * Initialize content editable functionality
     * @param {HTMLElement} element - HTML element
     * @private
     */
    _initContentEditable(element) {
        const contentDiv = $('.node-content', element);
        if (contentDiv && this.data.editable) {
            contentDiv.contentEditable = 'true';
            let debounceTimer;
            contentDiv.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.data.content = contentDiv.innerHTML;
                    this.space?.emit('graph:node:dataChanged', {
                        node: this,
                        property: 'content',
                        value: this.data.content,
                    });
                }, 300);
            });
            contentDiv.addEventListener('pointerdown', e => e.stopPropagation());
            contentDiv.addEventListener('touchstart', e => e.stopPropagation(), {passive: true});
            contentDiv.addEventListener(
                'wheel',
                e => {
                    const isScrollable =
                        contentDiv.scrollHeight > contentDiv.clientHeight ||
                        contentDiv.scrollWidth > contentDiv.clientWidth;
                    const canScrollY =
                        (e.deltaY < 0 && contentDiv.scrollTop > 0) ||
                        (e.deltaY > 0 &&
                            contentDiv.scrollTop < contentDiv.scrollHeight - contentDiv.clientHeight);
                    const canScrollX =
                        (e.deltaX < 0 && contentDiv.scrollLeft > 0) ||
                        (e.deltaX > 0 &&
                            contentDiv.scrollLeft < contentDiv.scrollWidth - contentDiv.clientWidth);
                    if (isScrollable && (canScrollY || canScrollX)) {
                        e.stopPropagation();
                    }
                },
                {passive: false}
            );
        }
    }

    /**
     * Set node size
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {boolean} scaleContent - Scale content
     */
    setSize(width, height, scaleContent = false) {
        const oldSize = {...this.size};
        const oldArea = oldSize.width * oldSize.height;

        this.size.width = Math.max(HtmlNode.MIN_SIZE.width, width);
        this.size.height = Math.max(HtmlNode.MIN_SIZE.height, height);

        this._updateElementSize();

        if (scaleContent && oldArea > 0) {
            const scaleFactor = Math.sqrt((this.size.width * this.size.height) / oldArea);
            this.setContentScale(this.data.contentScale * scaleFactor);
        }
    }

    /**
     * Updates the element size visually.
     * @private
     */
    _updateElementSize() {
        if (this.htmlElement) {
            this.htmlElement.style.width = `${this.size.width}px`;
            this.htmlElement.style.height = `${this.size.height}px`;
        }
    }

    /**
     * Set content scale
     * @param {number} scale - Scale factor
     */
    setContentScale(scale) {
        const clampedScale = Utils.clamp(
            scale,
            HtmlNode.CONTENT_SCALE_RANGE.min,
            HtmlNode.CONTENT_SCALE_RANGE.max
        );

        // Only update if the scale actually changed
        if (this.data.contentScale === clampedScale) return;

        this.data.contentScale = clampedScale;
        this._updateContentScale();
        this._emitContentScaleChange();
    }

    /**
     * Updates the content scale visually.
     * @private
     */
    _updateContentScale() {
        const contentEl = $('.node-content', this.htmlElement);
        if (contentEl) contentEl.style.transform = `scale(${this.data.contentScale})`;
    }

    /**
     * Emits the content scale change event.
     * @private
     */
    _emitContentScaleChange() {
        this.space?.emit('graph:node:dataChanged', {
            node: this,
            property: 'contentScale',
            value: this.data.contentScale,
        });
    }

    /**
     * Set background color
     * @param {string} color - Background color
     */
    setBackgroundColor(color) {
        // Only update if the color actually changed
        if (this.data.backgroundColor === color) return;

        this.data.backgroundColor = color;
        this._updateBackgroundColor();
        this._emitBackgroundColorChange();
    }

    /**
     * Updates the background color visually.
     * @private
     */
    _updateBackgroundColor() {
        this.htmlElement?.style.setProperty('--node-bg', this.data.backgroundColor);
    }

    /**
     * Emits the background color change event.
     * @private
     */
    _emitBackgroundColorChange() {
        this.space?.emit('graph:node:dataChanged', {
            node: this,
            property: 'backgroundColor',
            value: this.data.backgroundColor,
        });
    }

    /** @type {Function} Adjust content scale */
    adjustContentScale = deltaFactor => this.setContentScale(this.data.contentScale * deltaFactor);
    
    /** @type {Function} Adjust node size */
    adjustNodeSize = factor =>
        this.setSize(this.size.width * factor, this.size.height * factor, false);

    /**
     * Update the node
     * @param {SpaceGraph} space - SpaceGraph instance
     */
    update(space) {
        if (this.cssObject) {
            this.cssObject.position.copy(this.position);
            if (this.billboard && space?._cam) {
                this.cssObject.quaternion.copy(space._cam.quaternion);
            }
            applyLabelLOD(this.cssObject, this.data.labelLod, space, this.data.contentScale ?? 1.0);
        }
    }

    /**
     * Get bounding sphere radius
     * @returns {number} Radius
     */
    getBoundingSphereRadius() {
        return Math.sqrt(this.size.width ** 2 + this.size.height ** 2) / 2;
    }

    /**
     * Set selected style
     * @param {boolean} selected - Selected state
     */
    setSelectedStyle(selected) {
        this.htmlElement?.classList.toggle('selected', selected);
    }

    /**
     * Start resizing the node
     */
    startResize() {
        this.htmlElement?.classList.add('resizing');
        this.space?.plugins.getPlugin('LayoutPlugin')?.layoutManager?.getActiveLayout()?.fixNode(this);
        this.space?.emit('graph:node:resizestart', {node: this});
    }

    /**
     * Resize the node
     * @param {number} newWidth - New width
     * @param {number} newHeight - New height
     */
    resize(newWidth, newHeight) {
        this.setSize(newWidth, newHeight);
    }

    /**
     * End resizing the node
     */
    endResize() {
        this.htmlElement?.classList.remove('resizing');
        try {
            this.space?.plugins
                ?.getPlugin('LayoutPlugin')
                ?.layoutManager?.getActiveLayout()
                ?.releaseNode(this);
        } catch (error) {
            console.error(`HtmlNode.endResize: Failed to release node ${this.id} during resize:`, error);
        }
        this.space?.emit('graph:node:resizeend', {node: this, finalSize: {...this.size}});
    }
}
