// components/EventFilterTabs.tsx
"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface EventFilterTabsProps {
  categories: string[];
  activeFilter: string;
  setFilter: (filter: string) => void;
}

export function EventFilterTabs({ 
  categories, 
  activeFilter, 
  setFilter 
}: EventFilterTabsProps) {
  return (
    <div className="w-full overflow-x-auto pb-2">
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <div className="flex w-max mx-auto space-x-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1 no-scrollbar">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setFilter(category)}
            className={cn(
              "relative rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500",
              "focus-visible:ring-offset-2 whitespace-nowrap",
              activeFilter === category ? "" : "text-gray-700 hover:text-black dark:text-gray-300 dark:hover:text-white"
            )}
          >
            {activeFilter === category && (
              <motion.div
                layoutId="active-event-filter-pill"
                className="absolute inset-0 bg-gradient-to-r from-green-600 to-green-500"
                style={{ borderRadius: 8 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className={cn(
              "relative z-10",
              activeFilter === category ? "text-white" : ""
            )}>
              {category === "كل الفعاليات" ? "الكل" : category}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}