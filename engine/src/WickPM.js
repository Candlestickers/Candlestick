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
    constructor() {
        this.pkgs = [];
        this.imports = {};
    }

    /**
     * Installs a package from the npm registry.
     * @param {string} pkg - The package to install
     * @param {string} imports - The imports. Can be named or default
     * @param {string} version - (OPTIONAL) The version of the package. Defaults to latest.
     */
    install(pkg, imports, version = 'latest') {

        if (pkg == undefined) { // no specific package is being installed, install them all
            let prevTxt = ''
            this.pkgs.forEach((pkgy) => {
                this._runInstaller(prevTxt + pkgy.loader.mainStr + pkgy.loader.importLoader);
            });
            return;
        }

        // format params
        pkg = pkg.toLowerCase();
        version = version.replaceAll('.x', '');
        imports = imports.replaceAll(' ', '');
        imports = imports.replaceAll('    ', '');

        // check if package is installed
        if (this.pkgs.some(pkgy => pkgy.pkg == pkg)) {
            if (this.pkgs.some(pkgy => pkgy.imports == imports)) {
                console.log('Package already exists, exiting installer');
                return;
            }
        }

        let mainStr = this._generateInstaller(pkg, imports, version).mainStr;
        let importLoader = this._generateInstaller(pkg, imports, version).importLoader;

        // attach to a script tag
        let txt = this.loader && this.loader.textContent || '';
        txt += mainStr + importLoader;
        this._runInstaller(txt);

        // add to our packages array
        this.pkgs.push({ pkg: pkg, imports: imports, version: version, loader: { mainStr: mainStr, importLoader: importLoader } });
    }

    /**
     * Uninstalls a package from the project.
     * @param {string} pkg - The package to remove
     */
    uninstall(pkg) {
        let pkgObj = this.pkgs.find(pkgy => pkgy.pkg == pkg);
        if (pkgObj == undefined) { console.log('Package not found, cannot uninstall'); return; }
        this.pkgs = this.pkgs.filter(obj => obj != pkgObj);
        this.loader.textContent = this.loader.textContent.replaceAll(pkgObj.loader.mainStr + pkgObj.loader.importLoader, '');
        this.install();
    }

    /**
     * Generates the installer string for a package.
     * @param {string} pkg - The package to install
     * @param {string} imports - The imports. Can be named or default
     * @param {string} version - (OPTIONAL) The version of the package. Defaults to latest.
     */
    _generateInstaller(pkg, imports, version = 'latest') {
        // generate some different strings for readability
        let pkgStr = 'https://esm.sh/' + pkg + '@' + version;
        let mainStr = '\n import ' + imports + ' from "' + pkgStr + '";';
        let importLoader = '', importAccessor = 'window.editor.project.WickPM.imports.';

        // check if imports are named or default
        if (!imports.includes('{')) importLoader = '\n' + importAccessor + imports + ' = ' + imports + ';';
        else {
            // remove braces
            imports = imports.replaceAll('{', '');
            imports = imports.replaceAll('}', '');

            let importArr = imports.split(',');

            // remove any empty elements
            importArr = importArr.filter(imp => imp != "");

            // generate the strings
            importArr.forEach((Import) => {
                importLoader += '\n' + importAccessor + pkg + ' = ' + '{...' + importAccessor + pkg + ',' + Import + ':' + Import + '}' + ';';
            })
        }

        return { mainStr: mainStr, importLoader: importLoader };
    }

    /**
     * Attaches our script to our package loader and runs it.
     * @param {string} txt - The text to attach.
     */
    _runInstaller(txt) {
        if (this.loader) this.loader.remove();
        this.loader = document.createElement('script');
        this.loader.type = 'module';
        this.loader.id = "pkg-loader"; // this is for anyone who wants to read the script tag from elsewhere
        this.loader.textContent = txt;
        document.head.appendChild(this.loader);
    }
}