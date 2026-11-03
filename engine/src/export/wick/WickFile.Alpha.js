/*
 * Utility class to convert Pre 1.0.9a projects into the most recent format
 */
export default class WickFileAlpha {
    /**
     * Convert the old recursive format to the new flat format.
     */
    static convertJsonProject (projectJSON) {
        var newProjectJSON = projectJSON;
        newProjectJSON.pan = {x: 0, y: 0};
        newProjectJSON.zoom = 1;
        var newProjectObjects = {};

        WickFileAlpha.flattenWickObject(projectJSON, null, newProjectObjects);

        return {
            project: newProjectJSON,
            objects: newProjectObjects,
        };
    }

    static flattenWickObject (objectJSON, parentJSON, objects) {
        objectJSON.children = [];
        if(parentJSON) parentJSON.children.push(objectJSON.uuid);
        objects[objectJSON.uuid] = objectJSON;

        if(objectJSON.root) {
            objectJSON.focus = objectJSON.root.uuid;
            WickFileAlpha.flattenWickObject(objectJSON.root, objectJSON, objects);
            delete objectJSON.root;
        }
        if(objectJSON.assets) {
            objectJSON.assets.forEach(asset => {
                WickFileAlpha.flattenWickObject(asset, objectJSON, objects);
            });
            delete objectJSON.assets;
        }
        if(objectJSON.selection) {
            objectJSON.selection.widgetRotation = 0;
            objectJSON.selection.pivotPoint = {x:0, y:0};
            WickFileAlpha.flattenWickObject(objectJSON.selection, objectJSON, objects);
            delete objectJSON.selection;
        }
        if(objectJSON.transform) {
            objectJSON.transformation = {
                x: objectJSON.transform.x,
                y: objectJSON.transform.y,
                scaleX: objectJSON.transform.scaleX,
                scaleY: objectJSON.transform.scaleY,
                rotation: objectJSON.transform.rotation,
                opacity: objectJSON.transform.opacity,
            }
            delete objectJSON.transform;
        }
        if(objectJSON.timeline) {
            WickFileAlpha.flattenWickObject(objectJSON.timeline, objectJSON, objects);
            delete objectJSON.timeline;
        }
        if(objectJSON.layers) {
            objectJSON.layers.forEach(layer => {
                WickFileAlpha.flattenWickObject(layer, objectJSON, objects);
            });
            delete objectJSON.layers;
        }
        if(objectJSON.frames) {
            objectJSON.frames.forEach(frame => {
                WickFileAlpha.flattenWickObject(frame, objectJSON, objects);
            });
            delete objectJSON.frames;
        }
        if(objectJSON.clips) {
            objectJSON.clips.forEach(clip => {
                WickFileAlpha.flattenWickObject(clip, objectJSON, objects);
            });
            delete objectJSON.clips;
        }
        if(objectJSON.paths) {
            objectJSON.paths.forEach(path => {
                WickFileAlpha.flattenWickObject(path, objectJSON, objects);
            });
            delete objectJSON.paths;
        }
        if(objectJSON.tweens) {
            objectJSON.tweens.forEach(tween => {
                WickFileAlpha.flattenWickObject(tween, objectJSON, objects);
            });
            delete objectJSON.tweens;
        }
        if(objectJSON.pathJSON) {
            objectJSON.json = objectJSON.pathJSON;
            delete objectJSON.pathJSON;
        }
    }
}
