import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
  delay?: number;
}
function StatCardComponent({
  title,
  value,
  icon,
  trend,
  delay = 0
}: StatCardProps) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20
      }}
      animate={{
        opacity: 1,
        y: 0
      }}
      transition={{
        duration: 0.4,
        delay
      }}
      className="bg-white overflow-hidden rounded-lg shadow-sm border border-gray-200">
      
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0 p-3 rounded-md bg-brand-navy/10 text-brand-navy">
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd>
                <div className="text-2xl font-bold text-gray-900">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      {trend &&
      <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm">
            <span
            className={`
              inline-flex items-center font-medium
              ${trend.direction === 'up' ? 'text-green-600' : trend.direction === 'down' ? 'text-red-600' : 'text-gray-500'}
            `}>
            
              {trend.direction === 'up' &&
            <ArrowUpRight className="mr-1 h-4 w-4" />
            }
              {trend.direction === 'down' &&
            <ArrowDownRight className="mr-1 h-4 w-4" />
            }
              {trend.direction === 'neutral' &&
            <Minus className="mr-1 h-4 w-4" />
            }
              {trend.value}%
            </span>
            <span className="text-gray-500 ml-2">{trend.label}</span>
          </div>
        </div>
      }
    </motion.div>);

}
export const StatCard = memo(StatCardComponent);