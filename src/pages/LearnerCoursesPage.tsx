import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BookOpen,
  CheckCircle,
  Clock,
  Star,
  Bot,
  Filter,
  Search,
  Play,
  Lock,
  Calendar,
  ArrowRight } from
'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { learnerCourseModules } from '../data/learnerCourseModules';
export function LearnerCoursesPage() {
  const navigate = useNavigate();
  const modules = learnerCourseModules;
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const stats = [
  {
    label: 'Total Modules',
    value: '12',
    icon: <BookOpen className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'Completed',
    value: '8',
    icon: <CheckCircle className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'In Progress',
    value: '2',
    icon: <Clock className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'Average Score',
    value: '85%',
    icon: <Star className="h-5 w-5 text-gray-500" />
  }];

  const getHeaderIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-6 w-6 text-white" />;
      case 'In Progress':
        return <Play className="h-6 w-6 text-white" />;
      case 'Assessment':
        return <Play className="h-6 w-6 text-white" />;
      case 'Locked':
        return <Lock className="h-6 w-6 text-gray-400" />;
      default:
        return null;
    }
  };
  const getHeaderBg = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-gray-300';
      case 'In Progress':
        return 'bg-gray-300';
      case 'Assessment':
        return 'bg-gray-300';
      case 'Locked':
        return 'bg-gray-100';
      default:
        return 'bg-gray-200';
    }
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
          <p className="text-sm text-brand-blue">IT Skills Program · Level 4</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            leftIcon={<Filter className="h-4 w-4" />}
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-gray-100' : ''}>
            
            Filter
          </Button>
          <Button
            leftIcon={<Search className="h-4 w-4" />}
            onClick={() => setShowSearch(!showSearch)}
            className={showSearch ? 'bg-brand-navy text-white' : ''}>
            
            Search
          </Button>
        </div>
      </div>

      {showSearch &&
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <Input
          placeholder="Search courses, modules, or topics..."
          icon={<Search className="h-4 w-4" />}
          autoFocus />
        
        </div>
      }

      {showFilters &&
      <Card className="bg-gray-50 border-dashed">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-900">
              Filter Courses
            </h3>
            <button
            className="text-sm text-brand-blue hover:underline"
            onClick={() => {
              toast.success('Filters cleared');
              setShowFilters(false);
            }}>
            
              Clear all
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
            options={[
            {
              value: 'all',
              label: 'All Modules'
            },
            {
              value: 'm1',
              label: 'Module 1'
            }]
            } />
          
            <Select
            options={[
            {
              value: 'all',
              label: 'All Statuses'
            },
            {
              value: 'completed',
              label: 'Completed'
            },
            {
              value: 'in-progress',
              label: 'In Progress'
            }]
            } />
          
            <Button
            className="w-full"
            onClick={() => {
              toast.success('Filters applied');
              setShowFilters(false);
            }}>
            
              Apply Filters
            </Button>
          </div>
        </Card>
      }

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) =>
        <div
          key={i}
          className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center">
          
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stat.value}
              </p>
            </div>
            <div className="p-2 bg-gray-50 rounded-full">{stat.icon}</div>
          </div>
        )}
      </div>

      {/* AI Learning Path */}
      <Card>
        <div className="flex items-center mb-4">
          <Bot className="h-5 w-5 text-brand-navy mr-2" />
          <h3 className="text-lg font-bold text-gray-900 mr-2">
            AI Learning Path
          </h3>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            Personalized
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Based on your progress and learning style, here's your recommended
          path:
        </p>
        <div className="flex items-center gap-4">
          <div className="flex-1 p-4 bg-white rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">
              Next: Database Management
            </p>
            <p className="text-sm text-gray-600">
              Estimated completion: 4 hours
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
          <div className="flex-1 p-4 bg-white rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Then: Web Development</p>
            <p className="text-sm text-gray-600">
              Prerequisites: Complete current module
            </p>
          </div>
        </div>
      </Card>

      {/* Course Modules */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">Course Modules</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">View:</span>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 text-sm rounded ${viewMode === 'grid' ? 'bg-brand-navy text-white' : 'bg-gray-100 text-gray-600'}`}>
              
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm rounded ${viewMode === 'list' ? 'bg-brand-navy text-white' : 'bg-gray-100 text-gray-600'}`}>
              
              List
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod) =>
          <div
            key={mod.id}
            role="button"
            tabIndex={mod.status === 'Locked' ? -1 : 0}
            onClick={() => {
              if (mod.status !== 'Locked') {
                navigate(`/learner-courses/${mod.id}`);
              }
            }}
            onKeyDown={(e) => {
              if (
              mod.status !== 'Locked' &&
              (e.key === 'Enter' || e.key === ' ')
              ) {
                e.preventDefault();
                navigate(`/learner-courses/${mod.id}`);
              }
            }}
            className={`bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden ${mod.status === 'Locked' ? 'opacity-60' : 'cursor-pointer hover:border-brand-navy/40'}`}>
            
              <div
              className={`${getHeaderBg(mod.status)} p-8 text-center relative`}>
              
                {mod.status === 'Assessment' &&
              <div className="absolute top-2 left-2">
                    <Badge variant="warning" className="text-xs">
                      Assessment Due
                    </Badge>
                  </div>
              }
                <div className="absolute top-2 right-2">
                  {getHeaderIcon(mod.status)}
                </div>
                <span
                className={`font-medium ${mod.status === 'Locked' ? 'text-gray-400' : 'text-gray-500'}`}>
                
                  {mod.name}
                </span>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-gray-900">{mod.name}</h4>
                  <span className="text-xs text-gray-500">
                    {mod.status === 'Completed' && 'Completed'}
                    {mod.status === 'In Progress' && 'In Progress'}
                    {mod.status === 'Assessment' && 'Assessment'}
                    {mod.status === 'Locked' && 'Locked'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-4">{mod.description}</p>

                {mod.status === 'Completed' &&
              <>
                    <div className="flex justify-between text-xs text-gray-500 mb-3">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" /> {mod.hours}
                      </span>
                      <span className="flex items-center">
                        <Star className="h-3 w-3 mr-1" /> {mod.score}
                      </span>
                    </div>
                    <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/learner-courses/${mod.id}`);
                  }}>
                  
                      Review Materials
                    </Button>
                  </>
              }

                {mod.status === 'In Progress' &&
              <>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Progress</span>
                      <span>{mod.progress}%</span>
                    </div>
                    <ProgressBar
                  value={mod.progress || 0}
                  size="sm"
                  className="mb-4" />
                
                    <Button
                  className="w-full bg-brand-navy text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/learner-courses/${mod.id}`);
                  }}>
                  
                      Continue Learning
                    </Button>
                  </>
              }

                {mod.status === 'Assessment' &&
              <>
                    <div className="flex items-center text-xs text-gray-500 mb-4">
                      <Calendar className="h-3 w-3 mr-1" /> Quiz due:{' '}
                      {mod.dueDate}
                    </div>
                    <Button
                  className="w-full bg-brand-navy text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/assessment/a1/take');
                  }}>
                  
                      Take Assessment
                    </Button>
                  </>
              }

                {mod.status === 'Locked' &&
              <>
                    <div className="flex items-center text-xs text-gray-400 mb-4">
                      <Lock className="h-3 w-3 mr-1" /> {mod.prerequisite}
                    </div>
                    <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled>
                  
                      Locked
                    </Button>
                  </>
              }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SETA Requirements */}
      <Card title="SETA Requirements">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              Workplace Assessment
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm font-medium text-gray-900">
                    Portfolio of Evidence
                  </span>
                </div>
                <span className="text-xs text-gray-500">8/12 Complete</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-blue-500 mr-3" />
                  <span className="text-sm font-medium text-gray-900">
                    Practical Assessment
                  </span>
                </div>
                <span className="text-xs text-gray-500">Scheduled: Jan 20</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              Credit Requirements
            </h4>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Credits Earned</span>
              <span className="font-bold">156/240</span>
            </div>
            <ProgressBar value={65} size="sm" className="mb-2" />
            <p className="text-xs text-gray-500">
              84 credits remaining to complete qualification
            </p>
          </div>
        </div>
      </Card>

    </div>);

}