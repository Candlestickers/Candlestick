
class ScriptInfoInterface extends Object {

    /**
     * Returns an array of objects that represent all possible scripts that can be added.
     * @returns {object[]}
     */
    get scriptData() {
        let scriptData = [];

        for (let scriptType of Object.keys(this.scriptsByType)) {
            for (let scriptName of this.scriptsByType[scriptType]) {
                scriptData.push({
                    name: scriptName,
                    type: scriptType,
                    description: this.scriptDescriptions[scriptName],
                });
            }
        }

        return scriptData;
    }

    get scriptsByType() {
        return {
            'Mouse': ['mouseenter', 'mouseleave', 'mousehover', 'mousepressed', 'mousedown', 'mousereleased', 'mousedrag', 'mouseclick'],
            'Keyboard': ['keypressed', 'keyreleased', 'keydown'],
            'Timeline': ['default', 'load', 'update', 'unload'],
        }
    }

    /**
     * Sorting function for determining what order a script should be displayed in.
     * @param {object} scriptA - script object
     * @param {object} scriptB - script object
     * @returns {number} negative if script A comes before b, positive if b comes before a, 0 if they are ordered the same.
     */
    sortScripts = (scriptA, scriptB) => {
        let typeA = this.getScriptType(scriptA.name);
        let typeB = this.getScriptType(scriptB.name);

        if (!typeA || !typeB) return 0;

        let indA = this.scriptsByType[typeA].indexOf(scriptA);
        let indB = this.scriptsByType[typeB].indexOf(scriptB);

        // will be added to the index of the script for sorting purposes.
        const spacer = {
            'Mouse': 100,
            'Keyboard': 200,
            'Timeline': 0
        }

        indA += spacer[typeA];
        indB += spacer[typeB];

        return indA - indB;
    }

    /**
     * Returns the type of the script.
     * @param {string} name - name of the script, all lower case.
     * @returns {string | null} script type. One of Mouse, Keyboard, or Timeline. Null if not a valid script.
     */
    getScriptType = (name) => {
        let scriptsByType = this.scriptsByType;

        for (let scriptType of Object.keys(scriptsByType)) {
            if (scriptsByType[scriptType].indexOf(name) !== -1) {
                return scriptType
            }
        }

        return null;
    }

    get scriptTypeColors() {
        return {
            'Timeline': 'blue',
            'Mouse': 'green',
            'Keyboard': 'yellow',
        }
    }

    get scriptDescriptions() {
        return {
            'default': 'Once, before all other scripts',
            'mouseclick': 'Once, when the mouse goes down then up over an object',
            'mousedown': 'Every tick, when the mouse is down on the object',
            'mousedrag': 'Every tick, when the mouse moves while down',
            'mouseenter': 'Once, when the mouse enters the object',
            'mousehover': 'Every tick, when the mouse is over the object',
            'mouseleave': 'Once, when the mouse leaves the object',
            'mousepressed': 'Once, when the mouse presses down on the object',
            'mousereleased': 'Once, when the mouse is released over the object',
            'keypressed': 'Once, when any key is pushed down',
            'keyreleased': 'Once, when any key is released',
            'keydown': 'Every tick, when any key is down',
            'load': 'Once, when the frame is entered',
            'unload': 'Once, when the frame is exited',
            'update': 'Every tick, while the project is playing',
        }
    }

    get referenceItems() {
        return {
            'Timeline': this.timelineReference,
            'Object': this.objectReference,
            'Input': this.inputReference,
            'Project': this.projectReference,
            'Random': this.randomReference,
            'Sound': this.soundReference,
            'Event': this.eventReference,
        }
    }

    get timelineReference() {
        return (
            [
                {
                    name: 'play',
                    snippet: 'play()',
                    description: 'Plays the parent timeline that this object belongs to.',
                },
                {
                    name: 'stop',
                    snippet: 'stop()',
                    description: 'Stops the parent timeline that this object belongs to.',
                },
                {
                    name: 'gotoAndPlay',
                    snippet: 'gotoAndPlay(1)',
                    description: 'Moves the playhead to a frame on the timeline that this object belongs to, and plays that timeline.',
                    params: [{ name: 'frame', type: '{string|Number}' }],
                },
                {
                    name: 'gotoAndStop',
                    snippet: 'gotoAndStop(1)',
                    description: 'Moves the playhead to a frame on the timeline that this object belongs to, and stops that timeline.',
                    params: [{ name: 'frame', type: '{string|Number}' }],
                },
                {
                    name: 'gotoNextFrame',
                    snippet: 'gotoNextFrame()',
                    description: 'Moves the playhead to the next frame on the timeline that this object belongs to.',
                },
                {
                    name: 'gotoPrevFrame',
                    snippet: 'gotoPrevFrame()',
                    description: 'Moves the playhead to the previous frame on the timeline that this object belongs to.',
                }
            ]
        );
    }

    get objectReference() {
        return (
            [
                {
                    name: 'x',
                    snippet: 'this.x',
                    description: 'The x position of the object. (Left to Right)',
                },
                {
                    name: 'y',
                    snippet: 'this.y',
                    description: 'The y position of the object. (Up to Down)',
                },
                {
                    name: 'width',
                    snippet: 'this.width',
                    description: 'The width of the object.',
                },
                {
                    name: 'height',
                    snippet: 'this.height',
                    description: 'The height of the object.',
                },
                {
                    name: 'scaleX',
                    snippet: 'this.scaleX',
                    description: 'The scale of the object on the x-axis.',
                },
                {
                    name: 'scaleY',
                    snippet: 'this.scaleY',
                    description: 'The scale of the object on the y-axis.',
                },
                {
                    name: 'rotation',
                    snippet: 'this.rotation',
                    description: 'The rotation of the object.',
                },
                {
                    name: 'opacity',
                    snippet: 'this.opacity',
                    description: 'The opacity of the object. 0 is completely transparent, 1 is completely opaque.',
                },
                {
                    name: 'currentFrameName',
                    snippet: 'this.currentFrameName',
                    description: 'The name of the current frame. Returns empty string if the current frame does not have a name.'
                },
                {
                    name: 'currentFrameNumber',
                    snippet: 'this.currentFrameNumber',
                    description: 'The number of the current frame being displayed.'
                },
                {
                    name: 'parent',
                    snippet: 'parent',
                    description: 'Returns the object that owns the calling object.',
                },
                {
                    name: 'clone',
                    snippet: 'this.clone()',
                    description: 'Creates a clone of this object, places it on the same frame, and returns a reference to it.',
                },
                {
                    name: 'clones',
                    snippet: 'this.clones',
                    description: 'An array of every clone of an object.',
                },
                {
                    name: 'remove',
                    snippet: 'this.remove()',
                    description: 'Removes this object from the project.',
                },
                {
                    name: 'setText',
                    snippet: 'textName.setText("Text")',
                    description: 'Changes the content of a text object.',
                },
                {
                    name: 'hits',
                    snippet: 'this.hits(that)',
                    description: 'Determines if the hitboxes of two objects overlap, returns information on their collision.',
                    param: [{name: 'that', type: 'object'}],
                    returns: [{type: 'object', description: 'Returns {offsetX, offsetY, overlapX, overlapY, intersections}'}],
                },
                {
                    name: 'if (hits)',
                    snippet: 'if (this.hits(that)) {\n //Do Something!\n}',
                    description: 'A conditional that can be used to check if two objects collide.',
                    param: [{name: 'that', type: 'object'}],
                },
                {
                    name: 'depth',
                    snippet: 'this.depth',
                    description: 'Index among siblings in the parent frame/layer (0 = back; higher = front).'
                  },
                  {
                    name: 'sendToBack',
                    snippet: 'this.sendToBack()',
                    description: 'Moves this object behind all siblings in its current layer.'
                  },
                  {
                    name: 'sendToAbsoluteBack',
                    snippet: 'this.sendToAbsoluteBack()',
                    description: 'Moves this object to the bottom layer and to the back of that layer.'
                  },
                  {
                    name: 'sendToFront',
                    snippet: 'this.sendToFront()',
                    description: 'Moves this object in front of all siblings in its current layer.'
                  },
                  {
                    name: 'sendToAbsoluteFront',
                    snippet: 'this.sendToAbsoluteFront()',
                    description: 'Moves this object to the top layer and to the very front.'
                  },
                  {
                    name: 'sendForward',
                    snippet: 'this.sendForward(1)',
                    description: 'Brings this object forward by N steps in its current layer (default 1).',
                    param: [{ name: 'num', type: 'number' }]
                  },
                  {
                    name: 'sendBackward',
                    snippet: 'this.sendBackward(1)',
                    description: 'Sends this object backward by N steps in its current layer (default 1).',
                    param: [{ name: 'num', type: 'number' }]
                  },
                  {
                    name: 'swapDepth',
                    snippet: 'this.swapDepth(otherClip)',
                    description: 'Swaps draw order with another sibling clip.',
                    param: [{ name: 'otherClip', type: 'object' }]
                  },
                  {
                    name: 'layer',
                    snippet: 'this.layer',
                    description: 'Layer index of this object within its parent timeline (setting this moves layers).'
                  },
                  {
                    name: 'getLayerNumber',
                    snippet: 'this.getLayerNumber()',
                    description: 'Returns the current layer index.',
                    returns: [{ type: 'number' }]
                  },
                  {
                    name: 'moveToLayer',
                    snippet: 'this.moveToLayer(n)',
                    description: 'Moves this object to another layer at the current playhead position.',
                    param: [{ name: 'n', type: 'number' }]
                  },
                  {
                    name: 'addAPIFunction',
                    snippet: 'this.addAPIFunction(["functionName"], [() => {}])',
                    description: 'Adds custom functions to any instance of a class derived from Wick.Base.',
                    param: [{ name: '["functionName"]', type: 'array' }, { name: '[() => {}]', type: 'array'}]
                  }
            ]
        );
    }

    get soundReference() {
        return (
            [
                {
                    name: 'playSound',
                    snippet: 'playSound("sound.mp3")',
                    description: 'Plays a sound in the asset library.',
                },
                {
                    name: 'stopAllSounds',
                    snippet: 'stopAllSounds()',
                    description: 'Stops all currently playing sounds.',
                },
                {
                    name: 'WickSound (constructor)',
                    snippet: 'let sound = new WickSound("sound.mp3")',
                    description: 'Creates a controllable sound from an asset in the library.'
                },
                {
                    name: 'play',
                    snippet: 'sound.play()',
                    description: 'Starts playback; resumes from the last paused/seeked position if already started.'
                },
                {
                    name: 'pause',
                    snippet: 'sound.pause()',
                    description: 'Pauses playback and remembers the current position.'
                },
                {
                    name: 'stop',
                    snippet: 'sound.stop()',
                    description: 'Stops playback and resets the position to the beginning (0s).'
                },
                {
                    name: 'volume',
                    snippet: 'sound.volume(0.5)',
                    description: 'Sets (0–1) or gets the volume when called without arguments.',
                    param: [{ name: 'value', type: 'number (optional)' }],
                    returns: [{ type: 'number', description: 'Current volume when no value is provided.' }]
                },
                {
                    name: 'rate',
                    snippet: 'sound.rate(1.25)',
                    description: 'Sets playback speed (clamped ~0.01 to 10) or gets it when called without arguments.',
                    param: [{ name: 'value', type: 'number (optional)' }],
                    returns: [{ type: 'number', description: 'Current rate when no value is provided.' }]
                },
                {
                    name: 'stereo (pan)',
                    snippet: 'sound.stereo(-0.4)',
                    description: 'Sets pan (-1 left … +1 right) or gets it when called without arguments.',
                    param: [{ name: 'value', type: 'number (optional)' }],
                    returns: [{ type: 'number', description: 'Current pan when no value is provided.' }]
                },
                {
                    name: 'seek',
                    snippet: 'sound.seek(2.0)',
                    description: 'Sets or gets the current playback position in seconds (clamped 0–duration).',
                    param: [{ name: 'seconds', type: 'number (optional)' }],
                    returns: [{ type: 'number', description: 'Current position when no value is provided.' }]
                },
                {
                    name: 'currently',
                    snippet: 'sound.currently()',
                    description: 'Returns the current playback position in seconds.',
                    returns: [{ type: 'number' }]
                },
                {
                    name: 'duration',
                    snippet: 'sound.duration()',
                    description: 'Returns the total duration of the sound in seconds.',
                    returns: [{ type: 'number' }]
                },
                {
                    name: 'loop',
                    snippet: 'sound.loop(true)',
                    description: 'Enable/disable looping. Returns current loop state when called without arguments.',
                    param: [{ name: 'loop', type: 'boolean (optional)' }],
                    returns: [{ type: 'boolean', description: 'Current loop state when no value is provided.' }]
                },
                {
                    name: 'setLoopRange',
                    snippet: 'sound.setLoopRange(1.0, 3.5)',
                    description: 'Sets a custom loop segment in seconds; use with updateLoop() while playing.',
                    param: [{ name: 'low', type: 'number' }, { name: 'high', type: 'number' }]
                },
                {
                    name: 'updateLoop',
                    snippet: 'sound.updateLoop()',
                    description: 'Keeps playback within the custom loop range (call regularly if a custom range is set).'
                },
                {
                    name: 'mute',
                    snippet: 'sound.mute()',
                    description: 'Mutes the sound (remembers previous volume).'
                },
                {
                    name: 'unmute',
                    snippet: 'sound.unmute()',
                    description: 'Restores the volume saved by mute().'
                },
                {
                    name: 'isPlaying',
                    snippet: 'sound.isPlaying()',
                    description: 'Returns true if the sound is currently playing.',
                    returns: [{ type: 'boolean' }]
                },
                {
                    name: 'getHowl',
                    snippet: 'sound.getHowl()',
                    description: 'Returns the underlying Howl instance for advanced control.',
                    returns: [{ type: 'object', description: 'Howl' }]
                }
            ]
        )
    }

    get projectReference() {
        return (
            [
                {
                    name: 'project.width',
                    snippet: 'project.width',
                    description: 'The width of the project canvas.',
                },
                {
                    name: 'project.height',
                    snippet: 'project.height',
                    description: 'The height of the project canvas.',
                },
                {
                    name: 'project.framerate',
                    snippet: 'project.framerate',
                    description: 'The framerate of the project.',
                },
                {
                    name: 'project.hitTestOptions',
                    snippet: 'project.hitTestOptions',
                    description: 'The current hit test options.',
                },
                {
                    name: 'hitTestOptions',
                    snippet: 'hitTestOptions({mode: "CIRCLE", offset: true, overlap: true, intersections: true})',
                    description: 'Sets global settings for hit testing, project.hitTestOptions.',
                    param: [{name: 'that', type: 'object'}],
                },
            ]
        )
    }

    get randomReference() {
        return (
            [
                {
                    name: 'random.integer',
                    snippet: 'random.integer(1, 10)',
                    description: 'Returns a random whole number between a minimum and maximum.',
                },
                {
                    name: 'random.float',
                    snippet: 'random.float(0, 1)',
                    description: 'Returns a random decimal number between a minimum and maximum.',
                },
                {
                    name: 'random.choice',
                    snippet: 'random.choice(array)',
                    description: 'Returns a random item in the given array.',
                },
            ]
        )
    }


    get inputReference() {
        return (
            [
                {
                    name: 'mouseX',
                    snippet: 'mouseX',
                    description: 'The x position of the mouse on the screen.',
                },
                {
                    name: 'mouseY',
                    snippet: 'mouseY',
                    description: 'The y position of the mouse on the screen.',
                },
                {
                    name: 'mouseMoveX',
                    snippet: 'mouseMoveX',
                    description: 'The amount the mouse moved on the x-axis in the last tick.',
                },
                {
                    name: 'mouseMoveY',
                    snippet: 'mouseMoveY',
                    description: 'The amount the mouse moved on the y-axis in the last tick.',
                },
                {
                    name: 'key',
                    snippet: 'key',
                    description: 'The last key pressed.',
                },
                {
                    name: 'keys',
                    snippet: 'keys',
                    description: 'An array of all keys which are currently pressed down.',
                },
                {
                    name: 'isMouseDown',
                    snippet: 'isMouseDown()',
                    description: 'True if the mouse is currently pressed down.',
                },
                {
                    name: 'isKeyDown',
                    snippet: 'isKeyDown("a")',
                    description: 'Returns true if the given key is currently down.',
                    param: [{ name: 'key', type: '{string}' }],
                    returns: [{ type: 'bool', description: 'True if passed key is down.' }],
                },
                {
                    name: 'isKeyJustPressed',
                    snippet: 'isKeyJustPressed("a")',
                    description: 'Returns true if the given key was pressed within the last tick.',
                    param: [{ name: 'key', type: '{string}' }],
                    returns: [{ type: 'bool', description: 'True if passed key was pressed in the last frame.' }],
                },
                {
                    name: 'if (key)',
                    snippet: 'if (key === "a" ) {\n // Add your code here. \n}\n',
                    description: 'Runs if the last key pressed is equal to the letter, or symbol, tested in the condition.',
                },
                {
                    name: 'hideCursor',
                    snippet: 'hideCursor()',
                    description: 'Hides the cursor.',
                },
                {
                    name: 'showCursor',
                    snippet: 'showCursor()',
                    description: 'Un-hides the cursor.',
                },
            ]
        );
    }

    get eventReference() {
        let events = []
        let descriptions = this.scriptDescriptions;

        Object.keys(descriptions).forEach((key) => {
            if (key !== 'default') {
                events.push({
                    name: key,
                    snippet: "onEvent('<EVENT_FN>', function () {\n  //Add code here!\n});".replace('<EVENT_FN>', key),
                    description: descriptions[key],
                });
            }
        });

        return events;
    }
}

export default ScriptInfoInterface;
