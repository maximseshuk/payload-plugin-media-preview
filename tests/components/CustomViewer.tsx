'use client'

import React from 'react'

type CustomViewerProps = {
  embedId: string
  provider: string
}

export const CustomViewer: React.FC<CustomViewerProps> = ({ embedId, provider }) => {
  return (
    <div data-embed-id={embedId} data-provider={provider} data-testid="custom-viewer">
      <p>
        Custom Viewer: {provider} — {embedId}
      </p>
    </div>
  )
}
