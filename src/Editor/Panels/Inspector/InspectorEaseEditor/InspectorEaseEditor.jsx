/*
 * Copyright 2026 Candlestickers
 *
 * This file is part of Candlestick.
 *
 * Wick Editor is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Candlestick is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Candlestick.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Component } from 'react';
import paper from 'paper';
import './_inspectoreaseeditor.scss';

class InspectorEaseEditor extends Component {
    constructor(props) {
        paper.setup()
    }

    genEase(){}

    render() {
        return (
            <div className="inspector-ease-editor-container">
                <canvas id="inspector-ease-editor" width="200" height="200"></canvas>
            </div>
        )
    }
}

export default InspectorEaseEditor