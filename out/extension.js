"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
function activate(context) {
    let disposable = vscode.commands.registerCommand('mobile-preview.show', () => {
        PhonePreviewPanel.createOrShow(context.extensionUri);
    });
    let openSettings = vscode.commands.registerCommand('mobile-preview.openSettings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'Mobile Preview');
    });
    context.subscriptions.push(disposable, openSettings);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
class PhonePreviewPanel {
    constructor(panel, extensionUri) {
        this._disposables = [];
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Update content when the active editor changes
        vscode.window.onDidChangeActiveTextEditor(() => {
            this._update();
        }, null, this._disposables);
    }
    static createOrShow(extensionUri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        if (PhonePreviewPanel.currentPanel) {
            PhonePreviewPanel.currentPanel._panel.reveal(column);
            return;
        }
        const panel = vscode.window.createWebviewPanel('phonePreview', 'Phone Preview', column || vscode.ViewColumn.Two, {
            enableScripts: true,
            retainContextWhenHidden: true,
        });
        PhonePreviewPanel.currentPanel = new PhonePreviewPanel(panel, extensionUri);
    }
    _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }
    _getHtmlForWebview(webview) {
        const editor = vscode.window.activeTextEditor;
        const currentFile = vscode.workspace.getConfiguration('mobile-preview').get('url') || 'http://localhost:3000';
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * {
                        -webkit-font-smoothing: antialiased;
                        -moz-osx-font-smoothing: grayscale;
                        }
                    body {
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background: transparent;
                        gap: 20px;
                    }

                    .wrapper {
                        position: relative;
                        width: 100%;
                        height: 100%;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }

                    .phone-container {
                        position: relative;
                        background: black;
                        border-radius: 55px;
                        box-shadow: 0 0 20px rgba(0,0,0,0.2);
                        padding: 15px;
                        box-sizing: border-box;
                        transform-origin: center;
                        transform: scale(var(--scale-factor, 1));
                    }

                    .phone-screen {
                        position: relative;
                        background: white;
                        width: 390px;
                        height: 844px;
                        border-radius: 45px;
                        overflow: hidden;
                    }

                    .notch {
                        position: absolute;
                        width: 160px;
                        height: 35px;
                        background: black;
                        left: 50%;
                        top: -1px;
                        transform: translateX(-50%);
                        border-bottom-left-radius: 24px;
                        border-bottom-right-radius: 24px;
                        z-index: 1000;
                    }

                    .phone-content {
                        width: 100%;
                        height: 100%;
                        border: none;
                    }

                    .url-input-container {
                        position: absolute;
                        bottom: 10px;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 90%;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        z-index: 1000;
                    }

                    .url-input {
                        flex: 1;
                        height: 30px;
                        border: 2px solid black;
                        border-radius: 8px;
                        padding: 0 10px;
                        font-size: 14px;
                        outline: none;
                        transition: border-color 0.2s;
                        background: transparent;
                        color: white;
                    }

                    .url-input:focus {
                        border-color: white;
                    }

                    .reload-button {
                        width: 30px;
                        height: 30px;
                        background-color: black;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 16px;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
                </style>
                <script>
                    function calculateScale() {
                        const phone = document.querySelector('.phone-container');
                        const wrapper = document.querySelector('.wrapper');
                        
                        const phoneAspectRatio = 844 / 390;
                        const wrapperAspectRatio = wrapper.clientHeight / wrapper.clientWidth;
                        
                        let scale;
                        if (wrapperAspectRatio > phoneAspectRatio) {
                            scale = (wrapper.clientWidth / 390) * 0.8;
                        } else {
                            scale = (wrapper.clientHeight / 844) * 0.8;
                        }
                        
                        phone.style.setProperty('--scale-factor', Math.min(1, scale));
                    }

                    function navigateToUrl(event) {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            const url = event.target.value;
                            const iframe = document.querySelector('.phone-content');
                            
                            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                                iframe.src = 'http://' + url;
                                event.target.value = 'http://' + url;
                            } else {
                                iframe.src = url;
                            }
                        }
                    }

                    function reloadPage() {
                        const iframe = document.querySelector('.phone-content');
                        iframe.src = iframe.src;
                    }

                    window.onload = () => {
                        const iframe = document.querySelector('.phone-content');
                        const urlInput = document.querySelector('.url-input');
                        
                        iframe.onload = () => {
                            urlInput.value = iframe.src;
                        };
                        
                        urlInput.value = '${currentFile}';
                        calculateScale();
                    }

                    window.onresize = calculateScale;
                </script>
            </head>
            <body>
                <div class="wrapper">
                    <div class="url-input-container">
                        <input type="text" class="url-input" 
                            placeholder="Enter URL and press Enter"
                            onkeypress="navigateToUrl(event)"
                        />
                        <button class="reload-button" onclick="reloadPage()">⟳</button>
                    </div>
                    <div class="phone-container">
                        <div class="phone-screen">
                            <div class="notch"></div>
                            <iframe class="phone-content" src="${currentFile}" />
                            
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
    dispose() {
        PhonePreviewPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
//# sourceMappingURL=extension.js.map