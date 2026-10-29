#!/usr/bin/env node
/**
 * Guard the results/chest cue against accidental trims or re-exports.
 *
 * The celebration is deliberately exactly five seconds: long enough to land
 * the win, short enough to leave the results screen responsive. This reads the
 * WAV header directly, so it needs no audio dependency and runs anywhere Node
 * runs (CI included).
 *
 * Usage:
 *   node scripts/check-celebration-duration.cjs [path/to/celebration.wav]
 *
 * Defaults to assets/audio/celebration.wav and exits 1 on any mismatch.
 */

'use strict';

/* global __dirname -- Node provides this to CommonJS scripts. */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_FILE = path.join(ROOT, 'assets', 'audio', 'celebration.wav');
const EXPECTED_SECONDS = 5;

function fail(message) {
  console.error(`[FAIL] ${message}`);
  process.exitCode = 1;
}

function readChunks(buffer) {
  if (buffer.length < 12) throw new Error('file is too short to be a WAV');
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') throw new Error('missing RIFF header');
  if (buffer.toString('ascii', 8, 12) !== 'WAVE') throw new Error('not a WAVE file');

  const chunks = [];
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + size;
    if (end > buffer.length) {
      throw new Error(`truncated "${id}" chunk (declares ${size} bytes, only ${buffer.length - start} remain)`);
    }
    chunks.push({ id, start, size });
    // RIFF chunks are word-aligned; odd-sized payloads carry one pad byte.
    offset = end + (size % 2);
  }
  return chunks;
}

function check(file) {
  let buffer;
  try {
    buffer = fs.readFileSync(file);
  } catch (error) {
    fail(`cannot read ${path.relative(ROOT, file) || file}: ${error.message}`);
    return;
  }

  let chunks;
  try {
    chunks = readChunks(buffer);
  } catch (error) {
    fail(`${path.relative(ROOT, file)}: ${error.message}`);
    return;
  }

  const fmt = chunks.find((chunk) => chunk.id === 'fmt ');
  const data = chunks.find((chunk) => chunk.id === 'data');
  if (!fmt || fmt.size < 16) {
    fail(`${path.relative(ROOT, file)}: missing a usable "fmt " chunk`);
    return;
  }
  if (!data) {
    fail(`${path.relative(ROOT, file)}: missing the "data" chunk`);
    return;
  }

  const channels = buffer.readUInt16LE(fmt.start + 2);
  const sampleRate = buffer.readUInt32LE(fmt.start + 4);
  const byteRate = buffer.readUInt32LE(fmt.start + 8);
  const blockAlign = buffer.readUInt16LE(fmt.start + 12);
  const bitsPerSample = buffer.readUInt16LE(fmt.start + 14);

  if (!channels || !sampleRate || !byteRate || !blockAlign) {
    fail(`${path.relative(ROOT, file)}: invalid channel/rate/alignment fields`);
    return;
  }
  if (byteRate !== sampleRate * blockAlign) {
    fail(`${path.relative(ROOT, file)}: inconsistent byte rate (${byteRate} vs ${sampleRate * blockAlign})`);
    return;
  }
  if (data.size % blockAlign !== 0) {
    fail(`${path.relative(ROOT, file)}: data chunk is not a whole number of frames`);
    return;
  }

  const frames = data.size / blockAlign;
  const duration = frames / sampleRate;
  const expectedFrames = sampleRate * EXPECTED_SECONDS;

  if (frames !== expectedFrames) {
    fail(
      `celebration cue is ${duration.toFixed(5)}s (${frames.toLocaleString('en-US')} frames @ ${sampleRate} Hz), ` +
        `expected exactly ${EXPECTED_SECONDS.toFixed(3)}s (${expectedFrames.toLocaleString('en-US')} frames).\n` +
        `       Regenerate it with: python scripts/prepare-celebration.py "<applause source>"`
    );
    return;
  }

  console.log(
    `[ok] celebration cue is ${duration.toFixed(3)}s — ${frames.toLocaleString('en-US')} frames @ ` +
      `${sampleRate} Hz, ${channels} ch, ${bitsPerSample} bit`
  );
}

const target = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : DEFAULT_FILE;
check(target);
