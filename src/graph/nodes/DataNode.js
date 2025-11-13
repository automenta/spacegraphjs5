import * as THREE from 'three';
import {Node} from './Node.js';
import {createCSS3DLabelObject} from '../../utils/labelUtils.js';
import {GRAPH_CONSTANTS, LABEL_STYLES, MATERIAL_PROPERTIES} from '../constants.js';

const DEFAULT_NODE_SIZE = GRAPH_CONSTANTS.DEFAULT_NODE_SIZE * 2; // Data nodes are typically larger
const DEFAULT_CHART_BG_COLOR = '#222227';
const DEFAULT_CHART_TEXT_COLOR = '#eeeeee';

export class DataNode extends Node {
    static typeName = 'data';
    canvas = null;
    ctx = null;
    texture = null;

    constructor(id, position, data = {}, mass = 1.2) {
        super(id, position, data, mass);
        this.size = this.data.size || DEFAULT_NODE_SIZE;

        this._setupCanvas();
        this._createChartMesh();

        if (this.data.label) this.labelObject = this._createLabel();
        this.update();
        this.updateBoundingSphere();
    }

    getDefaultData() {
        return {
            label: 'Data Node',
            type: 'data',
            size: DEFAULT_NODE_SIZE,
            chartType: 'bar',
            chartData: [
                {label: 'A', value: 10, color: '#ff6384'},
                {label: 'B', value: 20, color: '#36a2eb'},
                {label: 'C', value: 15, color: '#ffce56'},
            ],
            chartBackgroundColor: DEFAULT_CHART_BG_COLOR,
            chartTextColor: DEFAULT_CHART_TEXT_COLOR,
        };
    }

    _setupCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 256;
        this.canvas.height = 256;
        this.ctx = this.canvas.getContext('2d');
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.colorSpace = THREE.SRGBColorSpace;
    }

    _createChartMesh() {
        const geometry = new THREE.PlaneGeometry(this.size, this.size);
        const material = new THREE.MeshStandardMaterial({
            map: this.texture,
            side: THREE.DoubleSide,
            transparent: true,
            ...MATERIAL_PROPERTIES.CHART,
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.userData = {nodeId: this.id, type: 'data-node-mesh'};
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        this._drawChart();
    }

    _drawChart() {
        if (!this.ctx || !this.canvas) return;

        const {chartType, chartData, chartBackgroundColor, chartTextColor} = this.data;
        const {width, height} = this.canvas;

        this._clearCanvas(chartBackgroundColor);
        this._setupChartContext(chartTextColor);

        if (!chartData?.length) {
            this._drawMessage('No Data', width, height);
            this._updateTexture();
            return;
        }

        switch (chartType) {
            case 'bar':
                this._drawBarChart(chartData, width, height);
                break;
            case 'line':
                this._drawMessage('Line chart NI', width, height);
                break;
            case 'pie':
                this._drawMessage('Pie chart NI', width, height);
                break;
            default:
                this._drawMessage(`Unknown: ${chartType}`, width, height);
        }
        this._updateTexture();
    }

    /**
     * Clears the canvas with the specified background color.
     * @param {string} backgroundColor - The background color.
     */
    _clearCanvas(backgroundColor) {
        const {width, height} = this.canvas;
        this.ctx.fillStyle = backgroundColor || DEFAULT_CHART_BG_COLOR;
        this.ctx.fillRect(0, 0, width, height);
    }

    /**
     * Sets up the chart context with the specified text color.
     * @param {string} textColor - The text color.
     */
    _setupChartContext(textColor) {
        this.ctx.fillStyle = textColor || DEFAULT_CHART_TEXT_COLOR;
        this.ctx.strokeStyle = textColor || DEFAULT_CHART_TEXT_COLOR;
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
    }

    /**
     * Draws a message on the canvas.
     * @param {string} message - The message to display.
     * @param {number} width - The canvas width.
     * @param {number} height - The canvas height.
     */
    _drawMessage(message, width, height) {
        this.ctx.fillText(message, width / 2, height / 2);
    }

    _drawBarChart(data, canvasWidth, canvasHeight) {
        const numBars = data.length;
        if (numBars === 0) return;

        const padding = 20;
        const chartWidth = canvasWidth - 2 * padding;
        const chartHeight = canvasHeight - 2 * padding - 20;
        const barWidth = chartWidth / numBars - 5;
        const maxValue = Math.max(...data.map(d => d.value), 0);

        if (maxValue === 0) {
            this._drawMessage('All values are 0', canvasWidth, canvasHeight);
            return;
        }

        data.forEach((item, index) => {
            this._drawBar(item, index, barWidth, maxValue, chartHeight, padding, canvasHeight);
        });
    }

    /**
     * Draws a single bar.
     * @param {Object} item - The data item.
     * @param {number} index - The bar index.
     * @param {number} barWidth - The bar width.
     * @param {number} maxValue - The maximum value.
     * @param {number} chartHeight - The chart height.
     * @param {number} padding - The padding.
     * @param {number} canvasHeight - The canvas height.
     */
    _drawBar(item, index, barWidth, maxValue, chartHeight, padding, canvasHeight) {
        const barHeight = (item.value / maxValue) * chartHeight;
        const x = padding + index * (barWidth + 5);
        const y = canvasHeight - padding - barHeight - 20;

        this.ctx.fillStyle = item.color || '#cccccc';
        this.ctx.fillRect(x, y, barWidth, barHeight);

        this.ctx.fillStyle = this.data.chartTextColor || DEFAULT_CHART_TEXT_COLOR;
        this.ctx.fillText(item.label || '', x + barWidth / 2, canvasHeight - padding + 5);
    }

    updateChartData(newData) {
        this.data.chartData = newData;
        this._drawChart();
        this._emitChartDataChange();
    }

    /**
     * Emits the chart data change event.
     */
    _emitChartDataChange() {
        this.space?.emit('graph:node:dataChanged', {
            node: this,
            property: 'chartData',
            value: this.data.chartData,
        });
    }

    _createLabel() {
        return createCSS3DLabelObject(
            this.data.label,
            this.id,
            'node-label-3d',
            LABEL_STYLES.DATA_NODE,
            'data-label'
        );
    }

    update(space) {
        super.update(space);
        if (this.labelObject) {
            const offset = this.getBoundingSphereRadius() * 1.1 + GRAPH_CONSTANTS.DEFAULT_LABEL_OFFSET + 5;
            this.labelObject.position.copy(this.position).y += offset;
            if (space?._cam) this.labelObject.quaternion.copy(space._cam.quaternion);
        }
    }

    updateBoundingSphere() {
        if (!this.mesh) return;
        if (!this.mesh.geometry.boundingSphere) this.mesh.geometry.computeBoundingSphere();
        this._boundingSphere = this.mesh.geometry.boundingSphere.clone();
        this._boundingSphere.center.copy(this.position);
        this._boundingSphere.radius = (this.size / 2) * Math.sqrt(2);
    }

    setSelectedStyle(selected) {
        if (this.mesh?.material) this.mesh.material.emissive?.setHex(selected ? 0x333300 : 0x000000);
        this.labelObject?.element?.classList.toggle('selected', selected);
    }

    dispose() {
        super.dispose();
        this.texture?.dispose();
        this.canvas = null;
        this.ctx = null;
        this.texture = null;
    }
}
