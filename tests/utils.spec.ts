import type { Field } from 'payload'

import { describe, expect, it } from 'vitest'

import { GOOGLE_VIEWER_MAX_SIZE, MICROSOFT_VIEWER_MAX_SIZE } from '../src/components/MediaPreview.constants.js'
import {
  canPreviewDocument,
  getDocumentViewerType,
  getGoogleViewerUrl,
  getMicrosoftViewerUrl,
  getPreviewType,
} from '../src/components/MediaPreview.utils.js'
import { insertField } from '../src/utils/insertField.js'

// Preview type detection

describe('getPreviewType', () => {
  it.each([
    ['video/mp4', 'video'],
    ['video/webm', 'video'],
    ['video/quicktime', 'video'],
    ['audio/mpeg', 'audio'],
    ['audio/ogg', 'audio'],
    ['audio/wav', 'audio'],
    ['image/jpeg', 'image'],
    ['image/png', 'image'],
    ['image/webp', 'image'],
    ['image/svg+xml', 'image'],
    ['application/pdf', 'document'],
    ['text/plain', 'document'],
    ['application/msword', 'document'],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'document'],
    ['application/vnd.ms-excel', 'document'],
    ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'document'],
  ])('%s → %s', (mime, expected) => {
    expect(getPreviewType(mime)).toBe(expected)
  })

  it.each([
    'application/octet-stream',
    'application/zip',
    undefined,
  ])('%s → unsupported', (mime) => {
    expect(getPreviewType(mime)).toBe('unsupported')
  })
})

// Document preview

describe('canPreviewDocument', () => {
  it('allows undefined or within Google limit', () => {
    expect(canPreviewDocument('application/pdf', undefined)).toBe(true)
    expect(canPreviewDocument('application/pdf', 1024)).toBe(true)
    expect(canPreviewDocument('application/pdf', GOOGLE_VIEWER_MAX_SIZE)).toBe(true)
  })

  it('rejects over Google limit', () => {
    expect(canPreviewDocument('application/pdf', GOOGLE_VIEWER_MAX_SIZE + 1)).toBe(false)
  })

  it('allows within Microsoft limit', () => {
    expect(canPreviewDocument('application/msword', undefined)).toBe(true)
    expect(canPreviewDocument('application/msword', 1024)).toBe(true)
    expect(canPreviewDocument('application/msword', MICROSOFT_VIEWER_MAX_SIZE)).toBe(true)
  })

  it('rejects over Microsoft limit', () => {
    expect(canPreviewDocument('application/msword', MICROSOFT_VIEWER_MAX_SIZE + 1)).toBe(false)
  })
})

describe('getDocumentViewerType', () => {
  it.each([
    ['application/msword', 'microsoft'],
    ['application/vnd.ms-excel', 'microsoft'],
    ['application/pdf', 'google'],
    ['text/plain', 'google'],
  ])('%s → %s', (mime, expected) => {
    expect(getDocumentViewerType(mime)).toBe(expected)
  })
})

// Viewer URLs

describe('viewer URLs', () => {
  it('getGoogleViewerUrl', () => {
    expect(getGoogleViewerUrl('https://example.com/doc.pdf'))
      .toBe('https://docs.google.com/viewer?url=https%3A%2F%2Fexample.com%2Fdoc.pdf&embedded=true')
  })

  it('getMicrosoftViewerUrl', () => {
    expect(getMicrosoftViewerUrl('https://example.com/doc.docx'))
      .toBe('https://view.officeapps.live.com/op/embed.aspx?src=https%3A%2F%2Fexample.com%2Fdoc.docx')
  })
})

// insertField

describe('insertField', () => {
  const field: Field = { name: 'test', type: 'text' }
  const fields: Field[] = [
    { name: 'first', type: 'text' },
    { name: 'second', type: 'text' },
    { name: 'third', type: 'text' },
  ]

  const getName = (f: Field) => ('name' in f ? f.name : undefined)

  it('"first" inserts at beginning', () => {
    const result = insertField(fields, 'first', field)
    expect(getName(result[0])).toBe('test')
    expect(result).toHaveLength(4)
  })

  it('"last" inserts at end', () => {
    const result = insertField(fields, 'last', field)
    expect(getName(result.at(-1)!)).toBe('test')
    expect(result).toHaveLength(4)
  })

  it('{ after: "first" } inserts after target', () => {
    const result = insertField(fields, { after: 'first' }, field)
    expect(result.map(getName)).toEqual(['first', 'test', 'second', 'third'])
  })

  it('{ before: "third" } inserts before target', () => {
    const result = insertField(fields, { before: 'third' }, field)
    expect(result.map(getName)).toEqual(['first', 'second', 'test', 'third'])
  })

  it('returns unchanged if target not found', () => {
    const result = insertField(fields, { after: 'nonexistent' }, field)
    expect(result).toHaveLength(3)
  })

  it('handles nested fields with dot notation', () => {
    const nested: Field[] = [
      {
        name: 'group',
        type: 'group',
        fields: [
          { name: 'nested1', type: 'text' },
          { name: 'nested2', type: 'text' },
        ],
      },
    ]

    const result = insertField(nested, { after: 'group.nested1' }, field)
    const group = result[0] as { fields: Field[] } & Field
    expect(group.fields.map(getName)).toEqual(['nested1', 'test', 'nested2'])
  })
})
