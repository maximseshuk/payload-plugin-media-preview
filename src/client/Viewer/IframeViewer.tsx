'use client'

import React from 'react'

import type { IframeViewerProps } from '@/shared/types/index.js'

export const IframeViewer: React.FC<IframeViewerProps> = ({
  allow = 'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;',
  allowFullScreen = true,
  className,
  loading = 'lazy',
  src,
  title,
}) => {
  return (
    <iframe
      allow={allow}
      allowFullScreen={allowFullScreen}
      className={className ? `media-preview-viewer__frame ${className}` : 'media-preview-viewer__frame'}
      loading={loading}
      src={src}
      title={title}
    />
  )
}
