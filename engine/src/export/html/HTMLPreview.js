/*
 * Copyright 2020 WICKLETS LLC
 *
 * This file is part of Wick Engine.
 *
 * Wick Engine is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Wick Engine is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Wick Engine.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Utility class for opening Wick projects inside popup windows.
 */
Wick.HTMLPreview = class {
    /**
     * Runs a project inside a popup window.
     * @param {Wick.Project} project - The project to run.
     * @param {function} callback - Function that's called when the popup is successfully created.
     */
    static async previewProject(project, callback) {
        Wick.HTMLExport.bundleProject(project, async html => {
            
            // try creating preview window with tauri api... 
            try {
                
                // try to create a preview window through tauri
                const WebviewWindow = window.__TAURI__.webviewWindow.WebviewWindow

                if (WebviewWindow) { // if successfull in creating the window...

                    // create a blob for html to generate url
                    const blob = new Blob([html], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);

                    const preview = new WebviewWindow('preview-' + Date.now(), {
                        title: project.name,
                        width: project.width || 800,
                        height: project.height || 600,
                        url // load the blob 
                    })

                    preview.once('tauri://created', () => {
                        callback(preview);
                    })

                    return // exit early if tauri worked (else, keep going to browser preview window)
                }
            } catch (e) {
                console.error('Tauri error: ', e);
            }

            // no tauri? No problemo, open browser
            console.warn('Opening browser preview');
            const win = window.open('', '_blank', `height=${project.height},width=${project.width}`)
            if (win) {
                win.document.title = project.name
                win.document.write(html)
                win.document.close()
            }
            callback(win)
        })
    }
}
