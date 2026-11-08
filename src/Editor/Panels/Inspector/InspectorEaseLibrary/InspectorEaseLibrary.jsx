/*
 * Copyright 2026 Candlestickers
 *
 * This file is part of Candlestick.
 *
 * Candlestick is free software: you can redistribute it and/or modify
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

import { useState, useEffect } from 'react';
import InspectorSelector from '../InspectorRow/InspectorRowTypes/InspectorSelector';
import InspectorTextInput from '../InspectorRow/InspectorRowTypes/InspectorTextInput';
import ActionButton from 'Editor/Util/ActionButton/ActionButton';

/**
 * The saved eases of the project.
 * @param {Wick.Project} project - The project.
 * @param {string} easeName - The name of the ease.
 * @param {object} easeCurve - The ease curve.
 * @param {function} applyEase - Make all selected tweens use a saved ease.
 * @param {function} saveEase - Save an ease.
 * @param {function} renameEase - Rename an ease.
 * @param {function} deleteEase - Delete an ease.
 */
function InspectorEaseLibrary({ project, easeName, easeCurve, applyEase, saveEase, renameEase, deleteEase }) {
    const current = project.eases.has(easeName) ? easeName : null;
    const options = [...project.eases.keys()].map(savedName => ({ label: savedName, value: savedName }));

    const [name, setName] = useState(current || '');
    useEffect(() => setName(current || ''), [current]);

    return (
        <div className="inspector-ease-library">
            <InspectorSelector
                key={current || ''}
                tooltip="Saved Eases"
                type="select"
                options={options}
                value={current || ''}
                isSearchable={true}
                onChange={(option) => applyEase(option.value)} />
            <InspectorTextInput
                tooltip="Ease Name"
                val={name}
                onChange={setName}
                placeholder="New Ease" />
            <div className="inspector-item">
                <ActionButton
                    id="ease-save-button"
                    text="Save"
                    tooltip="Save ease"
                    color="gray"
                    disabled={!easeCurve}
                    action={() => saveEase(name, easeCurve)} />
                {current && <>
                    <ActionButton
                        id="ease-rename-button"
                        text="Rename"
                        tooltip="Rename ease"
                        color="gray"
                        action={() => renameEase(current, name)} />
                    <ActionButton
                        id="ease-delete-button"
                        text="Delete"
                        tooltip="Delete ease"
                        color="gray"
                        action={() => deleteEase(current)} />
                </>}
            </div>
        </div>
    );
}

export default InspectorEaseLibrary;
