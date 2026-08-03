import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fileExtension,
  isAllowedUploadPair,
  keyBelongsToUser,
  resourceFileType,
} from '../lib/upload-policy';

test('upload policy binds content type to extension', () => {
  assert.equal(isAllowedUploadPair('lecture.pdf', 'application/pdf'), true);
  assert.equal(isAllowedUploadPair('lecture.exe', 'application/pdf'), false);
  assert.equal(isAllowedUploadPair('slides.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'), true);
});

test('storage keys remain scoped to the authenticated user', () => {
  const userId = '82528c7f-80b5-4cc7-8299-544cf3378364';
  assert.equal(keyBelongsToUser(`resources/${userId}/file.pdf`, userId), true);
  assert.equal(keyBelongsToUser(`resources/another-user/file.pdf`, userId), false);
  assert.equal(keyBelongsToUser(`resources/${userId}/../other/file.pdf`, userId), false);
});

test('file helpers normalize extensions and display types', () => {
  assert.equal(fileExtension('  Notes.Final.PDF  '), 'pdf');
  assert.equal(resourceFileType('slides.pptx'), 'ppt');
  assert.equal(resourceFileType('photo.webp'), 'img');
});
