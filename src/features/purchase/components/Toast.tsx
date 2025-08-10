'use client';
import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose?: () => void;
}

export default function Toast({ message, type = 'success', duration = 2000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300); // 等待动画结束
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  }[type];

  if (!isVisible) return null;

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {message}
    </div>
  );
}

// 全局Toast管理器
let toastContainer: HTMLDivElement | null = null;

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
  if (typeof window === 'undefined') return; // SSR安全

  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toastElement = document.createElement('div');
  toastContainer.appendChild(toastElement);

  const removeToast = () => {
    if (toastElement.parentNode) {
      toastElement.parentNode.removeChild(toastElement);
    }
  };

  // 简单的DOM操作，避免React依赖
  const toastDiv = document.createElement('div');
  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  }[type];
  
  toastDiv.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300`;
  toastDiv.textContent = message;
  
  toastElement.appendChild(toastDiv);
  
  setTimeout(() => {
    toastDiv.style.opacity = '0';
    setTimeout(removeToast, 300);
  }, 2000);
}
