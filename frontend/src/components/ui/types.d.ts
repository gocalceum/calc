// Type declarations for UI components
// These are simplified types - in production you'd want more specific types

import { ReactNode, HTMLAttributes, ButtonHTMLAttributes } from 'react'

export interface BaseProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode
  className?: string
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  asChild?: boolean
}

export interface CardProps extends BaseProps {}
export interface CardHeaderProps extends BaseProps {}
export interface CardTitleProps extends BaseProps {}
export interface CardDescriptionProps extends BaseProps {}
export interface CardContentProps extends BaseProps {}
export interface CardFooterProps extends BaseProps {}

// Add more component types as needed