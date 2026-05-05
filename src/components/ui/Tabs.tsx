import React from 'react';
import { motion } from 'framer-motion';
interface Tab {
  id: string;
  label: string;
  count?: number;
}
interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}
export function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  return (
    <div className={`border-b border-gray-200 ${className}`}>
      <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center
                ${isActive ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
              aria-current={isActive ? 'page' : undefined}>
              
              {tab.label}
              {tab.count !== undefined &&
              <span
                className={`ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium ${isActive ? 'bg-blue-100 text-brand-navy' : 'bg-gray-100 text-gray-900'}`}>
                
                  {tab.count}
                </span>
              }
              {isActive &&
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-navy"
                initial={false}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 30
                }} />

              }
            </button>);

        })}
      </nav>
    </div>);

}