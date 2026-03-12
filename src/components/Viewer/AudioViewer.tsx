'use client'

import type { AudioViewerProps } from '@/types.js'

import React from 'react'

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
    // eslint-disable-next-line jsx-a11y/control-has-associated-label
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
