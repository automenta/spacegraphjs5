// src/ui/hud/MenuItem.js
export class MenuItem {
    constructor(parentMenuOrSection, itemId, label, callback, options = {}) {
        this.parentMenuOrSection = parentMenuOrSection;
        this.hudManager = parentMenuOrSection.hudManager;
        this.id = itemId;
        this.label = label;
        this.callback = callback;
        this.options = options;

        this.container = document.createElement('div');
        this.container.className = 'menu-item';
        if (options.disabled) {
            this.container.classList.add('disabled');
        }

        this.labelElement = document.createElement('span');
        this.labelElement.className = 'menu-item-label';
        this.labelElement.textContent = label;
        this.container.appendChild(this.labelElement);

        if (options.hotkey) {
            this.hotkeyElement = document.createElement('span');
            this.hotkeyElement.className = 'menu-item-hotkey';
            this.hotkeyElement.textContent = options.hotkey;
            this.container.appendChild(this.hotkeyElement);
        }

        if (options.type === 'checkbox') {
            this.checkboxElement = document.createElement('input');
            this.checkboxElement.type = 'checkbox';
            this.checkboxElement.checked = !!options.checked;
            this.checkboxElement.className = 'menu-item-checkbox';
            this.container.insertBefore(this.checkboxElement, this.labelElement);
        }

        if (options.submenu) {
            this.container.classList.add('has-submenu');
        }

        this._bindEvents();
    }

    _bindEvents() {
        this.container.addEventListener('click', event => {
            event.stopPropagation();
            if (this.options.disabled) return;

            if (this.options.type === 'checkbox') {
                this.checkboxElement.checked = !this.checkboxElement.checked;
                this.callback?.(this.checkboxElement.checked, this);
            } else {
                this.callback?.(this);
            }

            if (
                this.parentMenuOrSection.close &&
                !this.options.submenu &&
                this.options.type !== 'checkbox'
            ) {
                let parent = this.parentMenuOrSection;
                while (parent && parent.close) {
                    parent.close();
                    parent = parent.parentMenuOrSection || parent.menu;
                }
            }
        });

        this.container.addEventListener('mouseenter', () => {
            if (this.options.disabled) return;
            this.container.classList.add('hover');
        });

        this.container.addEventListener('mouseleave', () => {
            this.container.classList.remove('hover');
        });
    }

    setLabel(newLabel) {
        this.label = newLabel;
        this.labelElement.textContent = newLabel;
    }

    setChecked(checked) {
        if (this.options.type === 'checkbox' && this.checkboxElement) {
            this.checkboxElement.checked = !!checked;
        }
    }

    isChecked() {
        if (this.options.type === 'checkbox' && this.checkboxElement) {
            return this.checkboxElement.checked;
        }
        return false;
    }

    setDisabled(disabled) {
        this.options.disabled = !!disabled;
        if (this.options.disabled) {
            this.container.classList.add('disabled');
        } else {
            this.container.classList.remove('disabled');
        }
        if (this.checkboxElement) {
            this.checkboxElement.disabled = !!disabled;
        }
    }

    update() {
        this.options.updateHandler?.(this);
    }

    dispose() {
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
