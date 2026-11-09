/*
 * Copyright 2020 WICKLETS LLC
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

Wick.AudioTrack = class {
    /**
     * @type {Wick.Project}
     */
    get project () {
        return this._project;
    }

    set project (project) {
        this._project = project;
    }

    /**
     * Create a new AudioTrack
     * @param {Wick.Project} project - the project to use audio from
     */
    constructor (project) {
        this._project = project;
    }

    /**
     * Generate an AudioBuffer of all the project's sounds as one audio track.
     * Can take sound information from a generated sequence.
     * @param {Object} args - callback, onProgress, soundInfo
     */
    toAudioBuffer (args) {
        if (!args) args = {}; 
        if (!args.callback) args.callback = () => {}
        if (!args.onProgress) args.onProgress = (frame, maxFrames) => {}

        let genBuffer = (audioInfo) => {
            if (!audioInfo || audioInfo.length === 0) {
                // No audio in the project, no AudioBuffer to create
                args.callback(null);
                return;
            }

            Wick.AudioTrack.generateProjectAudioBuffer(audioInfo, audioArraybuffer => {
                args.callback(audioArraybuffer);
            },
            args.onProgress).catch(args.onError || console.error);
        }

        // If audio information is passed in from a previous render, use that. Otherwise, render it again.
        if (args.soundInfo) {
            genBuffer(args.soundInfo);
        } else {
            this.project.generateAudioSequence({
                onFinish: genBuffer,
                onProgress: args.onProgress,
            });
        }
        
    }

    /**
     * Create an AudioBuffer from given sounds.
     * @param {object[]} projectAudioInfo - infor generated on sounds played in the project.
     * @param {Function} callback - callback to recieve the generated AudioBuffer
     * @param {Function} onProgress(message, progress) - A function which receive a message.
     */
    static async generateProjectAudioBuffer (projectAudioInfo, callback, onProgress) {
        if (!projectAudioInfo.length) {
            callback(null);
            return;
        }

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContextClass();
        const decoded = new Map();
        let output;
        try {
            let channels = 1;
            let length = 1;
            // Decode each asset once, sequentially, instead of once per occurrence.
            for (const info of projectAudioInfo) {
                if (!decoded.has(info.src)) {
                    const buffer = await new Promise((resolve, reject) => {
                        this.base64ToAudioBuffer(info.src, ctx, resolve, reject);
                    });
                    decoded.set(info.src, buffer);
                    channels = Math.max(channels, buffer.numberOfChannels);
                }
                const samples = Math.trunc((info.end - info.start) / 1000 * ctx.sampleRate);
                length = Math.max(length, Math.round(info.start / 1000 * ctx.sampleRate + samples));
            }

            // Mix straight into one final buffer: no shifted, cropped, gain,
            // silence-padded, or pairwise-merged copies for each occurrence.
            output = ctx.createBuffer(channels, length, ctx.sampleRate);
            for (let i = 0; i < projectAudioInfo.length; i++) {
                const info = projectAudioInfo[i];
                const buffer = decoded.get(info.src);
                const start = Math.trunc(info.start / 1000 * ctx.sampleRate);
                const samples = Math.trunc((info.end - info.start) / 1000 * ctx.sampleRate);
                const offsetSeconds = (info.offset || 0) / 1000;
                const offset = offsetSeconds < 0
                    ? -Math.round(-offsetSeconds * ctx.sampleRate)
                    : Math.round(offsetSeconds * ctx.sampleRate);
                const volume = Math.max(info.volume == null ? 1 : info.volume, 0);
                const first = Math.max(0, -offset, -start);
                const last = Math.min(samples, buffer.length, buffer.length - offset, output.length - start);
                for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
                    const source = buffer.getChannelData(channel);
                    const target = output.getChannelData(channel);
                    for (let sample = first; sample < last; sample++) {
                        const value = source[sample + offset] * volume;
                        if (Number.isFinite(value)) target[start + sample] += value;
                    }
                }
                onProgress && onProgress("Creating Audio " + (i + 1) + "/" + projectAudioInfo.length,
                    (i + 1) / projectAudioInfo.length);
            }
        } finally {
            decoded.clear();
            await ctx.close();
        }
        callback(output);
    }

    /*
     * Merges multiple audiobuffers into a single audiobuffer.
     * @param {AudioBuffer[]} buffers - the AudioBuffers to merge together
     * @param {AudioContext} ac - An AudioContext instance
     */
    static mergeBuffers(buffers, ac, onProgress) {
        // original function from:
        // https://github.com/meandavejustice/merge-audio-buffers/blob/master/index.js

        var maxChannels = 0;
        var maxDuration = 0;

        // Send back an empty buffer if no information was sent in.
        if (!buffers || (buffers && buffers.length === 0)) {
            return ac.createBuffer(
                2,
                1000,
                48000,
            )
        }

        // Review the incoming audio to determine output buffer size.
        for (let i = 0; i < buffers.length; i++) {
            onProgress("Reviewing Audio " + (i+1) + "/" + buffers.length, (i+1) + "/" + buffers.length)

            if (buffers[i].numberOfChannels > maxChannels) {
                maxChannels = buffers[i].numberOfChannels;
            }

            if (buffers[i].duration > maxDuration) {
                maxDuration = buffers[i].duration;
            }
        }

        // Create new output buffer.
        var out = ac.createBuffer(
            maxChannels,
            ac.sampleRate * maxDuration,
            ac.sampleRate
        );

        for (var i = 0; i < buffers.length; i++) {
            onProgress("Merging Audio " + (i+1) + "/" + buffers.length, (i+1) + "/" + buffers.length);

            // Go through each channel of the new audio source and copy that data into the output buffer.
            for (var srcChannel = 0; srcChannel < buffers[i].numberOfChannels; srcChannel++) {
                var outt = out.getChannelData(srcChannel);
                var inn = buffers[i].getChannelData(srcChannel);

                for (let j = 0; j < inn.length; j++) {
                    let val = inn[j];

                    // Some sounds may have corrupted data... don't copy that over.
                    if (val) {
                        outt[j] += val;
                    }
                }

                out.getChannelData(srcChannel).set(outt, 0);
            }
        }

        return out;
    }

    /**
     * Offsets an audio buffer by a number of seconds.
     * @param {audioBuffer} originalBuffer - Buffer to offset.
     * @param {Number} offsetSeconds - Number of seconds to offset. Can be negative.
     * @param {AudioContext} ctx - Context to use.
     * @returns {audioBuffer} - A copy of the audio buffer, offset by the provided number of seconds.
     */
    static offsetAudioBuffer(originalBuffer, offsetSeconds, ctx) {
        // Create a blank buffer with the length of the original buffer.
        var offsetBuffer = ctx.createBuffer(
            originalBuffer.numberOfChannels,
            originalBuffer.length,
            ctx.sampleRate,
        );

        let copyto = 0;
        let copyfrom = 0;

        if (offsetSeconds < 0) {
            // Fixes floating point errors
            copyto = Math.round((-1 * offsetSeconds) * ctx.sampleRate);
        } else {
            copyfrom = Math.round(offsetSeconds * ctx.sampleRate);
        }

        // Copy buffer information.
        for (var srcChannel = 0; srcChannel < offsetBuffer.numberOfChannels; srcChannel++) {
            // Retrieve sample data...
            var offsetBufferChannelData = offsetBuffer.getChannelData(srcChannel);
            var originalBufferChannelData = originalBuffer.getChannelData(srcChannel);

            // Copy samples from the original buffer to the adjusted buffer, adjusting for the number of seconds to offset.
            for (var i=0; i < offsetBufferChannelData.length; i++) {
                if ((i + copyfrom) > originalBufferChannelData.length) {
                    break;
                } else if ((i + copyto) > offsetBufferChannelData.length) {
                    break;
                } 
                offsetBufferChannelData[i + copyto] = originalBufferChannelData[i + copyfrom];
            }
            
            offsetBuffer.getChannelData(srcChannel).set(offsetBufferChannelData, 0);
        }

        return offsetBuffer;

    }

    /**
     * Crops an AudioBuffer to a given length.
     * @param {AudioBuffer} originalBuffer - the buffer to crop
     * @param {number} delaySeconds - the time, in seconds, to crop the sound at
     * @param {AudioContext} ctx - An AudioContext instance
     * @returns {AudioBuffer} - The a copy of the buffer, cropped to the specified length.
     */
    static cropAudioBuffer (originalBuffer, lengthSeconds, ctx) {
        // Create a blank buffer with a length of the crop amount
        var croppedBuffer = ctx.createBuffer(
            originalBuffer.numberOfChannels,
            ctx.sampleRate * lengthSeconds,
            ctx.sampleRate,
        );

        // Copy data from the original buffer into the cropped buffer
        for (var srcChannel = 0; srcChannel < croppedBuffer.numberOfChannels; srcChannel++) {
            // Retrieve sample data...
            var croppedBufferChannelData = croppedBuffer.getChannelData(srcChannel);
            var originalBufferChannelData = originalBuffer.getChannelData(srcChannel);

            // Copy samples from the original buffer to the cropped buffer
            for (var i = 0; i < croppedBufferChannelData.length; i++) {
                croppedBufferChannelData[i] = originalBufferChannelData[i];
            }
            croppedBuffer.getChannelData(srcChannel).set(croppedBufferChannelData, 0);
        }

        return croppedBuffer;
    }

    /**
     * Adjusts the volume of an audio buffer.
     * @param {*} originalBuffer - The original buffer to adjust.
     * @param {*} volume - A value between 0 and +Infinity. Values above 1 may cause clipping.
     * @param {*} ctx - The audio context to use for buffer generation.
     * @returns {AudioBuffer} - Adjusted audio buffer with new volume.
     */
    static adjustBufferVolume (originalBuffer, volume, ctx) {
        // Create a blank buffer with the length of the original buffer.
        var adjustedBuffer = ctx.createBuffer(
            originalBuffer.numberOfChannels,
            originalBuffer.length,
            ctx.sampleRate,
        );

        // Volume should be at least 0.
        volume = Math.max(volume, 0);

        for (var srcChannel = 0; srcChannel < adjustedBuffer.numberOfChannels; srcChannel++) {
            // Retrieve sample data...
            var adjustedBufferChannelData = adjustedBuffer.getChannelData(srcChannel);
            var originalBufferChannelData = originalBuffer.getChannelData(srcChannel);

            // Copy samples from the original buffer to the adjusted buffer, adjusting for volume.
            for (var i = 0; i < adjustedBufferChannelData.length; i++) {
                adjustedBufferChannelData[i] = originalBufferChannelData[i] * volume;
            }
            
            adjustedBuffer.getChannelData(srcChannel).set(adjustedBufferChannelData, 0);
        }

        return adjustedBuffer;
    }

    /**
     * Adds silence to the beginning of an AudioBuffer with a given length.
     * @param {AudioBuffer} originalBuffer - the buffer to pad with silence
     * @param {number} delaySeconds - the amount of time, in seconds, to delay the sound
     * @param {AudioContext} ctx - An AudioContext instance
     */
    static addStartDelayToAudioBuffer (originalBuffer, delaySeconds, ctx) {

        // Create buffer with a length equal to the original buffer's length plus the requested delay

        let lengthOfDelay = ctx.sampleRate * delaySeconds;
        let lengthOfOriginalSound = ctx.sampleRate * originalBuffer.duration;

        var delayedBuffer = ctx.createBuffer(
            originalBuffer.numberOfChannels,
            Math.round(lengthOfDelay + lengthOfOriginalSound),
            ctx.sampleRate,
        );

        // For each channel in the audiobuffer...
        for (var srcChannel = 0; srcChannel < originalBuffer.numberOfChannels; srcChannel++) {
            // Retrieve sample data...
            var originalBufferChannelData = originalBuffer.getChannelData(srcChannel);

            // Copy samples from the original buffer to the delayed buffer with an offset equal to the delay
            var delayOffset = ctx.sampleRate * delaySeconds;

            try {
                // Copy in the data from the original buffer into the delayed buffer, starting at the delayed position.
                delayedBuffer.getChannelData(srcChannel).set(originalBufferChannelData, delayOffset);
            } catch (e) {
                console.error(e);
                console.error("A sound was not added to the project.")
            }

        }

        return delayedBuffer;
    }

    /**
     * Convert a base64 string of an audio file into an AudioBuffer.
     * @param {string} base64 - a base64 dataURI of an audio file.
     * @param {AudioContext} ctx - an AudioContext instance.
     * @param {Function} callback - callback to recieve the generated AudioBuffer
     */
    static base64ToAudioBuffer (base64, ctx, callback, onError = console.error) {
        let base64DataOnly = base64.split(',')[1];
        let arraybuffer = Base64ArrayBuffer.decode(base64DataOnly);

        ctx.decodeAudioData(arraybuffer, function(audioBuffer) {
            callback(audioBuffer);
        }, onError);
    }
}
