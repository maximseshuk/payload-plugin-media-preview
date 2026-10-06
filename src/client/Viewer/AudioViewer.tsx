'use client'

import React from 'react'

import type { AudioViewerProps } from '@/shared/types/index.js'

export const AudioViewer: React.FC<AudioViewerProps> = ({
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
    <audio
      autoPlay={autoPlay}
      className={className}
      controls={controls}
      loop={loop}
      muted={muted}
      preload={preload}
      title={title}
    >
      <source src={src} type={mimeType} />
      <track kind="captions" />
    </audio>
  )
}
