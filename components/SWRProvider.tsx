'use client';

import { SWRConfig } from 'swr';
import React from 'react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig 
      value={{ 
        fetcher,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        shouldRetryOnError: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}
