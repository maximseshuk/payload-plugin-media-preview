'use client'

import type { ImageViewerProps } from '@/types.js'

import React from 'react'

export const ImageViewer: React.FC<ImageViewerProps> = ({ alt = 'Image preview', className, src }) => {
  return <img alt={alt} className={className} src={src} />
}
