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
        this.imports = [];
    }

    /**
     * Initialise WickPM. This optimises the editor if WickPM is unused.
     */
    init(){
        this.loader = document.createElement('script');
        this.loader.type = 'module';
        this.loader.id = "pkg-loader";
        document.appendChild(this.loader)
    }

    /**
     * Installs a package from the npm registry.
     * @param {string} pkg - The package to install
     * @param {string} imports - The imports. Can be named or default
     * @param {string} version - (OPTIONAL) The version of the package. Defaults to latest.
     */
    install(pkg, imports, version = 'latest'){
        version.replaceAll('.x', '')
        let pkgStr = 'esm.sh/' + pkg + '@' + version;
        this.loader.innerHTML += '\n import ' + imports + 'from ' + pkgStr + ';'
    }

    /**
     * Uninstalls a package from the project.
     * @param {string} pkg - The package to remove
     */
    uninstall(pkg){}
}