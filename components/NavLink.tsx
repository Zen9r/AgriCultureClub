// components/NavLink.tsx
"use client"

import { motion } from "framer-motion"
import Link from "next/link"

export default function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Link href={href} className="relative block px-4 py-2">
        {children}
        <motion.span
          className="absolute bottom-0 left-0 h-0.5 bg-[#4CAF50]"
          initial={{ width: 0 }}
          whileHover={{ width: '100%' }}
          transition={{ duration: 0.3 }}
        />
      </Link>
    </motion.div>
  )
}