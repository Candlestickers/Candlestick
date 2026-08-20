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
        
        // format params
        pkg = pkg.toLowerCase();
        version = version.replaceAll('.x', '');
        imports = imports.replaceAll(' ', '');
        imports = imports.replaceAll('    ', '');
        console.log("pkg and pkgs:", pkg, this.pkgs)

        // check if package is installed
        if (this.pkgs.some(pkgy => pkgy.pkg == pkg)) {
            if (this.pkgs.some(pkgy => pkgy.imports == imports)){
                console.log('Package already exists, exiting installer');
                return;
            }
        }

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

        // attach to a script tag
        let txt = this.loader && this.loader.textContent || '';
        if(this.loader) this.loader.remove();
        this.loader = document.createElement('script');
        this.loader.type = 'module';
        this.loader.id = "pkg-loader"; // this is for anyone who wants to read the script tag from elsewhere
        document.head.appendChild(this.loader);
        this.loader.textContent = txt + mainStr + importLoader;

        // add to our packages array
        this.pkgs.push({pkg: pkg, imports: imports, version: version});
    }

    // todo: make uninstall run at all
    /**
     * Uninstalls a package from the project.
     * @param {string} pkg - The package to remove
     */
    uninstall(pkg){}
}