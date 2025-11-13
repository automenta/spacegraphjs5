// src/ui/hud/PinnedWindow.js
export class PinnedWindow {
    constructor(hudManager, section) {
        this.hudManager = hudManager;
        this.section = section;
        this.id = `pinned-${section.id}`;

        this.container = document.createElement('div');
        this.container.id = this.id;
        this.container.className = 'pinned-window';
        this.container.style.position = 'absolute';
        this.container.style.left = '100px';
        this.container.style.top = '100px';
        this.container.style.width = '300px';
        this.container.style.minHeight = '50px';
        this.container.style.backgroundColor = 'var(--graph-background-color-secondary, #282c34)';
        this.container.style.border = '1px solid var(--graph-accent-color, #61dafb)';
        this.container.style.borderRadius = '5px';
        this.container.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
        this.container.style.zIndex = '1001';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.resize = 'both';
        this.container.style.overflow = 'auto';

        this.header = document.createElement('div');
        this.header.className = 'pinned-window-header';
        this.header.style.padding = '5px 10px';
        this.header.style.backgroundColor = 'var(--graph-accent-color-muted, #4a5260)';
        this.header.style.cursor = 'move';
        this.header.style.display = 'flex';
        this.header.style.justifyContent = 'space-between';
        this.header.style.alignItems = 'center';

        this.titleElement = document.createElement('span');
        this.titleElement.className = 'pinned-window-title';
        this.titleElement.textContent = section.title;
        this.titleElement.style.color = 'var(--graph-text-color-primary, #ffffff)';
        this.header.appendChild(this.titleElement);

        this.closeButton = document.createElement('button');
        this.closeButton.className = 'pinned-window-close-button';
        this.closeButton.innerHTML = '&#x2715;';
        this.closeButton.title = 'Close';
        this.closeButton.style.background = 'none';
        this.closeButton.style.border = 'none';
        this.closeButton.style.color = 'var(--graph-text-color-primary, #ffffff)';
        this.closeButton.style.fontSize = '16px';
        this.closeButton.style.cursor = 'pointer';
        this.header.appendChild(this.closeButton);

        this.container.appendChild(this.header);

        this.contentContainer = document.createElement('div');
        this.contentContainer.className = 'pinned-window-content';
        this.contentContainer.style.padding = '10px';
        this.contentContainer.style.flexGrow = '1';
        this.contentContainer.appendChild(section.getContentForPinning());
        this.container.appendChild(this.contentContainer);

        this.hudManager.hudLayer.appendChild(this.container);

        this._makeDraggable();
        this._bindCloseEvent();
    }

    _bindCloseEvent() {
        this.closeButton.addEventListener('click', () => {
            this.close();
        });
    }

    _makeDraggable() {
        let isDragging = false;
        let offsetX, offsetY;

        this.header.addEventListener('mousedown', e => {
            if (e.target === this.closeButton) return;

            isDragging = true;
            offsetX = e.clientX - this.container.offsetLeft;
            offsetY = e.clientY - this.container.offsetTop;
            this.container.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', e => {
            if (!isDragging) return;
            const parentRect = this.hudManager.hudLayer.getBoundingClientRect();
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;

            newX = Math.max(0, Math.min(newX, parentRect.width - this.container.offsetWidth));
            newY = Math.max(0, Math.min(newY, parentRect.height - this.container.offsetHeight));

            this.container.style.left = `${newX}px`;
            this.container.style.top = `${newY}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.container.style.userSelect = '';
            }
        });
    }

    updateContent() {
        this.contentContainer.innerHTML = '';
        this.contentContainer.appendChild(this.section.getContentForPinning());
    }

    close() {
        this.hudManager.unpinSection(this.section.id);
    }

    dispose() {
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
