import './globals.css'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'RIWA POS - Bam Burgers',
  description: 'Point of Sale System for Bam Burgers Restaurant',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
