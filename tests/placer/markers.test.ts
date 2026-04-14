import { describe, it, expect } from 'vitest';
import { extractMarkedSections, mergeWithMarkers } from '../../src/placer/markers.js';

describe('extractMarkedSections', () => {
  it('extracts marked sections', () => {
    const content = `before
<!-- slaminar:begin:overview -->
## Overview
hello world
<!-- slaminar:end:overview -->
after`;
    const sections = extractMarkedSections(content);
    expect(sections.size).toBe(1);
    expect(sections.get('overview')).toContain('hello world');
  });

  it('extracts multiple sections', () => {
    const content = `<!-- slaminar:begin:a -->A<!-- slaminar:end:a -->
middle
<!-- slaminar:begin:b -->B<!-- slaminar:end:b -->`;
    const sections = extractMarkedSections(content);
    expect(sections.size).toBe(2);
  });

  it('returns empty for no markers', () => {
    expect(extractMarkedSections('plain text')).toEqual(new Map());
  });
});

describe('mergeWithMarkers', () => {
  it('updates existing marked sections', () => {
    const existing = `# My Doc
<!-- slaminar:begin:commands -->
old commands
<!-- slaminar:end:commands -->
## My Custom Section
user content`;

    const generated = `<!-- slaminar:begin:commands -->
new commands
<!-- slaminar:end:commands -->`;

    const merged = mergeWithMarkers(existing, generated);
    expect(merged).toContain('new commands');
    expect(merged).not.toContain('old commands');
    expect(merged).toContain('user content');
    expect(merged).toContain('My Custom Section');
  });

  it('appends new sections not in existing', () => {
    const existing = `# Doc
some user content`;

    const generated = `<!-- slaminar:begin:overview -->
new section
<!-- slaminar:end:overview -->`;

    const merged = mergeWithMarkers(existing, generated);
    expect(merged).toContain('user content');
    expect(merged).toContain('new section');
    expect(merged).toContain('slaminar:begin:overview');
  });

  it('preserves user content outside all markers', () => {
    const existing = `user header
<!-- slaminar:begin:a -->old a<!-- slaminar:end:a -->
user middle
<!-- slaminar:begin:b -->old b<!-- slaminar:end:b -->
user footer`;

    const generated = `<!-- slaminar:begin:a -->new a<!-- slaminar:end:a -->
<!-- slaminar:begin:b -->new b<!-- slaminar:end:b -->`;

    const merged = mergeWithMarkers(existing, generated);
    expect(merged).toContain('user header');
    expect(merged).toContain('user middle');
    expect(merged).toContain('user footer');
    expect(merged).toContain('new a');
    expect(merged).toContain('new b');
  });
});
