//app/(main)/templet.tsx

"use client"
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  const cubeVariants = {
    hidden: { rotateX: 90, opacity: 0 },
    visible: { rotateX: 0, opacity: 1 },
    exit: { rotateX: -90, opacity: 0 }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={cubeVariants}
        transition={{ duration: 0.5 }}
        style={{ 
          width: '100%', 
          height: '100%',
          transformOrigin: 'top center'
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}