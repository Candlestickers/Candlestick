/**
 * @license WickPM
 * Copyright 2026 Candlestickers
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

/* Wick Package Manager */
// This package manager depends on the npm registry and esm.sh
Wick.WickPM = class {
    constructor(){
        this.pkgs = [];
        this.imports = {};
    }

    /**
     * Installs a package from the npm registry.
     * @param {string} pkg - The package to install
     * @param {string} imports - The imports. Can be named or default
     * @param {string} version - (OPTIONAL) The version of the package. Defaults to latest.
     */
    install(pkg, imports, version = 'latest'){
        pkg.toLowerCase();
        if (this.pkgs.some(pkg => pkg.pkg == pkg)) {console.log('Package already exists, exitings installer'); return;}
        version.replaceAll('.x', '');
        let pkgStr = 'https://' + 'esm.sh/' + pkg + '@' + version;
        let mainStr = '\n import ' + imports + ' from "' + pkgStr + '";';
        let importLoader = '\n window.editor.project.WickPM.imports.' + pkg + ' = ' + imports + ';';
        let txt = this.loader.textContent;
        if(this.loader) this.loader.remove();
        this.loader = document.createElement('script');
        this.loader.type = 'module';
        this.loader.id = "pkg-loader";
        document.head.appendChild(this.loader);
        this.loader.textContent = txt + mainStr + importLoader;
        this.pkgs.push({pkg: pkg, imports: imports, version: version});
    }

    /**
     * Uninstalls a package from the project.
     * @param {string} pkg - The package to remove
     */
    uninstall(pkg){}
}