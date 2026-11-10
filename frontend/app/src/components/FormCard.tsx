import { Paper, Typography } from '@mui/material'
import { useEffect, useRef, type ReactNode } from 'react'

type FormCardProps = {
  title: string
  description?: string
  children: ReactNode
  maxWidth?: number
}

export function FormCard({ title, description, children, maxWidth = 440 }: FormCardProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [title])

  return (
    <Paper
      component="section"
      elevation={1}
      sx={{ width: '100%', maxWidth, p: { xs: 2, sm: 4 } }}
    >
      <Typography ref={headingRef} variant="h5" component="h2" tabIndex={-1} gutterBottom>
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {description}
        </Typography>
      ) : null}
      {children}
    </Paper>
  )
}
