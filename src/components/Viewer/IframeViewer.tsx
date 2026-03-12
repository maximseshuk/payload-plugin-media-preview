'use client'

import type { IframeViewerProps } from '@/types.js'

import React from 'react'

export const IframeViewer: React.FC<IframeViewerProps> = ({
  allow = 'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;',
  allowFullScreen = true,
  className,
  loading = 'lazy',
  src,
  title,
}) => {
  return (
    // eslint-disable-next-line @eslint-react/dom/no-missing-iframe-sandbox
    <iframe
      allow={allow}
      allowFullScreen={allowFullScreen}
      className={className}
      loading={loading}
      src={src}
      title={title}
    />
  )
}
