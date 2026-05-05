import React, { useState } from 'react';
import {
  Award,
  Clock,
  CheckCircle,
  Star,
  Bot,
  Download,
  Share2,
  Lock,
  ExternalLink,
  FileText } from
'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Modal } from '../components/ui/Modal';
import { toast } from 'sonner';
export function LearnerCertificatesPage() {
  const navigate = useNavigate();
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [showPathwayModal, setShowPathwayModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const stats = [
  {
    label: 'Total Certificates',
    value: '3',
    icon: <Award className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'In Progress',
    value: '2',
    icon: <Clock className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'Completed',
    value: '1',
    icon: <CheckCircle className="h-5 w-5 text-gray-500" />
  },
  {
    label: 'QCTO Credits',
    value: '156',
    icon: <Star className="h-5 w-5 text-gray-500" />
  }];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Certificates &amp; Credentials
        </h1>
        <p className="text-sm text-gray-500">IT Skills Program - Level 4</p>
      </div>

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

      {/* AI Advisor */}
      <Card>
        <div className="flex items-center mb-4">
          <Bot className="h-5 w-5 text-brand-navy mr-2" />
          <h3 className="text-lg font-bold text-gray-900 mr-2">
            AI Certificate Advisor
          </h3>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            Recommended
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-2">Next Certificate</h4>
            <p className="text-sm text-gray-600 mb-3">
              Complete Network Security module to unlock Cybersecurity
              Fundamentals certificate
            </p>
            <Button
              size="sm"
              className="bg-brand-navy text-white"
              onClick={() => setShowRequirementsModal(true)}>
              
              View Requirements
            </Button>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-2">
              Industry Recognition
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Your completed certificates align with CompTIA A+ pathway
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPathwayModal(true)}>
              
              Learn More
            </Button>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="w-full sm:w-48">
          <Select
            options={[
            {
              value: 'all',
              label: 'All Certificates'
            }]
            } />
          
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={[
            {
              value: 'all',
              label: 'All Categories'
            }]
            } />
          
        </div>
        <div className="flex-1 w-full">
          <Input placeholder="Search certificates..." />
        </div>
      </div>

      {/* Certificates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Completed */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-brand-navy p-6 text-white text-center relative">
            <div className="absolute top-2 right-2">
              <Badge
                variant="success"
                className="bg-white/20 text-white border-none">
                
                ✓ Completed
              </Badge>
            </div>
            <h3 className="font-bold text-lg mt-4">
              IT Fundamentals Certificate
            </h3>
          </div>
          <div className="p-6 flex-1 flex flex-col">
            <h4 className="font-bold text-gray-900 mb-2">
              IT Fundamentals Certificate
            </h4>
            <p className="text-sm text-gray-500 mb-4">
              QCTO aligned certificate covering basic IT concepts and skills
            </p>
            <div className="flex justify-between text-xs text-gray-500 mb-6">
              <span>Issued: Dec 15, 2024</span>
              <span>Credits: 24</span>
            </div>
            <div className="mt-auto flex space-x-3">
              <Button
                className="flex-1 bg-brand-navy text-white"
                leftIcon={<Download className="h-4 w-4" />}
                onClick={() => toast.success('Downloading certificate...')}>
                
                Download
              </Button>
              <Button
                variant="outline"
                leftIcon={<Share2 className="h-4 w-4" />}
                onClick={() => toast.success('Share link copied to clipboard')}>
                
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* Card 2: In Progress */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-gray-200 p-6 text-center relative">
            <div className="absolute top-2 right-2">
              <Badge
                variant="neutral"
                className="bg-gray-600 text-white border-none">
                
                In Progress
              </Badge>
            </div>
            <h3 className="font-bold text-lg text-gray-500 mt-4">
              Database Management Certificate
            </h3>
          </div>
          <div className="p-6 flex-1 flex flex-col">
            <h4 className="font-bold text-gray-900 mb-2">
              Database Management Certificate
            </h4>
            <p className="text-sm text-gray-500 mb-4">
              Advanced database design and SQL programming certification
            </p>
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1">
                <span>Progress: 68%</span>
                <span>Credits: 36</span>
              </div>
              <ProgressBar value={68} size="sm" />
            </div>
            <Button
              className="mt-auto w-full"
              variant="outline"
              onClick={() => navigate('/learner-courses')}>
              
              Continue Learning
            </Button>
          </div>
        </div>

        {/* Card 3: Locked */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col opacity-75">
          <div className="bg-gray-100 p-6 text-center relative">
            <div className="absolute top-2 right-2">
              <Badge
                variant="neutral"
                className="bg-gray-400 text-white border-none">
                
                <Lock className="h-3 w-3 mr-1" /> Locked
              </Badge>
            </div>
            <h3 className="font-bold text-lg text-gray-400 mt-4">
              Cybersecurity Fundamentals
            </h3>
          </div>
          <div className="p-6 flex-1 flex flex-col">
            <h4 className="font-bold text-gray-900 mb-2">
              Cybersecurity Fundamentals
            </h4>
            <p className="text-sm text-gray-500 mb-4">
              Network security principles and threat protection strategies
            </p>
            <div className="flex justify-between text-xs text-gray-500 mb-4">
              <span>Prerequisites: 2/3</span>
              <span>Credits: 48</span>
            </div>
            <div className="bg-gray-50 p-3 rounded text-xs text-gray-500 mb-4">
              <p className="font-medium mb-1">Requirements:</p>
              <ul className="list-disc list-inside space-y-1">
                <li className="text-green-600">IT Fundamentals Certificate</li>
                <li className="text-gray-400">
                  Database Management Certificate
                </li>
                <li className="text-gray-400">Network Security Module</li>
              </ul>
            </div>
            <Button className="mt-auto w-full" variant="outline" disabled>
              View Requirements
            </Button>
          </div>
        </div>

        {/* Card 4: Industry */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-gray-200 p-6 text-center relative">
            <div className="absolute top-2 right-2">
              <Badge
                variant="info"
                className="bg-gray-500 text-white border-none">
                
                <Star className="h-3 w-3 mr-1" /> Industry
              </Badge>
            </div>
            <h3 className="font-bold text-lg text-white mt-4">
              CompTIA A+ Pathway
            </h3>
          </div>
          <div className="p-6 flex-1 flex flex-col">
            <h4 className="font-bold text-gray-900 mb-2">CompTIA A+ Pathway</h4>
            <p className="text-sm text-gray-500 mb-4">
              Industry-recognized IT support specialist certification
            </p>
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1">
                <span>Progress: 45%</span>
                <span>External Cert</span>
              </div>
              <ProgressBar value={45} size="sm" />
            </div>
            <Button
              className="mt-auto w-full bg-brand-navy text-white"
              onClick={() => setShowPathwayModal(true)}>
              
              View Pathway
            </Button>
          </div>
        </div>

        {/* Card 5: SETA */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-gray-200 p-6 text-center relative">
            <div className="absolute top-2 right-2">
              <Badge
                variant="info"
                className="bg-gray-500 text-white border-none">
                
                SETA
              </Badge>
            </div>
            <h3 className="font-bold text-lg text-white mt-4">
              MICT SETA Qualification
            </h3>
          </div>
          <div className="p-6 flex-1 flex flex-col">
            <h4 className="font-bold text-gray-900 mb-2">
              MICT SETA Qualification
            </h4>
            <p className="text-sm text-gray-500 mb-4">
              Level 4 ICT Systems Support qualification
            </p>
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1">
                <span>Progress: 72%</span>
                <span>Credits: 240</span>
              </div>
              <ProgressBar value={72} size="sm" />
            </div>
            <div className="mt-auto flex space-x-2">
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => setShowProgressModal(true)}>
                
                View Progress
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowProgressModal(true)}>
                
                <FileText className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Card 6: Badge */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-brand-navy p-6 text-white text-center relative">
            <div className="absolute top-2 right-2">
              <Badge
                variant="success"
                className="bg-white/20 text-white border-none">
                
                ✓ Earned
              </Badge>
            </div>
            <h3 className="font-bold text-lg mt-4">Excel Specialist Badge</h3>
          </div>
          <div className="p-6 flex-1 flex flex-col">
            <h4 className="font-bold text-gray-900 mb-2">
              Excel Specialist Badge
            </h4>
            <p className="text-sm text-gray-500 mb-4">
              Digital badge for advanced Excel skills and data analysis
            </p>
            <div className="flex justify-between text-xs text-gray-500 mb-6">
              <span>Issued: Nov 28, 2024</span>
              <span>Micro-credential</span>
            </div>
            <div className="mt-auto flex space-x-3">
              <Button
                className="flex-1 bg-brand-navy text-white"
                leftIcon={<ExternalLink className="h-4 w-4" />}
                onClick={() => setShowBadgeModal(true)}>
                
                View Badge
              </Button>
              <Button
                variant="outline"
                leftIcon={<Share2 className="h-4 w-4" />}
                onClick={() => toast.success('Badge link copied to clipboard')}>
                
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* QCTO Compliance */}
      <Card title="QCTO Compliance Status">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              Qualification Progress
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Knowledge Modules</span>
                <span className="font-medium">8/12 completed</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Practical Skills</span>
                <span className="font-medium">6/10 completed</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Work Experience</span>
                <span className="font-medium">156/240 hours</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              Verification Status
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">QCTO Registration</span>
                <Badge variant="neutral" className="bg-gray-100 text-gray-600">
                  Verified
                </Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Assessment Records</span>
                <Badge variant="neutral" className="bg-gray-100 text-gray-600">
                  Up to Date
                </Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Portfolio Review</span>
                <span className="text-gray-400">Pending</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Requirements Modal */}
      <Modal
        isOpen={showRequirementsModal}
        onClose={() => setShowRequirementsModal(false)}
        title="Certificate Requirements">
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Complete the following requirements to unlock the Cybersecurity
            Fundamentals certificate:
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <span className="text-sm font-medium text-gray-900">
                  IT Fundamentals Certificate
                </span>
              </div>
              <Badge variant="success">Completed</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-sm font-medium text-gray-900">
                  Database Management Certificate
                </span>
              </div>
              <Badge variant="neutral">In Progress</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <Lock className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-sm font-medium text-gray-900">
                  Network Security Module
                </span>
              </div>
              <Badge variant="neutral">Locked</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <Lock className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-sm font-medium text-gray-900">
                  Final Assessment
                </span>
              </div>
              <Badge variant="neutral">Locked</Badge>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowRequirementsModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Pathway Modal */}
      <Modal
        isOpen={showPathwayModal}
        onClose={() => setShowPathwayModal(false)}
        title="Industry Certification Pathway">
        
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            Your current progress aligns with the CompTIA certification pathway.
            Completing these modules prepares you for the external exams.
          </p>

          <div className="relative border-l-2 border-gray-200 ml-3 space-y-8">
            <div className="relative pl-6">
              <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-green-500 border-2 border-white"></div>
              <h4 className="font-bold text-gray-900">
                CompTIA IT Fundamentals (ITF+)
              </h4>
              <p className="text-sm text-gray-500 mb-2">
                Basic IT concepts and terminology
              </p>
              <Badge variant="success">Preparation Complete</Badge>
            </div>

            <div className="relative pl-6">
              <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-brand-blue border-2 border-white"></div>
              <h4 className="font-bold text-gray-900">CompTIA A+</h4>
              <p className="text-sm text-gray-500 mb-2">
                Core hardware and operating system technologies
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="bg-brand-blue h-2 rounded-full"
                  style={{
                    width: '45%'
                  }}>
                </div>
              </div>
              <span className="text-xs font-medium text-brand-blue">
                45% Ready
              </span>
            </div>

            <div className="relative pl-6">
              <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-gray-300 border-2 border-white"></div>
              <h4 className="font-bold text-gray-400">CompTIA Network+</h4>
              <p className="text-sm text-gray-400 mb-2">
                Network design, configuration, and troubleshooting
              </p>
              <Badge variant="neutral">Not Started</Badge>
            </div>

            <div className="relative pl-6">
              <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-gray-300 border-2 border-white"></div>
              <h4 className="font-bold text-gray-400">CompTIA Security+</h4>
              <p className="text-sm text-gray-400 mb-2">
                Core cybersecurity principles and practices
              </p>
              <Badge variant="neutral">Not Started</Badge>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h5 className="text-sm font-bold text-brand-blue mb-1">
              External Exam Voucher
            </h5>
            <p className="text-xs text-gray-600 mb-3">
              You will receive an exam voucher once you reach 100% readiness for
              a certification.
            </p>
            <Button size="sm" variant="outline" className="w-full">
              Learn More About Vouchers
            </Button>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={() => setShowPathwayModal(false)}>Close</Button>
          </div>
        </div>
      </Modal>

      {/* Progress Modal */}
      <Modal
        isOpen={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        title="Qualification Progress Report"
        size="lg">
        
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                MICT SETA Qualification
              </h3>
              <p className="text-sm text-gray-500">
                Level 4 ICT Systems Support (SAQA ID: 78964)
              </p>
            </div>
            <Badge variant="info">240 Credits</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-bold text-gray-700 mb-1">
                Knowledge Modules
              </h4>
              <div className="flex justify-between items-end mb-2">
                <span className="text-2xl font-bold text-gray-900">
                  8
                  <span className="text-sm text-gray-500 font-normal">/12</span>
                </span>
                <span className="text-xs font-medium text-green-600">66%</span>
              </div>
              <ProgressBar value={66} size="sm" />
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-bold text-gray-700 mb-1">
                Practical Skills
              </h4>
              <div className="flex justify-between items-end mb-2">
                <span className="text-2xl font-bold text-gray-900">
                  6
                  <span className="text-sm text-gray-500 font-normal">/10</span>
                </span>
                <span className="text-xs font-medium text-brand-blue">60%</span>
              </div>
              <ProgressBar value={60} size="sm" />
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-bold text-gray-700 mb-1">
                Work Experience
              </h4>
              <div className="flex justify-between items-end mb-2">
                <span className="text-2xl font-bold text-gray-900">
                  156
                  <span className="text-sm text-gray-500 font-normal">
                    /240h
                  </span>
                </span>
                <span className="text-xs font-medium text-amber-600">65%</span>
              </div>
              <ProgressBar value={65} size="sm" />
            </div>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-3">Module Breakdown</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    KM-XX: Knowledge module (example)
                  </p>
                  <p className="text-xs text-gray-500">12 Credits</p>
                </div>
                <Badge variant="success">Competent</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    PM-03: Install and Configure Hardware
                  </p>
                  <p className="text-xs text-gray-500">15 Credits</p>
                </div>
                <Badge variant="success">Competent</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    WM-02: Provide IT Support
                  </p>
                  <p className="text-xs text-gray-500">
                    20 Credits · 80/120 hours logged
                  </p>
                </div>
                <Badge variant="warning">In Progress</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200 rounded-lg opacity-75">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    KM-05: Network Architecture
                  </p>
                  <p className="text-xs text-gray-500">10 Credits</p>
                </div>
                <Badge variant="neutral">Not Started</Badge>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={() => toast.success('Downloading transcript...')}>
              
              Download Transcript
            </Button>
            <Button onClick={() => setShowProgressModal(false)}>Close</Button>
          </div>
        </div>
      </Modal>

      {/* Badge Modal */}
      <Modal
        isOpen={showBadgeModal}
        onClose={() => setShowBadgeModal(false)}
        title="Digital Badge Details">
        
        <div className="text-center space-y-6">
          <div className="mx-auto w-32 h-32 bg-brand-navy rounded-full flex items-center justify-center shadow-lg border-4 border-white ring-4 ring-gray-100">
            <Award className="h-16 w-16 text-white" />
          </div>

          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              Excel Specialist
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Issued by SkillForge SA
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg text-left">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issue Date
                </p>
                <p className="text-sm font-medium text-gray-900">
                  Nov 28, 2024
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credential ID
                </p>
                <p className="text-sm font-medium text-gray-900 font-mono">
                  EXL-892-441
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Skills Verified
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-medium text-gray-700">
                  Data Analysis
                </span>
                <span className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-medium text-gray-700">
                  Pivot Tables
                </span>
                <span className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-medium text-gray-700">
                  Macros
                </span>
                <span className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-medium text-gray-700">
                  VLOOKUP
                </span>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              className="flex-1"
              variant="outline"
              leftIcon={<Share2 className="h-4 w-4" />}
              onClick={() => toast.success('Public link copied to clipboard')}>
              
              Copy Public Link
            </Button>
            <Button
              className="flex-1 bg-[#0077b5] hover:bg-[#006097] text-white border-none"
              onClick={() => toast.success('Redirecting to LinkedIn...')}>
              
              Add to Profile
            </Button>
          </div>
        </div>
      </Modal>
    </div>);

}