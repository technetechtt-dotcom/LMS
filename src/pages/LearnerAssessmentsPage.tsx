import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  FileCheck,
  CheckCircle,
  Clock,
  BarChart3,
  Bot,
  Trophy,
  Download,
  Shield,
  Code,
  Calendar,
  HelpCircle,
  RotateCcw,
  BookOpen } from
'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { assessmentService } from '../services/api';
import type { Assessment } from '../types';

type RecentResultRow = {
  id: number;
  assessment: string;
  module: string;
  date: string;
  score: string;
  status: string;
};

export function LearnerAssessmentsPage() {
  const navigate = useNavigate();
  const [apiAssessments, setApiAssessments] = useState<Assessment[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    let cancelled = false;
    assessmentService
      .getAll()
      .then((res) => {
        if (!cancelled) setApiAssessments(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load assessments');
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [showStudyPlanModal, setShowStudyPlanModal] = useState(false);
  const [showPracticeModal, setShowPracticeModal] = useState(false);
  const [showStudyGuideModal, setShowStudyGuideModal] = useState(false);
  const stats = [
  {
    label: 'Total Assessments',
    value: '15',
    icon: <FileCheck className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'Completed',
    value: '9',
    icon: <CheckCircle className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'Pending',
    value: '4',
    icon: <Clock className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'Average Score',
    value: '84%',
    icon: <BarChart3 className="h-5 w-5 text-gray-500" />
  }];

  const recentResults = [
  {
    id: 1,
    assessment: 'Database Design Quiz',
    module: 'Module 4',
    date: 'Jan 8, 2025',
    score: '92%',
    status: 'Passed'
  },
  {
    id: 2,
    assessment: 'System Analysis Test',
    module: 'Module 3',
    date: 'Jan 3, 2025',
    score: '78%',
    status: 'Passed'
  },
  {
    id: 3,
    assessment: 'Project Management',
    module: 'Module 2',
    date: 'Dec 28, 2024',
    score: '65%',
    status: 'Needs Retake'
  }];

  const columns = [
  {
    header: 'Assessment',
    accessorKey: 'assessment' as const,
    cell: (row: RecentResultRow) =>
    <div className="flex items-center">
          <FileCheck className="h-4 w-4 text-gray-400 mr-2" />
          <span className="font-medium text-gray-900">{row.assessment}</span>
        </div>

  },
  {
    header: 'Module',
    accessorKey: 'module' as const
  },
  {
    header: 'Date',
    accessorKey: 'date' as const
  },
  {
    header: 'Score',
    accessorKey: 'score' as const,
    cell: (row: RecentResultRow) => (
      <span className="font-bold">{row.score}</span>
    ),
  },
  {
    header: 'Status',
    accessorKey: 'status' as const,
    cell: (row: RecentResultRow) =>
    <Badge variant={row.status === 'Passed' ? 'success' : 'warning'}>
          {row.status}
        </Badge>

  },
  {
    header: 'Actions',
    accessorKey: 'id' as const,
    cell: (row: RecentResultRow) =>
    <button
      className="text-sm text-brand-blue hover:underline"
      onClick={() =>
      row.status === 'Needs Retake' ?
      navigate(`/assessment/${row.id}/take`) :
      toast.info('Opening details...')
      }>
      
          {row.status === 'Needs Retake' ? 'Retake' : 'View Details'}
        </button>

  }];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assessments</h1>
        <p className="text-sm text-gray-500">
          Track your progress and complete evaluations
        </p>
      </div>

      <Card>
        <div className="flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-brand-navy flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Learner assessments in your programme
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Depending on your programme, assessments may include:
            </p>
            <ul className="mt-2 text-sm text-gray-700 list-disc list-inside space-y-0.5">
              <li>Learner Workbook</li>
              <li>Summative Assessment</li>
              <li>Quizzes</li>
              <li>Class tests</li>
            </ul>
          </div>
        </div>
      </Card>

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

      {/* AI Insights */}
      <Card>
        <div className="flex items-center mb-4">
          <Bot className="h-5 w-5 text-brand-navy mr-2" />
          <h3 className="text-lg font-bold text-gray-900 mr-2">
            AI Assessment Insights
          </h3>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            Personalized
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <h4 className="font-bold text-green-900 mb-2">Strength Areas</h4>
            <p className="text-sm text-green-800 mb-3">
              You excel in Database Design and Programming Logic. Keep building
              on these foundations.
            </p>
            <div className="flex items-center text-xs font-medium text-green-700">
              <Trophy className="h-4 w-4 mr-1" /> Top 15% in your cohort
            </div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h4 className="font-bold text-blue-900 mb-2">Focus Areas</h4>
            <p className="text-sm text-blue-800 mb-3">
              Network Security concepts need more attention. Review materials
              before the next assessment.
            </p>
            <Button
              className="w-full bg-brand-navy text-white"
              leftIcon={<Bot className="h-4 w-4" />}
              onClick={() => setShowStudyPlanModal(true)}>
              
              Get Study Plan
            </Button>
          </div>
        </div>
      </Card>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 gap-4 w-full">
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search assessments..."
              icon={<FileCheck className="h-4 w-4" />} />
            
          </div>
          <div className="w-full sm:w-48">
            <Select
              options={[
              {
                value: 'all',
                label: 'All Modules'
              }]
              } />
            
          </div>
          <div className="w-full sm:w-48">
            <Select
              options={[
              {
                value: 'all',
                label: 'All Status'
              }]
              } />
            
          </div>
        </div>
        <Button
          leftIcon={<Download className="h-4 w-4" />}
          onClick={() => toast.success('Exporting assessment results...')}>
          
          Export Results
        </Button>
      </div>

      {/* Upcoming Assessments */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Upcoming Assessments
        </h3>
        <div className="space-y-4">
          {/* Card 1 */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <div className="flex items-start">
                <div className="p-3 bg-gray-100 rounded-lg mr-4">
                  <Shield className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">
                    Network Security Assessment
                  </h4>
                  <p className="text-sm text-gray-500">
                    Module 7 - Cybersecurity Fundamentals
                  </p>
                </div>
              </div>
              <div className="text-right mt-2 md:mt-0">
                <Badge variant="neutral" className="mb-1">
                  Due Soon
                </Badge>
                <p className="text-xs text-gray-500">Due: Jan 15, 2025</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-6">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" /> Duration: 90 minutes
              </div>
              <div className="flex items-center">
                <HelpCircle className="h-4 w-4 mr-2" /> 50 Questions
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" /> Pass Mark: 70%
              </div>
            </div>
            <div className="flex justify-between items-center border-t border-gray-100 pt-4">
              <div className="flex space-x-3">
                <Button
                  className="bg-brand-navy text-white"
                  onClick={() => navigate('/assessment/a1/take')}>
                  
                  Start Assessment
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/materials')}>
                  
                  Review Materials
                </Button>
              </div>
              <span className="text-xs text-gray-500 flex items-center">
                <div className="flex -space-x-2 mr-2">
                  <div className="h-6 w-6 rounded-full bg-gray-200 border-2 border-white"></div>
                  <div className="h-6 w-6 rounded-full bg-gray-300 border-2 border-white"></div>
                  <div className="h-6 w-6 rounded-full bg-gray-400 border-2 border-white"></div>
                </div>
                23 learners completed
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <div className="flex items-start">
                <div className="p-3 bg-gray-100 rounded-lg mr-4">
                  <Code className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">
                    Programming Logic Test
                  </h4>
                  <p className="text-sm text-gray-500">
                    Module 5 - Algorithm Development
                  </p>
                </div>
              </div>
              <div className="text-right mt-2 md:mt-0">
                <Badge variant="neutral" className="mb-1">
                  Upcoming
                </Badge>
                <p className="text-xs text-gray-500">Due: Jan 22, 2025</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-6">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" /> Duration: 120 minutes
              </div>
              <div className="flex items-center">
                <Code className="h-4 w-4 mr-2" /> Practical Coding
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" /> Pass Mark: 65%
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" /> 7 days remaining
              </div>
            </div>
            <div className="flex space-x-3 border-t border-gray-100 pt-4">
              <Button
                className="w-full"
                variant="outline"
                leftIcon={<RotateCcw className="h-4 w-4" />}
                onClick={() => setShowPracticeModal(true)}>
                
                Practice Exercises
              </Button>
              <Button
                className="w-full"
                variant="outline"
                leftIcon={<BookOpen className="h-4 w-4" />}
                onClick={() => setShowStudyGuideModal(true)}>
                
                Study Guide
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Results */}
      <Card title="Recent Results" noPadding>
        <DataTable data={recentResults} columns={columns} keyField="id" />
      </Card>

      {/* SETA Compliance */}
      <Card title="SETA Compliance Assessments">
        <h4 className="text-sm font-medium text-gray-700 mb-4">
          Portfolio of Evidence (POE)
        </h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
            <div className="flex items-center">
              <FileCheck className="h-4 w-4 text-gray-500 mr-3" />
              <span className="text-sm font-medium text-gray-900">
                Work-based Projects
              </span>
            </div>
            <span className="text-xs text-gray-500">Complete</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
            <div className="flex items-center">
              <RotateCcw className="h-4 w-4 text-gray-500 mr-3" />
              <span className="text-sm font-medium text-gray-900">
                Skills Demonstration
              </span>
            </div>
            <span className="text-xs text-gray-500">In Progress</span>
          </div>
          <div className="p-3 bg-gray-50 rounded border border-gray-100 h-10"></div>
        </div>
      </Card>

      {/* Study Plan Modal */}
      <Modal
        isOpen={showStudyPlanModal}
        onClose={() => setShowStudyPlanModal(false)}
        title="Your Personalized Study Plan"
        size="lg">
        
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start">
            <Bot className="h-6 w-6 text-brand-blue mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-brand-blue">
                AI-Generated Plan
              </h4>
              <p className="text-xs text-gray-600 mt-1">
                Based on your recent assessment scores, I've created a 7-day
                study plan focusing on your weak areas: Database Design and SQL
                Queries.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                <span className="font-bold text-gray-900">
                  Day 1-2: Database Fundamentals
                </span>
                <Badge variant="info">4 Hours</Badge>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start">
                  <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-brand-blue text-xs font-bold mr-3 flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Review Entity-Relationship Diagrams
                    </p>
                    <p className="text-xs text-gray-500">
                      Read Module 3, Section 2. Complete practice exercise 1.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-brand-blue text-xs font-bold mr-3 flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Normalization Rules (1NF to 3NF)
                    </p>
                    <p className="text-xs text-gray-500">
                      Watch video lecture "Data Normalization".
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                <span className="font-bold text-gray-900">
                  Day 3-5: SQL Queries
                </span>
                <Badge variant="info">6 Hours</Badge>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start">
                  <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-brand-blue text-xs font-bold mr-3 flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      JOINS and Subqueries
                    </p>
                    <p className="text-xs text-gray-500">
                      Complete the interactive SQL lab on inner/outer joins.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              className="mr-3"
              onClick={() => toast.success('Study plan downloaded')}>
              
              Download PDF
            </Button>
            <Button onClick={() => setShowStudyPlanModal(false)}>Got It</Button>
          </div>
        </div>
      </Modal>

      {/* Practice Exercises Modal */}
      <Modal
        isOpen={showPracticeModal}
        onClose={() => setShowPracticeModal(false)}
        title="Practice Exercises"
        size="lg">
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Select an exercise to test your knowledge before the final
            assessment.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4 hover:border-brand-navy cursor-pointer transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-gray-900">SQL Basics Quiz</h4>
                <Badge variant="success">Easy</Badge>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                10 multiple choice questions covering SELECT, WHERE, and ORDER
                BY clauses.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400 flex items-center">
                  <Clock className="h-3 w-3 mr-1" /> 15 mins
                </span>
                <Button
                  size="sm"
                  onClick={() => toast.info('Starting exercise...')}>
                  
                  Start
                </Button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 hover:border-brand-navy cursor-pointer transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-gray-900">
                  Database Normalization
                </h4>
                <Badge variant="warning">Medium</Badge>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Identify anomalies and normalize a flat table to 3NF.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400 flex items-center">
                  <Clock className="h-3 w-3 mr-1" /> 30 mins
                </span>
                <Button
                  size="sm"
                  onClick={() => toast.info('Starting exercise...')}>
                  
                  Start
                </Button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 hover:border-brand-navy cursor-pointer transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-gray-900">Complex JOINS Lab</h4>
                <Badge variant="danger">Hard</Badge>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Write queries using multiple INNER, LEFT, and RIGHT joins on a
                sample database.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400 flex items-center">
                  <Clock className="h-3 w-3 mr-1" /> 45 mins
                </span>
                <Button
                  size="sm"
                  onClick={() => toast.info('Starting exercise...')}>
                  
                  Start
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="ghost" onClick={() => setShowPracticeModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Study Guide Modal */}
      <Modal
        isOpen={showStudyGuideModal}
        onClose={() => setShowStudyGuideModal(false)}
        title="Module Study Guide"
        size="lg">
        
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-gray-200 pb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Database Management Systems
              </h3>
              <p className="text-sm text-gray-500">
                Comprehensive Review Guide
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={() => toast.success('Downloading guide...')}>
              
              Download PDF
            </Button>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-gray-900 mb-2 flex items-center">
                <div className="h-6 w-6 rounded bg-blue-100 text-brand-blue flex items-center justify-center mr-2 text-sm">
                  1
                </div>
                Key Concepts to Master
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-8">
                <li>Relational Database Model vs NoSQL</li>
                <li>Primary, Foreign, and Composite Keys</li>
                <li>
                  ACID Properties (Atomicity, Consistency, Isolation,
                  Durability)
                </li>
                <li>
                  Data Definition Language (DDL) vs Data Manipulation Language
                  (DML)
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-2 flex items-center">
                <div className="h-6 w-6 rounded bg-blue-100 text-brand-blue flex items-center justify-center mr-2 text-sm">
                  2
                </div>
                Required Practical Skills
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-8">
                <li>
                  Creating tables with appropriate data types and constraints
                </li>
                <li>
                  Writing basic CRUD operations (INSERT, SELECT, UPDATE, DELETE)
                </li>
                <li>
                  Filtering and sorting data (WHERE, ORDER BY, GROUP BY, HAVING)
                </li>
                <li>Joining multiple tables (INNER, LEFT, RIGHT, FULL)</li>
              </ul>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
              <h4 className="text-sm font-bold text-amber-800 mb-1 flex items-center">
                <HelpCircle className="h-4 w-4 mr-1" /> Common Pitfalls
              </h4>
              <p className="text-xs text-amber-700">
                Many learners struggle with the difference between WHERE and
                HAVING clauses. Remember: WHERE filters rows before grouping,
                while HAVING filters groups after the GROUP BY clause is
                applied.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowStudyGuideModal(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>);

}