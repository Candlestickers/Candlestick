const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../../src/base/Project.js'), 'utf8');
const method = source.slice(source.indexOf('    generateImageSequence (args)'), source.indexOf('    resetSoundsPlayed ()'));
function setup(count, nullBlob = false) {
    const stats = {captures: 0, restores: 0, removes: 0, images: 0};
    const timeline = {length: count, playheadPosition: 1};
    const originalContainer = {};
    const context = {console, window: {devicePixelRatio: 1, document: {
        createElement: () => ({style: {}}), body: {appendChild() {}, removeChild() {stats.removes++;}},
    }}, Image: class {constructor() {stats.images++;} set src(value) {this.value = value; queueMicrotask(() => this.onload());}}};
    const project = vm.runInNewContext('({' + method + '})', context);
    Object.assign(project, {width: 100, height: 100, root: {timeline}, activeTimeline: timeline,
        history: {saveSnapshot() {}, loadSnapshot() {stats.restores++;}}, mute() {}, selection: {clear() {}},
        resetSoundsPlayed() {}, tick() {}, view: {canvasContainer: originalContainer, resize() {}, render() {},
            paper: {view: {autoUpdate: true, update() {}}}, canvas: {
                toBlob(callback) {stats.captures++; queueMicrotask(() => callback(nullBlob ? null : {frame: timeline.playheadPosition}));},
                toDataURL() {return 'data:image/png;base64,AA==';},
            }},
    });
    return {project, stats, originalContainer};
}
test('865 frames stream in order without creating Images or retaining a frame array', async () => {
    const {project, stats} = setup(865);
    let consumed = 0;
    await new Promise((resolve, reject) => project.generateImageSequence({
        onFrame: async blob => {assert.equal(blob.frame, ++consumed);}, onError: reject,
        onFinish: frames => {try {assert.equal(frames.length, 0); resolve();} catch(e) {reject(e);}},
    }));
    assert.equal(consumed, 865);
    assert.equal(stats.images, 0);
    assert.equal(stats.restores, 1);
});
test('waits for the frame consumer before capturing the next frame', async () => {
    const {project, stats} = setup(2);
    let release;
    const blocked = new Promise(resolve => {release = resolve;});
    const done = new Promise((resolve, reject) => project.generateImageSequence({
        onFrame: () => blocked, onFinish: resolve, onError: reject,
    }));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(stats.captures, 1);
    release(); await done;
    assert.equal(stats.captures, 2);
});
for (const failure of ['consumer', 'capture']) {
    test(`restores project after ${failure} failure`, async () => {
        const {project, stats, originalContainer} = setup(3, failure === 'capture');
        await assert.rejects(new Promise((resolve, reject) => project.generateImageSequence({
            onFrame: async () => {throw new Error('write failed');}, onFinish: resolve, onError: reject,
        })));
        assert.equal(stats.restores, 1);
        assert.equal(stats.removes, 1);
        assert.equal(project.view.canvasContainer, originalContainer);
        assert.equal(project.view.paper.view.autoUpdate, true);
    });
}
test('legacy image consumers still receive all Images', async () => {
    const {project, stats} = setup(3);
    const images = await new Promise(resolve => project.generateImageSequence({onFinish: resolve}));
    assert.equal(images.length, 3);
    assert.equal(stats.images, 3);
    assert.equal(stats.restores, 1);
});
