import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md'
}: ModalProps) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };
  return (
    <AnimatePresence>
      {isOpen &&
      <div
        className="fixed inset-0 z-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title">
        
          {/* Backdrop */}
          <motion.div
          initial={{
            opacity: 0
          }}
          animate={{
            opacity: 1
          }}
          exit={{
            opacity: 0
          }}
          className="fixed inset-0 bg-gray-500/75"
          aria-hidden="true" />
        

          {/* Centering wrapper - click on empty space closes */}
          <div
          className="fixed inset-0 overflow-y-auto"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}>
          
            <div
            className="flex min-h-full items-center justify-center p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}>
            
              {/* Modal panel */}
              <motion.div
              initial={{
                opacity: 0,
                scale: 0.95,
                y: 10
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
                y: 10
              }}
              transition={{
                duration: 0.2
              }}
              className={`relative w-full ${sizes[size]} bg-white rounded-lg shadow-xl`}
              onMouseDown={(e) => e.stopPropagation()}>
              
                <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex justify-between items-start mb-4">
                    <h3
                    className="text-lg leading-6 font-medium text-gray-900"
                    id="modal-title">
                    
                      {title}
                    </h3>
                    <button
                    type="button"
                    onClick={onClose}
                    className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-navy">
                    
                      <span className="sr-only">Close</span>
                      <X className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-2">{children}</div>
                </div>
                {footer &&
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    {footer}
                  </div>
              }
              </motion.div>
            </div>
          </div>
        </div>
      }
    </AnimatePresence>);

}