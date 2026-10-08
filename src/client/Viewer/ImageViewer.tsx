'use client'

import React from 'react'

import type { ImageViewerProps } from '@/shared/types/index.js'

export const ImageViewer: React.FC<ImageViewerProps> = ({ alt = 'Image preview', className, src }) => {
  return (
    <img
      alt={alt}
      className={className ? `media-preview-viewer__media ${className}` : 'media-preview-viewer__media'}
      src={src}
    />
  )
}
