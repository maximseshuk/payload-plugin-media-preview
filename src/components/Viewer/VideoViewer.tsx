'use client'

import type { VideoViewerProps } from '@/types.js'

import React from 'react'

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
    // eslint-disable-next-line jsx-a11y/control-has-associated-label
    <video
      autoPlay={autoPlay}
      className={className}
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
