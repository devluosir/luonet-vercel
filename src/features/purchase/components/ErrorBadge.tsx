'use client';
import React from 'react';

export default function ErrorBadge({ text }: { text?: string }) {
  if (!text) return null;
  return <div className="mt-1 text-xs text-red-600 dark:text-red-400">{text}</div>;
}
