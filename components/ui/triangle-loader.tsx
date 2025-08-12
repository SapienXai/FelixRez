import React from "react"

interface TriangleLoaderProps {
  label?: string
}

export function TriangleLoader({ label = "Loading..." }: TriangleLoaderProps) {
  return (
    <div className="triangle-loader-wrapper">
      <div className="triangle-loader" aria-label={label} role="status">
        <span className="triangle t1" />
        <span className="triangle t2" />
        <span className="triangle t3" />
      </div>
      {label && <div className="triangle-loader-label">{label}</div>}
    </div>
  )
}

