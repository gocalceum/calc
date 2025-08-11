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

export type CardProps = BaseProps
export type CardHeaderProps = BaseProps
export type CardTitleProps = BaseProps
export type CardDescriptionProps = BaseProps
export type CardContentProps = BaseProps
export type CardFooterProps = BaseProps

// Add more component types as needed
