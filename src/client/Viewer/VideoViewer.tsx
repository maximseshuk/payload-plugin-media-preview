'use client'

import React from 'react'

import type { VideoViewerProps } from '@/shared/types/index.js'

export const VideoViewer: React.FC<VideoViewerProps> = ({
  autoPlay = true,
  className,
  controls = true,
  loop = false,
  mimeType,
  muted = false,
  preload = 'metadata',
  src,
  title,
}) => {
  return (
    <video
      autoPlay={autoPlay}
      className={className ? `media-preview-viewer__media ${className}` : 'media-preview-viewer__media'}
      controls={controls}
      loop={loop}
      muted={muted}
      playsInline={autoPlay}
      preload={preload}
      title={title}
    >
      <source src={src} type={mimeType} />
      <track kind="captions" />
    </video>
  )
}
