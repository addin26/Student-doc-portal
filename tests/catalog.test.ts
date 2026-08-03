import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatBytes,
  mapCatalogResource,
  normalizeFileType,
  searchInputFromUrl,
} from '../lib/catalog';

test('search parameters are normalized and bounded', () => {
  const input = searchInputFromUrl(
    new URLSearchParams({ q: '  ACC-401  ', sort: 'downloads', page: '2', pageSize: '24' }),
  );

  assert.deepEqual(input, {
    query: 'ACC-401',
    universityId: undefined,
    courseId: undefined,
    categoryId: undefined,
    fileType: undefined,
    sort: 'downloads',
    page: 2,
    pageSize: 24,
  });
});

test('invalid identifiers are rejected before reaching SQL', () => {
  assert.throws(() => searchInputFromUrl(new URLSearchParams({ university: 'not-a-uuid' })));
});

test('catalog rows map into the existing public card contract', () => {
  const resource = mapCatalogResource({
    id: '82528c7f-80b5-4cc7-8299-544cf3378364',
    title: 'Accounting 401',
    description: 'Revision notes',
    file_type: 'pptx',
    size_bytes: 1536,
    created_at: '2026-08-03T00:00:00Z',
    universities: { name: 'Example University', short: 'EU' },
    courses: { code: 'ACC-401', title: 'Advanced Accounting' },
    profiles: { full_name: 'Student User', avatar: 'SU', verified: true },
    tags: ['accounting'],
    ai_topics: ['finance'],
    ai_status: 'completed',
  });

  assert.equal(resource.fileType, 'ppt');
  assert.equal(resource.fileSize, '1.5 KB');
  assert.equal(resource.courseCode, 'ACC-401');
  assert.equal(resource.universityShort, 'EU');
  assert.equal(resource.uploaderVerified, true);
  assert.deepEqual(resource.aiTopics, ['finance']);
});

test('file metadata fallbacks remain deterministic', () => {
  assert.equal(normalizeFileType('unknown'), 'pdf');
  assert.equal(formatBytes(null, '24.6 MB'), '24.6 MB');
});
