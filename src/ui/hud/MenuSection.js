// src/ui/hud/MenuSection.js
import {MenuItem} from './MenuItem.js';

export class MenuSection {
    constructor(menu, sectionId, title, isPinnable = true) {
        this.menu = menu;
        this.hudManager = menu.hudManager;
        this.id = sectionId;
        this.title = title;
        this.isPinnable = isPinnable;

        this.container = document.createElement('div');
        this.container.className = 'menu-section';

        this.header = document.createElement('div');
        this.header.className = 'menu-section-header';

        this.titleElement = document.createElement('span');
        this.titleElement.className = 'menu-section-title';
        this.titleElement.textContent = title;
        this.header.appendChild(this.titleElement);

        if (this.isPinnable) {
            this.pinButton = document.createElement('button');
            this.pinButton.className = 'menu-section-pin-button';
            this.pinButton.innerHTML = '📌';
            this.pinButton.title = 'Pin this section';
            this.header.appendChild(this.pinButton);
            this._bindPinEvents();
        }

        this.container.appendChild(this.header);

        this.content = document.createElement('div');
        this.content.className = 'menu-section-content';
        this.container.appendChild(this.content);

        this.items = [];
    }

    _bindPinEvents() {
        this.pinButton.addEventListener('click', event => {
            event.stopPropagation();
            this.hudManager.pinSection(this);
            this.menu.close();
        });
    }

    addMenuItem(itemId, label, callback, options = {}) {
        const menuItem = new MenuItem(this, itemId, label, callback, options);
        this.items.push(menuItem);
        this.content.appendChild(menuItem.container);
        return menuItem;
    }

    addElement(element) {
        this.content.appendChild(element);
        this.items.push(element);
    }

    addSeparator() {
        const separator = document.createElement('hr');
        separator.className = 'menu-separator';
        this.content.appendChild(separator);
    }

    getItem(itemId) {
        return this.items.find(item => item.id === itemId);
    }

    update() {
        this.items.forEach(item => {
            if (item.update) item.update();
        });
    }

    dispose() {
        this.items.forEach(item => {
            if (item.dispose) item.dispose();
        });
        this.items = [];
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }

    getContentForPinning() {
        return this.content.cloneNode(true);
    }
}
