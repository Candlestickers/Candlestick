const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup({ failDecode = false, failAllocation = false } = {}) {
    const stats = { decodes: 0, allocations: 0, closes: 0 };
    const makeBuffer = data => ({
        numberOfChannels: data.length, length: data[0].length,
        duration: data[0].length / 4, getChannelData: channel => data[channel],
    });
    class AudioContext {
        sampleRate = 4;
        createBuffer(channels, length) {
            stats.allocations++;
            if (failAllocation) throw new Error('allocation failed');
            return makeBuffer(Array.from({ length: channels }, () => new Float32Array(length)));
        }
        decodeAudioData(data, success, failure) {
            stats.decodes++;
            if (failDecode) failure(new Error('decode failed'));
            else success(makeBuffer(data));
        }
        async close() { stats.closes++; }
    }
    const context = { Wick: {}, window: { AudioContext }, console,
        Base64ArrayBuffer: { decode: src => JSON.parse(Buffer.from(src, 'base64').toString()).map(values => new Float32Array(values)) } };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../src/export/audio/AudioTrack.js'), 'utf8'), context);
    return { Track: context.Wick.AudioTrack, stats };
}
const sound = (options = {}) => ({ src: 'data,' + Buffer.from('[[1,2,3,4]]').toString('base64'), start: 0, end: 1000, ...options });
async function render(Track, sounds, progress) {
    let result;
    await Track.generateProjectAudioBuffer(sounds, buffer => { result = buffer; }, progress);
    return result;
}
const samples = (buffer, channel = 0) => Array.from(buffer.getChannelData(channel));

test('reuses decoded sounds and allocates only one mix buffer for 100 occurrences', async () => {
    const { Track, stats } = setup();
    const result = await render(Track, Array.from({length: 100}, (_, i) => sound({start: i * 1000, end: (i + 1) * 1000})));
    assert.equal(result.length, 400);
    assert.deepEqual(samples(result).slice(-4), [1,2,3,4]);
    assert.deepEqual(stats, { decodes: 1, allocations: 1, closes: 1 });
});
test('mixes overlaps, stereo, default gain, fractional gain, and zero volume', async () => {
    const { Track } = setup();
    const result = await render(Track, [sound(), sound({ volume: 0 }),
        sound({ src: 'data,' + Buffer.from('[[2,4,6,8],[8,6,4,2]]').toString('base64'), start: 500, end: 1500, volume: 0.5 })]);
    assert.deepEqual(samples(result), [1,2,4,6,3,4]);
    assert.deepEqual(samples(result, 1), [0,0,4,3,2,1]);
});
test('preserves positive offsets and leaves silence beyond the source', async () => {
    const { Track } = setup();
    assert.deepEqual(samples(await render(Track, [sound({offset: 500, end: 1500})])), [3,4,0,0,0,0]);
});
test('preserves negative offsets and clips at the original source duration', async () => {
    const { Track } = setup();
    assert.deepEqual(samples(await render(Track, [sound({offset: -250, end: 1500})])), [0,1,2,3,0,0]);
});
test('crops clips and preserves a delayed start', async () => {
    const { Track } = setup();
    assert.deepEqual(samples(await render(Track, [sound({start: 500, end: 1000})])), [0,0,1,2]);
});
test('empty audio does not allocate a context or buffer', async () => {
    const { Track, stats } = setup();
    assert.equal(await render(Track, []), null);
    assert.deepEqual(stats, {decodes: 0, allocations: 0, closes: 0});
});
for (const mode of ['failDecode', 'failAllocation']) {
    test(`closes context on ${mode} and does not report success`, async () => {
        const { Track, stats } = setup({[mode]: true});
        let completed = false;
        await assert.rejects(Track.generateProjectAudioBuffer([sound()], () => { completed = true; }));
        assert.equal(stats.closes, 1);
        assert.equal(completed, false);
    });
}
test('closes context if progress throws', async () => {
    const { Track, stats } = setup();
    await assert.rejects(render(Track, [sound()], () => {throw new Error('progress failed');}));
    assert.equal(stats.closes, 1);
});
test('callback API forwards decode failures after closing its context', async () => {
    const { Track, stats } = setup({failDecode: true});
    await new Promise((resolve, reject) => new Track({}).toAudioBuffer({
        soundInfo: [sound()], callback: () => reject(new Error('unexpected success')),
        onError: error => { try { assert.match(error.message, /decode failed/); assert.equal(stats.closes, 1); resolve(); } catch (e) { reject(e); } },
    }));
});
