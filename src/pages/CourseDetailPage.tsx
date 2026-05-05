import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  FileCheck,
  LayoutGrid,
  Lock,
  Play,
  Star } from
'lucide-react';
import {
  getLearnerModuleById,
  type LearnerCourseModule
} from '../data/learnerCourseModules';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';

function statusBadge(mod: LearnerCourseModule) {
  switch (mod.status) {
    case 'Completed':
      return <Badge variant="success">Completed</Badge>;
    case 'In Progress':
      return <Badge variant="info">In Progress</Badge>;
    case 'Assessment':
      return <Badge variant="warning">Assessment Due</Badge>;
    case 'Locked':
      return <Badge variant="neutral">Locked</Badge>;
    default:
      return null;
  }
}

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const mod =
  courseId ? getLearnerModuleById(courseId) : undefined;

  if (!mod) {
    return (
      <div className="space-y-4">
        <p className="text-gray-700">Module not found.</p>
        <Link to="/learner-courses" className="text-brand-blue hover:underline">
          Back to My Courses
        </Link>
      </div>);

  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/learner-courses"
          className="inline-flex items-center text-sm text-brand-blue hover:underline mb-2">
          
          <ArrowLeft className="h-4 w-4 mr-1" />
          My courses
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{mod.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{mod.description}</p>
          </div>
          {statusBadge(mod)}
        </div>
      </div>

      {mod.status === 'Locked' &&
      <Card>
          <div className="flex items-start gap-3 text-sm text-gray-700">
            <Lock className="h-5 w-5 text-gray-400 shrink-0" />
            <p>{mod.prerequisite}</p>
          </div>
        </Card>
      }

      {mod.status === 'Completed' &&
      <Card title="Your results">
          <div className="flex flex-wrap gap-6 text-sm">
            <span className="flex items-center text-gray-600">
              <Clock className="h-4 w-4 mr-2" /> {mod.hours}
            </span>
            <span className="flex items-center text-gray-600">
              <Star className="h-4 w-4 mr-2" /> {mod.score}
            </span>
          </div>
        </Card>
      }

      {mod.status === 'In Progress' &&
      <Card title="Progress">
          <div className="flex justify-between text-sm mb-2">
            <span>Overall</span>
            <span>{mod.progress}%</span>
          </div>
          <ProgressBar value={mod.progress ?? 0} size="sm" />
        </Card>
      }

      {mod.status === 'Assessment' &&
      <Card>
          <div className="flex items-center text-sm text-gray-600 mb-4">
            <Calendar className="h-4 w-4 mr-2" /> Quiz due: {mod.dueDate}
          </div>
          <Button
          className="bg-brand-navy text-white"
          onClick={() => navigate('/assessment/a1/take')}>
          
            Take assessment
          </Button>
        </Card>
      }

      <Card title="Module content">
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h4 className="font-bold text-gray-900">
                Section 1: Introduction & Theory
              </h4>
              <span className="text-xs text-gray-500">3 / 3 Completed</span>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="p-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center">
                  <Play className="h-4 w-4 text-gray-400 mr-3" />
                  <span className="text-sm text-gray-700">
                    Welcome to the Module
                  </span>
                </div>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <div className="p-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center">
                  <BookOpen className="h-4 w-4 text-gray-400 mr-3" />
                  <span className="text-sm text-gray-700">
                    Core Concepts Reading
                  </span>
                </div>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h4 className="font-bold text-gray-900">
                Section 2: Practical Application
              </h4>
              <span className="text-xs text-gray-500">1 / 3 Completed</span>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="p-3 flex items-center justify-between bg-blue-50 border-l-2 border-brand-blue cursor-pointer">
                <div className="flex items-center">
                  <LayoutGrid className="h-4 w-4 text-brand-blue mr-3" />
                  <span className="text-sm font-medium text-brand-blue">
                    Interactive Lab Exercise
                  </span>
                </div>
                <span className="text-xs font-medium text-brand-blue">
                  In Progress
                </span>
              </div>
              <div className="p-3 flex items-center justify-between opacity-60">
                <div className="flex items-center">
                  <FileCheck className="h-4 w-4 text-gray-400 mr-3" />
                  <span className="text-sm text-gray-700">Section Assignment</span>
                </div>
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {mod.status !== 'Locked' &&
        <div className="flex justify-end pt-6 gap-2">
            <Button variant="ghost" onClick={() => navigate('/learner-courses')}>
              Close
            </Button>
            <Button
            onClick={() => {
              toast.success('Resuming learning…');
            }}>
            
              Resume learning
            </Button>
          </div>
        }
      </Card>
    </div>);

}
