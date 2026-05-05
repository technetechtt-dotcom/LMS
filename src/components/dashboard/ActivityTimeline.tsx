import React, { useState } from 'react';
import {
  CheckCircle,
  AlertCircle,
  FileText,
  User,
  ChevronDown } from
'lucide-react';
import { Button } from '../ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
export interface ActivityItem {
  id: string;
  type: 'submission' | 'moderation' | 'alert' | 'registration';
  title: string;
  description: string;
  timestamp: string;
  user: string;
}
interface ActivityTimelineProps {
  items: ActivityItem[];
  maxItems?: number;
}
export function ActivityTimeline({
  items,
  maxItems = 4
}: ActivityTimelineProps) {
  const [visibleCount, setVisibleCount] = useState(maxItems);
  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'submission':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'moderation':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'registration':
        return <User className="h-5 w-5 text-purple-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };
  const getBgColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'submission':
        return 'bg-blue-50';
      case 'moderation':
        return 'bg-green-50';
      case 'alert':
        return 'bg-red-50';
      case 'registration':
        return 'bg-purple-50';
      default:
        return 'bg-gray-50';
    }
  };
  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;
  return (
    <div className="flow-root">
      <ul className="-mb-8">
        <AnimatePresence>
          {visibleItems.map((item, itemIdx) =>
          <motion.li
            key={item.id}
            initial={{
              opacity: 0,
              height: 0
            }}
            animate={{
              opacity: 1,
              height: 'auto'
            }}
            exit={{
              opacity: 0,
              height: 0
            }}
            transition={{
              duration: 0.3
            }}>
            
              <div className="relative pb-8">
                {itemIdx !== items.length - 1 ?
              <span
                className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                aria-hidden="true" /> :

              null}
                <div className="relative flex space-x-3">
                  <div
                  className={`relative px-2 py-2 flex items-center justify-center rounded-full ring-8 ring-white ${getBgColor(item.type)}`}>
                  
                    {getIcon(item.type)}
                  </div>
                  <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                    <div>
                      <p className="text-sm text-gray-900 font-medium">
                        {item.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {item.description}
                      </p>
                    </div>
                    <div className="text-right text-sm whitespace-nowrap text-gray-500">
                      <time dateTime={item.timestamp}>{item.timestamp}</time>
                    </div>
                  </div>
                </div>
              </div>
            </motion.li>
          )}
        </AnimatePresence>
      </ul>

      {hasMore ?
      <div className="mt-8 text-center">
          <Button
          variant="ghost"
          size="sm"
          onClick={() => setVisibleCount((prev) => prev + 4)}
          rightIcon={<ChevronDown className="h-4 w-4" />}>
          
            Load More
          </Button>
        </div> :

      items.length > maxItems &&
      <div className="mt-8 text-center text-xs text-gray-400">
            No more activities
          </div>

      }
    </div>);

}