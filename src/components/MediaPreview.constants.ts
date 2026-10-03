export const GOOGLE_VIEWER_MAX_SIZE = 25 * 1024 * 1024
export const MICROSOFT_VIEWER_MAX_SIZE = 10 * 1024 * 1024
export const TEXT_PREVIEW_MAX_SIZE = 1024 * 1024
export const DEFAULT_SIGNED_URL_EXPIRES_IN = 600

export const SIGN_URL_PATH = '/media-preview/url'
export const FILE_PATH = '/media-preview/file'

export const MICROSOFT_OFFICE_TYPES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]

export const GOOGLE_VIEWER_TYPES = [
  'application/vnd.apple.pages',
  'application/postscript',
  'image/vnd.adobe.photoshop',
  'image/vnd.dxf',
  'application/dxf',
  'application/vnd.ms-xpsdocument',
]

export const TEXT_TYPES = [
  'text/*',
  'application/json',
  'application/xml',
  'application/javascript',
  'application/x-javascript',
  'application/yaml',
  'application/x-yaml',
]

export const TEXT_EXTENSIONS = [
  'cjs',
  'conf',
  'css',
  'csv',
  'env',
  'ini',
  'js',
  'json',
  'jsx',
  'log',
  'md',
  'mjs',
  'py',
  'sh',
  'toml',
  'ts',
  'tsx',
  'txt',
  'xml',
  'yaml',
  'yml',
]

export const CODE_LANGUAGES: Record<string, string> = {
  'application/javascript': 'javascript',
  'application/json': 'json',
  'application/x-javascript': 'javascript',
  'application/x-yaml': 'yaml',
  'application/xml': 'xml',
  'application/yaml': 'yaml',
  'text/css': 'css',
  'text/html': 'html',
  'text/javascript': 'javascript',
  'text/markdown': 'markdown',
  'text/xml': 'xml',
  'text/yaml': 'yaml',
  cjs: 'javascript',
  conf: 'ini',
  css: 'css',
  env: 'ini',
  html: 'html',
  ini: 'ini',
  js: 'javascript',
  json: 'json',
  jsx: 'javascript',
  md: 'markdown',
  mjs: 'javascript',
  py: 'python',
  sh: 'shell',
  toml: 'ini',
  ts: 'typescript',
  tsx: 'typescript',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
}
