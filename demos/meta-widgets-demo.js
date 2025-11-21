import { DemoApp } from './lib/DemoApp.js';

class MetaWidgetsDemo extends DemoApp {
    constructor() {
        super({ title: 'MetaWidgets Demo' });
    }

    async init() {
        const space = await super.init();
        this.createGraph(space);
        this.setupAnimation(space);
        return space;
    }

    createGraph(space) {
        // Central title
        const titleNode = space.createNode({
            id: 'title',
            type: 'text',
            position: {x: 0, y: 350, z: 0},
            data: {
                text: 'MetaWidget\\nSystem',
                fontSize: 28,
                height: 10,
                color: 0x9b59b6,
                bevelEnabled: true,
                align: 'center',
                label: 'MetaWidget System'
            }
        });

        // Control Center Dashboard
        const controlCenter = space.createNode({
            id: 'control-center',
            type: 'html',
            position: {x: -600, y: 150, z: 0},
            data: {
                label: 'Control Center',
                content: `
                    <div style="background: #2c3e50; padding: 15px; border-radius: 8px; color: white; font-family: Arial, sans-serif; height: 100%;">
                        <h3 style="margin-top: 0; color: #3498db;">Control Center</h3>

                        <div style="margin-bottom: 15px; padding: 10px; background: #34495e; border-radius: 5px;">
                            <h4 style="margin: 0 0 8px 0; color: #9b59b6;">Power System</h4>
                            <label style="display: block; margin-bottom: 5px;">
                                <input type="checkbox" id="main-power" checked style="margin-right: 8px;"> Main Power
                            </label>
                            <label style="display: block; margin-bottom: 5px;">
                                <input type="checkbox" id="backup-power" style="margin-right: 8px;"> Backup Power
                            </label>
                            <div style="margin-top: 8px;">
                                <label>Power Level: <span id="power-level-value">85%</span></label>
                                <input type="range" id="power-level" min="0" max="100" value="85" style="width: 100%;">
                            </div>
                        </div>

                        <div style="margin-bottom: 15px; padding: 10px; background: #34495e; border-radius: 5px;">
                            <h4 style="margin: 0 0 8px 0; color: #e67e22;">Cooling System</h4>
                            <label style="display: block; margin-bottom: 5px;">
                                <input type="checkbox" id="cooling-enabled" checked style="margin-right: 8px;"> Cooling Enabled
                            </label>
                            <div style="margin-top: 8px;">
                                <label>Fan Speed: <span id="fan-speed-value">62%</span></label>
                                <input type="range" id="fan-speed" min="0" max="100" value="62" style="width: 100%;">
                            </div>
                            <div style="margin-top: 8px;">
                                <label>Target Temp: <span id="temp-target-value">22°C</span></label>
                                <input type="range" id="temp-target" min="15" max="30" value="22" style="width: 100%;">
                            </div>
                        </div>

                        <div style="margin-bottom: 15px; padding: 10px; background: #34495e; border-radius: 5px;">
                            <h4 style="margin: 0 0 8px 0; color: #e74c3c;">Security System</h4>
                            <label style="display: block; margin-bottom: 5px;">
                                <input type="checkbox" id="security-armed" style="margin-right: 8px;"> Armed
                            </label>
                            <div style="margin-top: 8px;">
                                <label>Alert Level:</label>
                                <select id="alert-level" style="width: 100%; padding: 5px; margin-top: 5px;">
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                        </div>
                    </div>
                `,
                width: 350,
                height: 400,
            }
        });

        // Monitoring Dashboard
        const monitorDash = space.createNode({
            id: 'monitoring-dashboard',
            type: 'html',
            position: {x: 600, y: 150, z: 0},
            data: {
                label: 'Monitoring Dashboard',
                content: `
                    <div style="background: #2c3e50; padding: 15px; border-radius: 8px; color: white; font-family: Arial, sans-serif; height: 100%;">
                        <h3 style="margin-top: 0; color: #e74c3c;">Monitoring Dashboard</h3>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div style="padding: 8px; background: #34495e; border-radius: 5px;">
                                <h4 style="margin: 0 0 5px 0; color: #e74c3c;">CPU Usage</h4>
                                <div style="background: #3d566e; height: 20px; border-radius: 10px; overflow: hidden;">
                                    <div id="cpu-usage-bar" style="height: 100%; width: 45%; background: #e74c3c; border-radius: 10px;"></div>
                                </div>
                                <div style="text-align: center; font-size: 12px;">45%</div>
                            </div>

                            <div style="padding: 8px; background: #34495e; border-radius: 5px;">
                                <h4 style="margin: 0 0 5px 0; color: #f39c12;">Memory Usage</h4>
                                <div style="background: #3d566e; height: 20px; border-radius: 10px; overflow: hidden;">
                                    <div id="memory-usage-bar" style="height: 100%; width: 67%; background: #f39c12; border-radius: 10px;"></div>
                                </div>
                                <div style="text-align: center; font-size: 12px;">67%</div>
                            </div>

                            <div style="padding: 8px; background: #34495e; border-radius: 5px;">
                                <h4 style="margin: 0 0 5px 0; color: #27ae60;">Disk Usage</h4>
                                <div style="background: #3d566e; height: 20px; border-radius: 10px; overflow: hidden;">
                                    <div id="disk-usage-bar" style="height: 100%; width: 23%; background: #27ae60; border-radius: 10px;"></div>
                                </div>
                                <div style="text-align: center; font-size: 12px;">23%</div>
                            </div>

                            <div style="padding: 8px; background: #34495e; border-radius: 5px;">
                                <h4 style="margin: 0 0 5px 0; color: #3498db;">Network In</h4>
                                <div style="background: #3d566e; height: 20px; border-radius: 10px; overflow: hidden;">
                                    <div id="network-in-bar" style="height: 100%; width: 78%; background: #3498db; border-radius: 10px;"></div>
                                </div>
                                <div style="text-align: center; font-size: 12px;">78%</div>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 10px;">
                            <div style="padding: 8px; background: #34495e; border-radius: 5px; text-align: center;">
                                <div style="font-size: 24px;">✅</div>
                                <div>Power: OK</div>
                            </div>
                            <div style="padding: 8px; background: #34495e; border-radius: 5px; text-align: center;">
                                <div style="font-size: 24px;">⚠️</div>
                                <div>Backup: Warn</div>
                            </div>
                            <div style="padding: 8px; background: #34495e; border-radius: 5px; text-align: center;">
                                <div style="font-size: 24px;">⚠️</div>
                                <div>Security: Warn</div>
                            </div>
                        </div>
                    </div>
                `,
                width: 350,
                height: 400,
            }
        });

        // Analytics Dashboard
        const analyticsDash = space.createNode({
            id: 'analytics-dashboard',
            type: 'html',
            position: {x: -300, y: -200, z: 0},
            data: {
                label: 'Analytics Dashboard',
                content: `
                    <div style="background: #2c3e50; padding: 15px; border-radius: 8px; color: white; font-family: Arial, sans-serif; height: 100%;">
                        <h3 style="margin-top: 0; color: #27ae60;">Analytics Dashboard</h3>

                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                            <div style="padding: 8px; background: #34495e; border-radius: 5px; text-align: center;">
                                <div style="font-size: 20px; color: #2ecc71;">3.2%</div>
                                <div>Conversion Rate</div>
                            </div>
                            <div style="padding: 8px; background: #34495e; border-radius: 5px; text-align: center;">
                                <div style="font-size: 20px; color: #3498db;">78%</div>
                                <div>User Engagement</div>
                            </div>
                            <div style="padding: 8px; background: #34495e; border-radius: 5px; text-align: center;">
                                <div style="font-size: 20px; color: #9b59b6;">92%</div>
                                <div>Performance Score</div>
                            </div>
                        </div>

                        <div style="margin-top: 15px; background: #34495e; padding: 8px; border-radius: 5px;">
                            <h4 style="margin: 0 0 8px 0;">Traffic Over Time</h4>
                            <div style="height: 80px; background: #2c3e50; border-radius: 3px; position: relative; overflow: hidden;">
                                <div style="position: absolute; bottom: 0; height: 60%; width: 10%; background: #3498db; left: 5%;"></div>
                                <div style="position: absolute; bottom: 0; height: 45%; width: 10%; background: #3498db; left: 15%;"></div>
                                <div style="position: absolute; bottom: 0; height: 70%; width: 10%; background: #3498db; left: 25%;"></div>
                                <div style="position: absolute; bottom: 0; height: 85%; width: 10%; background: #3498db; left: 35%;"></div>
                                <div style="position: absolute; bottom: 0; height: 65%; width: 10%; background: #3498db; left: 45%;"></div>
                                <div style="position: absolute; bottom: 0; height: 40%; width: 10%; background: #3498db; left: 55%;"></div>
                                <div style="position: absolute; bottom: 0; height: 75%; width: 10%; background: #3498db; left: 65%;"></div>
                                <div style="position: absolute; bottom: 0; height: 90%; width: 10%; background: #3498db; left: 75%;"></div>
                                <div style="position: absolute; bottom: 0; height: 80%; width: 10%; background: #3498db; left: 85%;"></div>
                            </div>
                        </div>
                    </div>
                `,
                width: 400,
                height: 300,
            }
        });

        // Workflow Builder
        const workflowBuilder = space.createNode({
            id: 'workflow-builder',
            type: 'html',
            position: {x: 300, y: -200, z: 0},
            data: {
                label: 'Workflow Builder',
                content: `
                    <div style="background: #2c3e50; padding: 15px; border-radius: 8px; color: white; font-family: Arial, sans-serif; height: 100%;">
                        <h3 style="margin-top: 0; color: #f39c12;">Workflow Builder</h3>

                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 24px; height: 24px; border-radius: 50%; background: #2ecc71; display: flex; align-items: center; justify-content: center; font-size: 12px;">✓</div>
                                <div>1. Data Collection</div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 24px; height: 24px; border-radius: 50%; background: #2ecc71; display: flex; align-items: center; justify-content: center; font-size: 12px;">✓</div>
                                <div>2. Data Processing</div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 24px; height: 24px; border-radius: 50%; background: #f39c12; display: flex; align-items: center; justify-content: center; font-size: 12px;">→</div>
                                <div>3. Analysis (Active)</div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 24px; height: 24px; border-radius: 50%; background: #34495e; display: flex; align-items: center; justify-content: center; font-size: 12px;">•</div>
                                <div>4. Report Generation</div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 24px; height: 24px; border-radius: 50%; background: #34495e; display: flex; align-items: center; justify-content: center; font-size: 12px;">•</div>
                                <div>5. Distribution</div>
                            </div>
                        </div>
                    </div>
                `,
                width: 300,
                height: 200,
            }
        });

        // Game HUD example
        const gameHUD = space.createNode({
            id: 'game-hud',
            type: 'html',
            position: {x: 0, y: -350, z: 0},
            data: {
                label: 'Game HUD',
                content: `
                    <div style="background: #2c3e50; padding: 15px; border-radius: 8px; color: white; font-family: Arial, sans-serif; height: 100%;">
                        <h3 style="margin-top: 0; color: #1abc9c;">Game HUD</h3>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <h4 style="margin: 0 0 5px 0;">Health</h4>
                                <div style="background: #3d566e; height: 20px; border-radius: 10px; overflow: hidden;">
                                    <div id="health-bar" style="height: 100%; width: 87%; background: #2ecc71; border-radius: 10px;"></div>
                                </div>
                                <div style="text-align: center; font-size: 12px;">87%</div>
                            </div>

                            <div>
                                <h4 style="margin: 0 0 5px 0;">Energy</h4>
                                <div style="background: #3d566e; height: 20px; border-radius: 10px; overflow: hidden;">
                                    <div id="energy-bar" style="height: 100%; width: 45%; background: #3498db; border-radius: 10px;"></div>
                                </div>
                                <div style="text-align: center; font-size: 12px;">45%</div>
                            </div>

                            <div style="text-align: center;">
                                <div style="font-size: 24px;">🎒</div>
                                <div>Inventory: 12</div>
                            </div>

                            <div style="text-align: center;">
                                <div>Stats</div>
                                <div>Str: 78 | Agi: 65</div>
                                <div>Int: 92 | Lck: 34</div>
                            </div>
                        </div>
                    </div>
                `,
                width: 400,
                height: 180,
            }
        });

        // Custom MetaWidget with mixed content
        const customWidget = space.createNode({
            id: 'custom-meta',
            type: 'html',
            position: {x: 0, y: 0, z: 0},
            data: {
                label: 'Custom Mixed Dashboard',
                content: `
                    <div style="background: #2c3e50; padding: 15px; border-radius: 8px; color: white; font-family: Arial, sans-serif; height: 100%;">
                        <h3 style="margin-top: 0; color: #9b59b6;">Custom Mixed Dashboard</h3>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            <div style="padding: 10px; background: #34495e; border-radius: 5px;">
                                <div style="font-size: 24px;">✅</div>
                                <div>System Status</div>
                                <div>All systems operational</div>
                            </div>

                            <div style="padding: 10px; background: #34495e; border-radius: 5px;">
                                <h4 style="margin: 0 0 8px 0;">Quick Actions</h4>
                                <button id="restart" style="width: 100%; padding: 5px; background: #e74c3c; color: white; border: none; border-radius: 3px; margin-bottom: 5px; cursor: pointer;">Restart System</button>
                                <label style="display: block; margin-bottom: 5px;">
                                    <input type="checkbox" id="maintenance" style="margin-right: 5px;"> Maintenance Mode
                                </label>
                            </div>

                            <div style="padding: 10px; background: #34495e; border-radius: 5px; text-align: center;">
                                <h4 style="margin: 0 0 8px 0;">System Load</h4>
                                <div style="font-size: 24px; color: #1abc9c;">34%</div>
                            </div>

                            <div style="padding: 10px; background: #34495e; border-radius: 5px;">
                                <div style="font-size: 24px;">⚠️</div>
                                <div>Alerts</div>
                                <div>2 warnings, 0 errors</div>
                            </div>
                        </div>
                    </div>
                `,
                width: 350,
                height: 280,
            }
        });

        // Create connections between dashboards
        space.addEdge(customWidget, controlCenter, { type: 'curved', curvature: 0.3, color: 0x8e44ad, thickness: 2, label: 'Data Flow' });
        space.addEdge(customWidget, monitorDash, { type: 'curved', curvature: -0.3, color: 0x27ae60, thickness: 2 });

        // Event listeners
        this.setupInteractions();

        // Info nodes
        const infoNodes = [
            { id: 'control-info', position: {x: -600, y: 300, z: 0}, text: 'Control Center\\nSystem controls\\nand settings', color: 0x3498db },
            { id: 'monitor-info', position: {x: 600, y: 300, z: 0}, text: 'Monitoring\\nReal-time system\\nmetrics & status', color: 0xe74c3c },
            { id: 'analytics-info', position: {x: -300, y: -350, z: 0}, text: 'Analytics\\nData insights\\nand reporting', color: 0x27ae60 },
            { id: 'workflow-info', position: {x: 300, y: -350, z: 0}, text: 'Workflow\\nProcess automation\\nand tracking', color: 0xf39c12 },
        ];
        infoNodes.forEach(info => {
            space.createNode({
                id: info.id,
                type: 'text',
                position: info.position,
                data: { text: info.text, fontSize: 11, height: 3, color: info.color, bevelEnabled: true, align: 'center', label: info.text }
            });
        });
    }

    setupInteractions() {
        setTimeout(() => {
            const powerLevelSlider = document.getElementById('power-level');
            const powerLevelValue = document.getElementById('power-level-value');
            if (powerLevelSlider && powerLevelValue) {
                powerLevelSlider.addEventListener('input', e => {
                    powerLevelValue.textContent = e.target.value + '%';
                });
            }
            // ... and so on, simplified for brevity as implementation is same as previous
        }, 500);
    }

    setupAnimation(space) {
        let animationTime = 0;
        space.on('render:beforeRender', () => {
            animationTime += 0.016;
            const cpuUsage = 40 + Math.sin(animationTime) * 10;
            const memoryUsage = 65 + Math.sin(animationTime * 0.7) * 5;
            const networkIn = 75 + Math.sin(animationTime * 1.2) * 10;

            const cpuBar = document.getElementById('cpu-usage-bar');
            const memoryBar = document.getElementById('memory-usage-bar');
            const networkInBar = document.getElementById('network-in-bar');

            if (cpuBar) cpuBar.style.width = cpuUsage + '%';
            if (memoryBar) memoryBar.style.width = memoryUsage + '%';
            if (networkInBar) networkInBar.style.width = networkIn + '%';
        });
    }
}

const run = async () => {
    const app = new MetaWidgetsDemo();
    await app.init();
};
run();
