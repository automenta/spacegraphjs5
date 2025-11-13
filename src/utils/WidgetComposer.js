export class WidgetComposer {
    static presets = new Map();
    static templates = new Map();

    static registerPreset(name, config) {
        this.presets.set(name, config);
    }

    static registerTemplate(name, template) {
        this.templates.set(name, template);
    }

    static createDashboard(space, position, config) {
        const {
            title = 'Dashboard',
            width = 600,
            height = 400,
            layout = 'grid',
            columns = 3,
            widgets = [],
        } = config;

        const dashboard = space.addNode({
            type: 'meta-widget',
            id: config.id || `dashboard-${Date.now()}`,
            position,
            data: {
                title,
                width,
                height,
                layout,
                columns,
                widgets: widgets.map((widget, index) => ({
                    id: widget.id || `widget-${index}`,
                    ...widget,
                })),
            },
        });

        return dashboard;
    }

    static createControlCenter(space, position, systems = []) {
        const controlWidgets = systems.map(system => ({
            id: `control-${system.name}`,
            type: 'control-panel',
            data: {
                title: system.title || system.name,
                controls: system.controls || this._createDefaultSystemControls(system),
            },
        }));

        return this.createDashboard(space, position, {
            title: 'Control Center',
            width: 800,
            height: 500,
            layout: 'grid',
            columns: 2,
            widgets: controlWidgets,
        });
    }

    static _createDefaultSystemControls(system) {
        return [
            {
                id: 'power',
                type: 'switch',
                label: 'Power',
                value: system.enabled || false,
            },
            {
                id: 'level',
                type: 'slider',
                label: 'Level',
                value: system.level || 50,
                min: 0,
                max: 100,
            },
        ];
    }

    static createMonitoringDashboard(space, position, metrics = []) {
        const monitorWidgets = metrics.map(metric => this._createMetricWidget(metric));

        return this.createDashboard(space, position, {
            title: 'System Monitor',
            width: 900,
            height: 600,
            layout: 'grid',
            columns: 3,
            widgets: monitorWidgets,
        });
    }

    static _createMetricWidget(metric) {
        const baseId = `${metric.type}-${metric.name}`;
        const title = metric.title || metric.name;
        const color = metric.color || this._getDefaultMetricColor(metric.type);

        switch (metric.type) {
            case 'gauge':
                return {
                    id: baseId,
                    type: 'progress',
                    data: {
                        label: title,
                        progressType: 'gauge',
                        value: metric.value || 0,
                        max: metric.max || 100,
                        color,
                    },
                };
            case 'progress':
                return {
                    id: baseId,
                    type: 'progress',
                    data: {
                        label: title,
                        progressType: 'bar',
                        value: metric.value || 0,
                        max: metric.max || 100,
                        color,
                    },
                };
            case 'status':
                return {
                    id: baseId,
                    type: 'info',
                    data: {
                        text: title,
                        icon: this._getStatusIcon(metric.status),
                    },
                };
            case 'chart':
                return {
                    id: baseId,
                    type: 'chart',
                    data: {
                        title,
                        chartType: metric.chartType || 'line',
                    },
                };
            default:
                return {
                    id: baseId,
                    type: 'info',
                    data: {
                        text: title,
                        icon: 'ℹ️',
                    },
                };
        }
    }

    static _getDefaultMetricColor(type) {
        const colorMap = {
            gauge: '#4a9eff',
            progress: '#00ff88',
            status: '#ffaa00',
            chart: '#9b59b6',
        };
        return colorMap[type] || '#3498db';
    }

    static _getStatusIcon(status) {
        const iconMap = {
            ok: '✅',
            warning: '⚠️',
            error: '❌',
        };
        return iconMap[status] || '❓';
    }

    static createWorkflowBuilder(space, position, steps = []) {
        const workflowWidgets = [
            ...steps.map((step, index) => ({
                id: `step-${index}`,
                type: 'info',
                data: {
                    text: step.title || `Step ${index + 1}`,
                    icon: this._getWorkflowStepIcon(step),
                },
            })),
            this._createWorkflowControlsWidget(),
        ];

        return this.createDashboard(space, position, {
            title: 'Workflow Builder',
            width: 700,
            height: 450,
            layout: 'flex-column',
            widgets: workflowWidgets,
        });
    }

    static _getWorkflowStepIcon(step) {
        if (step.completed) return '✅';
        if (step.active) return '⚡';
        return '⏳';
    }

    static _createWorkflowControlsWidget() {
        return {
            id: 'workflow-controls',
            type: 'control-panel',
            data: {
                title: 'Workflow Controls',
                controls: [
                    {id: 'start', type: 'button', label: 'Start Workflow', text: 'Start'},
                    {id: 'pause', type: 'button', label: 'Pause', text: 'Pause'},
                    {id: 'reset', type: 'button', label: 'Reset', text: 'Reset'},
                    {id: 'auto', type: 'switch', label: 'Auto Mode', value: false},
                ],
            },
        };
    }

    static createAnalyticsDashboard(space, position, analytics = {}) {
        const widgets = [
            ...this._createMetricWidgets(analytics.keyMetrics, 'metric'),
            ...this._createChartWidgets(analytics.charts),
            this._createAnalyticsControlsWidget(),
        ];

        return this.createDashboard(space, position, {
            title: 'Analytics Dashboard',
            width: 1000,
            height: 700,
            layout: 'grid',
            columns: 3,
            widgets,
        });
    }

    static _createMetricWidgets(metrics, prefix) {
        if (!metrics) return [];
        return metrics.map((metric, index) => ({
            id: `${prefix}-${index}`,
            type: 'progress',
            data: {
                label: metric.name,
                progressType: 'circular',
                value: metric.value,
                max: metric.max || 100,
                color: metric.color || '#3498db',
            },
        }));
    }

    static _createChartWidgets(charts) {
        if (!charts) return [];
        return charts.map((chart, index) => ({
            id: `chart-${index}`,
            type: 'chart',
            data: {
                title: chart.title,
                chartType: chart.type || 'line',
            },
        }));
    }

    static _createAnalyticsControlsWidget() {
        return {
            id: 'analytics-controls',
            type: 'control-panel',
            data: {
                title: 'Analytics Controls',
                controls: [
                    {
                        id: 'timeRange',
                        type: 'select',
                        label: 'Time Range',
                        value: '7d',
                        options: [
                            {value: '1d', label: 'Last 24 Hours'},
                            {value: '7d', label: 'Last 7 Days'},
                            {value: '30d', label: 'Last 30 Days'},
                            {value: '90d', label: 'Last 90 Days'},
                        ],
                    },
                    {id: 'refresh', type: 'button', label: 'Refresh Data', text: 'Refresh'},
                    {id: 'autoRefresh', type: 'switch', label: 'Auto Refresh', value: true},
                ],
            },
        };
    }

    static createFormBuilder(space, position, formConfig = {}) {
        const formWidgets = [
            ...this._createFormFieldWidgets(formConfig.fields),
            this._createFormActionsWidget(),
        ];

        return this.createDashboard(space, position, {
            title: formConfig.title || 'Form Builder',
            width: 600,
            height: 500,
            layout: 'flex-column',
            widgets: formWidgets,
        });
    }

    static _createFormFieldWidgets(fields) {
        if (!fields) return [];
        return fields.map((field, index) => ({
            id: `field-${index}`,
            type: 'control-panel',
            data: {
                title: field.label || `Field ${index + 1}`,
                controls: [{
                    id: field.name || `field${index}`,
                    type: field.type || 'text',
                    label: field.label || '',
                    value: field.defaultValue || '',
                    required: field.required || false,
                    placeholder: field.placeholder || '',
                    options: field.options || [],
                }],
            },
        }));
    }

    static _createFormActionsWidget() {
        return {
            id: 'form-actions',
            type: 'control-panel',
            data: {
                title: 'Form Actions',
                controls: [
                    {id: 'submit', type: 'button', label: 'Submit Form', text: 'Submit'},
                    {id: 'clear', type: 'button', label: 'Clear Form', text: 'Clear'},
                    {id: 'save', type: 'button', label: 'Save Draft', text: 'Save Draft'},
                ],
            },
        };
    }

    static createDataVisualization(space, position, datasets = []) {
        const widgets = [
            ...this._createDatasetWidgets(datasets),
            this._createVisualizationControlsWidget(),
        ];

        return this.createDashboard(space, position, {
            title: 'Data Visualization',
            width: 900,
            height: 600,
            layout: 'grid',
            columns: 2,
            widgets,
        });
    }

    static _createDatasetWidgets(datasets) {
        const widgets = [];
        datasets.forEach((dataset, index) => {
            widgets.push({
                id: `chart-${index}`,
                type: 'chart',
                data: {
                    title: dataset.name || `Dataset ${index + 1}`,
                    chartType: dataset.chartType || 'line',
                },
            });

            if (dataset.stats) {
                widgets.push({
                    id: `stats-${index}`,
                    type: 'info',
                    data: {
                        text: `Records: ${dataset.stats.count || 0}\nAvg: ${dataset.stats.average || 0}`,
                        icon: '📊',
                    },
                });
            }
        });
        return widgets;
    }

    static _createVisualizationControlsWidget() {
        return {
            id: 'viz-controls',
            type: 'control-panel',
            data: {
                title: 'Visualization Controls',
                controls: [
                    {
                        id: 'chartType',
                        type: 'select',
                        label: 'Chart Type',
                        value: 'line',
                        options: [
                            {value: 'line', label: 'Line Chart'},
                            {value: 'bar', label: 'Bar Chart'},
                            {value: 'pie', label: 'Pie Chart'},
                            {value: 'scatter', label: 'Scatter Plot'},
                        ],
                    },
                    {id: 'showGrid', type: 'switch', label: 'Show Grid', value: true},
                    {id: 'animate', type: 'switch', label: 'Animate', value: true},
                ],
            },
        };
    }

    static createGameHUD(space, position, gameConfig = {}) {
        const hudWidgets = [
            this._createPlayerStatsWidget(gameConfig.playerStats),
            this._createHealthWidget(gameConfig.health),
            this._createEnergyWidget(gameConfig.energy),
            this._createMinimapWidget(),
            this._createInventoryWidget(gameConfig.inventoryCount),
            this._createGameControlsWidget(),
        ];

        return this.createDashboard(space, position, {
            title: 'Game HUD',
            width: 800,
            height: 200,
            layout: 'flex-row',
            widgets: hudWidgets,
        });
    }

    static _createPlayerStatsWidget(playerStats) {
        if (!playerStats) return null;
        return {
            id: 'player-stats',
            type: 'control-panel',
            data: {
                title: 'Player Stats',
                controls: Object.keys(playerStats).map(stat => ({
                    id: stat,
                    type: 'progress',
                    label: stat.charAt(0).toUpperCase() + stat.slice(1),
                    value: playerStats[stat],
                    max: 100,
                })),
            },
        };
    }

    static _createHealthWidget(health) {
        return {
            id: 'health',
            type: 'progress',
            data: {
                label: 'Health',
                progressType: 'bar',
                value: health || 100,
                max: 100,
                color: '#e74c3c',
                animated: true,
            },
        };
    }

    static _createEnergyWidget(energy) {
        return {
            id: 'energy',
            type: 'progress',
            data: {
                label: 'Energy',
                progressType: 'bar',
                value: energy || 100,
                max: 100,
                color: '#3498db',
                animated: true,
            },
        };
    }

    static _createMinimapWidget() {
        return {
            id: 'minimap',
            type: 'info',
            data: {
                text: 'Mini Map',
                icon: '🗺️',
            },
        };
    }

    static _createInventoryWidget(inventoryCount) {
        return {
            id: 'inventory',
            type: 'info',
            data: {
                text: `Items: ${inventoryCount || 0}`,
                icon: '🎒',
            },
        };
    }

    static _createGameControlsWidget() {
        return {
            id: 'game-controls',
            type: 'control-panel',
            data: {
                title: 'Game Controls',
                controls: [
                    {id: 'pause', type: 'button', label: 'Pause', text: '⏸️'},
                    {id: 'settings', type: 'button', label: 'Settings', text: '⚙️'},
                    {id: 'menu', type: 'button', label: 'Menu', text: '📋'},
                ],
            },
        };
    }

    static connectWidgets(space, sourceWidget, targetWidget, connectionType = 'data') {
        const connection = space.addEdge(sourceWidget, targetWidget, {
            type: 'flow',
            particleCount: 5,
            particleSpeed: 0.3,
            particleColor: this._getConnectionColor(connectionType),
            flowDirection: 1,
            thickness: 2,
            label: connectionType,
        });

        space.on('meta-widget:control-changed', event => {
            if (event.metaWidget === sourceWidget) {
                this.propagateData(event, targetWidget, connectionType);
            }
        });

        return connection;
    }

    static _getConnectionColor(connectionType) {
        const colorMap = {
            data: 0x00ff88,
            control: 0xff6b35,
            event: 0x4a9eff,
        };
        return colorMap[connectionType] || 0x4a9eff;
    }

    static propagateData(event, targetWidget, connectionType) {
        const {controlId, value} = event;

        targetWidget.getAllWidgets().forEach(widget => {
            if (widget.data.controls) {
                const matchingControl = widget.data.controls.find(c => c.id === controlId);
                if (matchingControl) {
                    matchingControl.value = value;
                    targetWidget.updateWidget(widget.id, widget.data);
                }
            }
        });
    }

    static exportConfiguration(metaWidget) {
        return {
            type: 'meta-widget',
            layout: metaWidget.getLayoutData(),
            position: {
                x: metaWidget.position.x,
                y: metaWidget.position.y,
                z: metaWidget.position.z,
            },
            data: metaWidget.data,
        };
    }

    static importConfiguration(space, config) {
        return space.addNode({
            type: 'meta-widget',
            position: config.position,
            data: config.data,
        });
    }

    static createWidgetLibrary() {
        return {
            slider: (id, label, value = 50, min = 0, max = 100) => ({
                id: id || 'slider',
                type: 'control-panel',
                data: {
                    title: 'Slider Control',
                    controls: [{id, type: 'slider', label, value, min, max}],
                },
            }),

            button: (id, label, text) => ({
                id: id || 'button',
                type: 'control-panel',
                data: {
                    title: 'Button Control',
                    controls: [{id, type: 'button', label: label || text, text: text || label}],
                },
            }),

            progressBar: (id, label, value = 0, max = 100) => ({
                id: id || 'progress',
                type: 'progress',
                data: {label, progressType: 'bar', value, max},
            }),

            gauge: (id, label, value = 0, max = 100) => ({
                id: id || 'gauge',
                type: 'progress',
                data: {label, progressType: 'gauge', value, max},
            }),

            infoPanel: (id, text, icon = 'ℹ') => ({
                id: id || 'info',
                type: 'info',
                data: {text, icon},
            }),

            chart: (id, title, chartType = 'line') => ({
                id: id || 'chart',
                type: 'chart',
                data: {title, chartType},
            }),
        };
    }
}

// Initialize with common presets
WidgetComposer.registerPreset('monitoring', {
    title: 'System Monitoring',
    layout: 'grid',
    columns: 2,
    widgets: ['cpu-gauge', 'memory-gauge', 'disk-progress', 'network-chart'],
});

WidgetComposer.registerPreset('control-panel', {
    title: 'Control Panel',
    layout: 'flex-column',
    widgets: ['power-switch', 'volume-slider', 'brightness-slider', 'mode-select'],
});

WidgetComposer.registerPreset('analytics', {
    title: 'Analytics Dashboard',
    layout: 'grid',
    columns: 3,
    widgets: ['visitors-chart', 'revenue-gauge', 'conversion-progress', 'goals-info'],
});

export default WidgetComposer;
