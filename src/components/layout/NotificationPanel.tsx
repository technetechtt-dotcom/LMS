import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, FileText } from 'lucide-react';
interface Notification {
  id: string;
  type: 'assessment' | 'compliance' | 'system' | 'moderation';
  title: string;
  description: string;
  time: string;
  read: boolean;
}
interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAllRead: () => void;
}
export function NotificationPanel({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead
}: NotificationPanelProps) {
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'assessment':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'compliance':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'moderation':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'system':
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };
  return (
    <AnimatePresence>
      {isOpen &&
      <>
          <div className="fixed inset-0 z-30" onClick={onClose} />
          <motion.div
          initial={{
            opacity: 0,
            y: 10,
            scale: 0.95
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1
          }}
          exit={{
            opacity: 0,
            y: 10,
            scale: 0.95
          }}
          transition={{
            duration: 0.2
          }}
          className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-40 overflow-hidden origin-top-right">
          
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">
                Notifications
              </h3>
              <button
              onClick={onMarkAllRead}
              className="text-xs text-brand-blue hover:text-blue-700 font-medium">
              
                Mark all read
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ?
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  No new notifications
                </div> :

            <ul className="divide-y divide-gray-100">
                  {notifications.map((notification) =>
              <li
                key={notification.id}
                className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.read ? 'bg-blue-50/50' : ''}`}>
                
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                      className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                      
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {notification.description}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {notification.time}
                          </p>
                        </div>
                        {!notification.read &&
                  <span className="h-2 w-2 bg-brand-blue rounded-full flex-shrink-0 mt-2" />
                  }
                      </div>
                    </li>
              )}
                </ul>
            }
            </div>

            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-center">
              <a
              href="#"
              className="text-xs font-medium text-gray-600 hover:text-brand-navy">
              
                View All Notifications
              </a>
            </div>
          </motion.div>
        </>
      }
    </AnimatePresence>);

}