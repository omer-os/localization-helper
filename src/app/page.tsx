'use client'
import React from 'react'
import dynamic from "next/dynamic";

const DynamicComponentWithNoSSR = dynamic(() => import('../components/LocalizationManager'), {
  ssr: false
})


export default function Page() {
  return (
    <div>
      <DynamicComponentWithNoSSR />
    </div>
  )
}
