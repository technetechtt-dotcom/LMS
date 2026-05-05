import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  TrendingUp,
  CheckCircle,
  Star,
  Bot,
  Clock,
  MessageSquare,
  CalendarCheck,
  Download,
  HelpCircle,
  Upload } from
'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
export function LearnerDashboardPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, Thandi!
        </h1>
        <p className="text-sm text-brand-blue">IT Skills Program · Level 4</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Overall Progress
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">68%</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-full">
              <TrendingUp className="h-5 w-5 text-gray-500" />
            </div>
          </div>
          <ProgressBar value={68} size="sm" />
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Modules Completed
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">8/12</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-full">
              <CheckCircle className="h-5 w-5 text-gray-500" />
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Credits Earned
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">156/240</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-full">
              <Star className="h-5 w-5 text-gray-500" />
            </div>
          </div>
        </div>
      </div>

      {/* AI Learning Assistant */}
      <Card>
        <div className="flex items-center mb-4">
          <Bot className="h-5 w-5 text-brand-navy mr-2" />
          <h3 className="text-lg font-bold text-gray-900 mr-2">
            AI Learning Assistant
          </h3>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            Recommended
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-2">Continue Learning</h4>
            <p className="text-sm text-gray-600 mb-4">
              Based on your progress, focus on Database Management next
            </p>
            <Button
              size="sm"
              className="bg-brand-navy text-white"
              onClick={() => navigate('/learner-courses')}>
              
              Start Module
            </Button>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-2">
              Upcoming Assessment
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              Network Security quiz due in 3 days. Review materials?
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/learner-courses')}>
              
              Review Now
            </Button>
          </div>
        </div>
      </Card>

      {/* Current Modules */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Current Modules
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-200 p-8 text-center">
              <span className="text-gray-500 font-medium">
                Database Management
              </span>
            </div>
            <div className="p-5">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-gray-900">Database Management</h4>
                <span className="text-xs text-gray-500">In Progress</span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Learn SQL, database design, and data modeling fundamentals
              </p>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" /> 4 hours left
                </span>
              </div>
              <ProgressBar value={60} size="sm" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-200 p-8 text-center">
              <span className="text-gray-500 font-medium">
                Network Security
              </span>
            </div>
            <div className="p-5">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-gray-900">Network Security</h4>
                <span className="text-xs text-amber-600 font-medium">
                  Assessment Due
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Cybersecurity principles and network protection strategies
              </p>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span className="flex items-center">
                  <CalendarCheck className="h-3 w-3 mr-1" /> Due: Jan 15, 2025
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => navigate('/assessment/a1/take')}>
                
                Take Quiz
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* SETA Compliance & Documents */}
      <Card title="Profile Documents & Compliance">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              Required Documents
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                <div className="flex items-center">
                  <Upload className="h-4 w-4 text-blue-500 mr-3" />
                  <span className="text-sm font-medium text-gray-900">
                    CV / Curriculum Vitae
                  </span>
                </div>
                <button
                  className="text-xs text-blue-600 font-medium cursor-pointer hover:underline"
                  onClick={() => toast.info('Opening file upload...')}>
                  
                  Upload
                </button>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm font-medium text-gray-900">
                    Certified ID Copy
                  </span>
                </div>
                <span className="text-xs text-green-600">Verified</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-amber-500 mr-3" />
                  <span className="text-sm font-medium text-gray-900">
                    Highest Qualification Certificate
                  </span>
                </div>
                <span className="text-xs text-amber-600">Pending</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                <div className="flex items-center">
                  <Upload className="h-4 w-4 text-blue-500 mr-3" />
                  <span className="text-sm font-medium text-gray-900">
                    Affidavit Stating Unemployment Status
                  </span>
                </div>
                <button
                  className="text-xs text-blue-600 font-medium cursor-pointer hover:underline"
                  onClick={() => toast.info('Opening file upload...')}>
                  
                  Upload
                </button>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              Compliance Status
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">QCTO Registration</span>
                <Badge variant="success">Active</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Learning Agreement</span>
                <Badge variant="success">Signed</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Workplace Approval</span>
                <Badge variant="warning">Pending</Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center hover:border-brand-navy hover:shadow-md transition-all"
            onClick={() => navigate('/messages')}>
            
            <MessageSquare className="h-6 w-6 text-gray-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-900">
              Contact Mentor
            </span>
          </button>
          <button
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center hover:border-brand-navy hover:shadow-md transition-all"
            onClick={() => navigate('/attendance')}>
            
            <CalendarCheck className="h-6 w-6 text-gray-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-900">
              Book Session
            </span>
          </button>
          <button
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center hover:border-brand-navy hover:shadow-md transition-all"
            onClick={() => toast.success('Downloading course materials...')}>
            
            <Download className="h-6 w-6 text-gray-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-900">
              Download Materials
            </span>
          </button>
          <button
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center hover:border-brand-navy hover:shadow-md transition-all"
            onClick={() => navigate('/help')}>
            
            <HelpCircle className="h-6 w-6 text-gray-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-900">Get Help</span>
          </button>
        </div>
      </div>
    </div>);

}