import React from 'react';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Download } from
'lucide-react';
import { Badge } from '../ui/Badge';
interface POEItem {
  id: string;
  title: string;
  status: 'completed' | 'pending' | 'missing' | 'verified';
  date?: string;
  type: string;
}
interface POESectionProps {
  title: string;
  items: POEItem[];
  expanded?: boolean;
}
export function POESection({ title, items }: POESectionProps) {
  const getStatusIcon = (status: POEItem['status']) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-amber-500" />;
      case 'missing':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
  };
  const getStatusBadge = (status: POEItem['status']) => {
    switch (status) {
      case 'verified':
        return <Badge variant="success">Verified</Badge>;
      case 'completed':
        return <Badge variant="info">Submitted</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'missing':
        return <Badge variant="danger">Missing</Badge>;
    }
  };
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wider">
          {title}
        </h3>
        <span className="text-xs text-gray-500">
          {
          items.filter(
            (i) => i.status === 'verified' || i.status === 'completed'
          ).length
          }{' '}
          / {items.length} Completed
        </span>
      </div>
      <ul className="divide-y divide-gray-200">
        {items.map((item) =>
        <li
          key={item.id}
          className="px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between">
          
            <div className="flex items-center space-x-3">
              {getStatusIcon(item.status)}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {item.title}
                </p>
                <p className="text-xs text-gray-500">
                  {item.type} {item.date && `• ${item.date}`}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {getStatusBadge(item.status)}
              {(item.status === 'completed' || item.status === 'verified') &&
            <button className="text-gray-400 hover:text-brand-navy">
                  <Download className="h-4 w-4" />
                </button>
            }
            </div>
          </li>
        )}
      </ul>
    </div>);

}