import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  MessageSquare,
  Megaphone,
  Mail,
  Bell,
  Users,
  Filter,
  Plus,
  Search,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Send,
  Edit,
  Trash2,
  Download,
  Calendar,
  Info,
  FileCheck,
  AlertTriangle,
  UserPlus,
  MicOff } from
'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { DataTable } from '../components/ui/DataTable';
type CommGroupRow = {
  id?: number;
  name: string;
  members: string;
  type: string;
  program: string;
  lastActivity: string;
};

export function FacilitatorCommunicationPage() {
  const [activeTab, setActiveTab] = useState('announcements');
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(0);
  const [showCompose, setShowCompose] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showEditAnnouncement, setShowEditAnnouncement] = useState(false);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [showEditTemplate, setShowEditTemplate] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [editingTemplateIndex, setEditingTemplateIndex] = useState<
    number | null>(
    null);
  const tabs = [
  {
    id: 'messages',
    label: 'Messages',
    icon: <MessageSquare className="h-4 w-4" />
  },
  {
    id: 'announcements',
    label: 'Announcements',
    icon: <Megaphone className="h-4 w-4" />
  },
  {
    id: 'email',
    label: 'Email',
    icon: <Mail className="h-4 w-4" />
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: <Bell className="h-4 w-4" />
  },
  {
    id: 'groups',
    label: 'Groups',
    icon: <Users className="h-4 w-4" />
  }];

  const contacts = [
  {
    id: 'thabo',
    name: 'Thabo Mokoena',
    role: 'Learner',
    unread: 3,
    online: true
  },
  {
    id: 'lerato',
    name: 'Lerato Ndlovu',
    role: 'Learner',
    unread: 0,
    online: true
  },
  {
    id: 'michael',
    name: 'Michael Smith',
    role: 'Facilitator',
    unread: 0,
    online: false
  },
  {
    id: 'mict',
    name: 'MICT SETA Support',
    role: 'Support',
    unread: 1,
    online: false
  }];

  const chatMessages = [
  {
    sender: 'thabo',
    text: 'Good morning Ms. Johnson, I have a question about the assessment submission deadline.',
    time: '9:32 AM',
    isMe: false
  },
  {
    sender: 'me',
    text: 'Good morning Thabo. Yes, how can I help you?',
    time: '9:35 AM',
    isMe: true
  }];

  const announcements = [
  {
    title: 'End of Module Assessment - Instructions',
    to: 'All IT Skills Learners',
    date: '10 Jun 2023',
    priority: 'High',
    audience: 'All IT Skills Learners',
    body: 'Dear Learners,\nThe End of Module Assessment for the Database Development module will be available from Monday, June 15th at 9:00 AM until Wednesday, June 17th at 5:00 PM.'
  },
  {
    title: 'Workplace Visit Schedule - July 2023',
    to: 'All Learners',
    date: '08 Jun 2023',
    priority: 'Medium'
  },
  {
    title: 'SETA Verification Visit - Important Noti...',
    to: 'All Facilitators',
    date: '05 Jun 2023',
    priority: 'High'
  }];

  const emailTemplates = [
  {
    name: 'Assessment Reminder',
    subject: 'Reminder: Upcoming Assessment on [Date]'
  },
  {
    name: 'Feedback on Assignment',
    subject: 'Feedback: [Assignment Name]'
  },
  {
    name: 'Workshop Invitation',
    subject: 'Invitation: [Workshop Name] on [Date]'
  },
  {
    name: 'Monthly Progress Update',
    subject: 'Your Monthly Progress Update - [Month]'
  },
  {
    name: 'SETA Documentation Request',
    subject: 'Required: SETA Documentation Submission'
  }];

  const recentEmails = [
  {
    title: 'Assessment Submission Reminder',
    to: 'IT Skills Development Group (15 recipients)',
    date: 'Yesterday',
    preview:
    'This is a reminder that your final assessment is due this Friday at 5pm...'
  },
  {
    title: 'Workshop Schedule Update',
    to: 'All Learners (32 recipients)',
    date: 'June 8',
    preview:
    'Please note that the practical workshop scheduled for next week has been...'
  },
  {
    title: 'SETA Documentation Request',
    to: 'MICT SETA Support',
    date: 'June 5',
    preview:
    'As requested in our recent meeting, I am sending the updated learner progress...'
  },
  {
    title: 'Monthly Progress Reports',
    to: 'IT Skills Development Group (15 recipients)',
    date: 'June 1',
    preview:
    'Your monthly progress reports have been generated and are available for revie...'
  }];

  const groups = [
  {
    id: 1,
    name: 'IT Skills Development',
    members: '15 members',
    type: 'Learnership',
    program: 'Technical Support NQF Level 4',
    lastActivity: 'Today'
  },
  {
    id: 2,
    name: 'Facilitator Team',
    members: '4 members',
    type: 'Staff',
    program: 'N/A',
    lastActivity: 'Yesterday'
  },
  {
    id: 3,
    name: 'SETA Stakeholders',
    members: '3 members',
    type: 'External',
    program: 'N/A',
    lastActivity: 'June 5'
  }];

  const groupActivity = [
  {
    name: 'IT Skills Development',
    detail: 'New message from Sarah Johnson',
    time: 'Today'
  },
  {
    name: 'SETA Stakeholders',
    detail: '2 new members added',
    time: 'Yesterday'
  },
  {
    name: 'Facilitator Team',
    detail: 'New announcement posted',
    time: '2 days ago'
  }];

  const groupColumns = [
  {
    header: 'GROUP NAME',
    accessorKey: 'name' as const,
    cell: (row: CommGroupRow) =>
    <span className="font-medium text-brand-blue">{row.name}</span>

  },
  {
    header: 'MEMBERS',
    accessorKey: 'members' as const
  },
  {
    header: 'TYPE',
    accessorKey: 'type' as const
  },
  {
    header: 'LEARNERSHIP PROGRAM',
    accessorKey: 'program' as const
  },
  {
    header: 'LAST ACTIVITY',
    accessorKey: 'lastActivity' as const
  },
  {
    header: 'ACTIONS',
    accessorKey: 'id' as const,
    cell: () =>
    <div className="flex space-x-3 text-sm">
          <button
        className="text-brand-blue hover:underline"
        onClick={() => toast.info('Opening invite modal...')}>
        
            Invite Members
          </button>
          <button
        className="text-brand-blue hover:underline"
        onClick={() => toast.info('Opening group chat...')}>
        
            Message
          </button>
          <button
        className="text-brand-blue hover:underline"
        onClick={() => toast.info('Opening group settings...')}>
        
            Manage
          </button>
        </div>

  }];

  const selectedContactData = contacts.find((c) => c.id === selectedContact);
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Communication Center
        </h1>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            leftIcon={<Filter className="h-4 w-4" />}
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-gray-100' : ''}>
            
            Filter
          </Button>
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => toast.info('Opening new message composer...')}>
            
            New Message
          </Button>
        </div>
      </div>

      {showFilters &&
      <Card className="bg-gray-50 border-dashed">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-900">
              Filter Communications
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
            options={[
            {
              value: 'all',
              label: 'All Channels'
            },
            {
              value: 'email',
              label: 'Email'
            },
            {
              value: 'sms',
              label: 'SMS'
            }]
            } />
          
            <Select
            options={[
            {
              value: 'all',
              label: 'All Statuses'
            },
            {
              value: 'sent',
              label: 'Sent'
            },
            {
              value: 'scheduled',
              label: 'Scheduled'
            }]
            } />
          
            <Select
            options={[
            {
              value: 'all',
              label: 'All Programs'
            },
            {
              value: 'it',
              label: 'IT Skills Program'
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

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-6">
          {tabs.map((tab) =>
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          )}
        </div>
      </div>

      {/* ===== MESSAGES TAB ===== */}
      {activeTab === 'messages' &&
      <div
        className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
        style={{
          height: '500px'
        }}>
        
          <div className="flex h-full">
            <div className="w-80 border-r border-gray-200 flex flex-col">
              <div className="p-3 border-b border-gray-100">
                <Input
                placeholder="Search contacts..."
                icon={<Search className="h-4 w-4" />} />
              
              </div>
              <div className="flex-1 overflow-y-auto">
                {contacts.map((contact) =>
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact.id)}
                className={`w-full flex items-center p-3 hover:bg-gray-50 transition-colors ${selectedContact === contact.id ? 'bg-blue-50' : ''}`}>
                
                    <div className="relative mr-3">
                      <Avatar name={contact.name} className="h-10 w-10" />
                      {contact.online &&
                  <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
                  }
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-gray-900">
                        {contact.name}
                      </p>
                      <p className="text-xs text-green-600">
                        {contact.online ? '● ' : ''}
                        {contact.role}
                      </p>
                    </div>
                    {contact.unread > 0 &&
                <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {contact.unread}
                      </span>
                }
                  </button>
              )}
              </div>
            </div>
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center">
                  <Avatar
                  name={selectedContactData?.name || ''}
                  className="h-10 w-10 mr-3" />
                
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {selectedContactData?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedContactData?.role} • IT Skills Development
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2 text-gray-400">
                  <div className="flex space-x-2">
                    <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCallType('voice');
                      setShowCallModal(true);
                    }}>
                    
                      <Phone className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCallType('video');
                      setShowCallModal(true);
                    }}>
                    
                      <Video className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                    toast.info(
                      `Viewing contact options for ${selectedContactData?.name}`
                    )
                    }>
                    
                      <MoreVertical className="h-4 w-4 text-gray-500" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {chatMessages.map((msg, i) =>
              <div
                key={i}
                className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                
                    <div
                  className={`max-w-md px-4 py-3 rounded-2xl ${msg.isMe ? 'bg-brand-navy text-white rounded-br-md' : 'bg-gray-100 text-gray-900 rounded-bl-md'}`}>
                  
                      <p className="text-sm">{msg.text}</p>
                      <p
                    className={`text-xs mt-1 ${msg.isMe ? 'text-blue-200' : 'text-gray-500'}`}>
                    
                        {msg.time}
                      </p>
                    </div>
                  </div>
              )}
              </div>
              <div className="p-4 border-t border-gray-200 flex items-center space-x-3">
                <button
                className="text-gray-400 hover:text-gray-600"
                onClick={() => toast.info('Opening file attachment...')}>
                
                  <Paperclip className="h-5 w-5" />
                </button>
                <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
              
                <button
                className="bg-brand-navy text-white p-2 rounded-full hover:bg-brand-navy/90"
                onClick={() => toast.success('Message sent')}>
                
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      {/* ===== ANNOUNCEMENTS TAB ===== */}
      {activeTab === 'announcements' &&
      <div
        className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
        style={{
          height: '500px'
        }}>
        
          <div className="flex h-full">
            <div className="w-80 border-r border-gray-200 flex flex-col">
              <div className="p-3 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-900">
                  Announcements
                </h3>
                <Button
                size="sm"
                leftIcon={<Plus className="h-3 w-3" />}
                onClick={() => setShowCreateAnnouncement(true)}>
                
                  New
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {announcements.map((ann, i) =>
              <button
                key={i}
                onClick={() => setSelectedAnnouncement(i)}
                className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 ${selectedAnnouncement === i ? 'bg-blue-50 border-l-2 border-l-brand-blue' : ''}`}>
                
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-medium text-gray-900 line-clamp-1">
                        {ann.title}
                      </h4>
                      <Badge
                    variant={ann.priority === 'High' ? 'danger' : 'warning'}
                    className="ml-2 flex-shrink-0 text-xs">
                    
                        {ann.priority === 'High' ? '!High' : ann.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">To: {ann.to}</p>
                    <p className="text-xs text-gray-400 mt-1">{ann.date}</p>
                  </button>
              )}
              </div>
            </div>
            <div className="flex-1 flex flex-col">
              <div className="p-6 border-b border-gray-200 flex justify-between items-start">
                <h2 className="text-lg font-bold text-gray-900">
                  {announcements[selectedAnnouncement].title}
                </h2>
                <div className="flex space-x-2 text-gray-400">
                  <button
                  className="hover:text-gray-600"
                  onClick={() => setShowEditAnnouncement(true)}>
                  
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                  className="hover:text-red-500"
                  onClick={() => toast.success('Announcement deleted')}>
                  
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-gray-500">
                    Date: {announcements[selectedAnnouncement].date}
                  </p>
                  <p className="text-sm text-gray-500">
                    Audience:{' '}
                    {announcements[selectedAnnouncement].audience ||
                  announcements[selectedAnnouncement].to}
                  </p>
                </div>
                <Badge variant="danger" className="mb-6">
                  Priority: {announcements[selectedAnnouncement].priority}
                </Badge>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-sm text-gray-700 whitespace-pre-line">
                  {announcements[selectedAnnouncement].body ||
                'No content available.'}
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-between">
                <div className="flex space-x-3">
                  <Button
                  variant="outline"
                  leftIcon={<Download className="h-4 w-4" />}
                  onClick={() => toast.success('Exporting announcement...')}>
                  
                    Export
                  </Button>
                  <Button
                  variant="outline"
                  leftIcon={<Mail className="h-4 w-4" />}
                  onClick={() => toast.info('Opening email composer...')}>
                  
                    Email
                  </Button>
                </div>
                <Button
                leftIcon={<Send className="h-4 w-4" />}
                onClick={() => toast.success('Announcement published')}>
                
                  Publish
                </Button>
              </div>
            </div>
          </div>
        </div>
      }

      {/* ===== EMAIL TAB ===== */}
      {activeTab === 'email' &&
      <div className="space-y-6">
          {!showCompose ?
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Email Templates */}
              <Card>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    Email Templates
                  </h3>
                  <Button
                size="sm"
                leftIcon={<Plus className="h-3 w-3" />}
                onClick={() => setShowCreateTemplate(true)}>
                
                    New Template
                  </Button>
                </div>
                <div className="divide-y divide-gray-100">
                  {emailTemplates.map((tpl, i) =>
              <div
                key={i}
                className="py-4 flex justify-between items-start">
                
                      <div>
                        <h4 className="text-sm font-bold text-brand-blue">
                          {tpl.name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          Subject: {tpl.subject}
                        </p>
                      </div>
                      <div className="flex space-x-2 text-gray-400 flex-shrink-0">
                        <button
                    className="hover:text-gray-600"
                    onClick={() => {
                      setEditingTemplateIndex(i);
                      setShowEditTemplate(true);
                    }}>
                    
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                    className="hover:text-red-500"
                    onClick={() => toast.success('Template deleted')}>
                    
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
              )}
                </div>
              </Card>

              {/* Recent Emails */}
              <Card>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    Recent Emails
                  </h3>
                  <Button
                size="sm"
                leftIcon={<Mail className="h-3 w-3" />}
                onClick={() => setShowCompose(true)}>
                
                    Compose
                  </Button>
                </div>
                <div className="divide-y divide-gray-100">
                  {recentEmails.map((email, i) =>
              <div key={i} className="py-4">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-sm font-bold text-gray-900">
                          {email.title}
                        </h4>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-4">
                          {email.date}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">To: {email.to}</p>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                        {email.preview}
                      </p>
                    </div>
              )}
                </div>
              </Card>
            </div> /* Compose Email Form */ :

        <Card>
              <h3 className="text-lg font-bold text-gray-900 mb-6">
                Compose New Email
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipients
                  </label>
                  <div className="flex">
                    <input
                  type="text"
                  placeholder="Enter recipients or select a group"
                  className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                
                    <button className="border border-l-0 border-gray-300 rounded-r-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center">
                      <Users className="h-4 w-4 mr-1" /> Groups
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                type="text"
                placeholder="Enter subject"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
              
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template
                  </label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent text-gray-500">
                    <option>Select a template (optional)</option>
                    {emailTemplates.map((tpl, i) =>
                <option key={i}>{tpl.name}</option>
                )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                placeholder="Compose your message"
                rows={6}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-y" />
              
                </div>
                <div className="flex justify-between items-center pt-2">
                  <div className="flex space-x-3">
                    <Button
                  variant="outline"
                  leftIcon={<Paperclip className="h-4 w-4" />}
                  onClick={() => toast.info('Opening file attachment...')}>
                  
                      Attach Files
                    </Button>
                    <Button
                  variant="outline"
                  leftIcon={<Calendar className="h-4 w-4" />}
                  onClick={() => toast.info('Opening scheduler...')}>
                  
                      Schedule
                    </Button>
                  </div>
                  <div className="flex space-x-3">
                    <Button
                  variant="outline"
                  onClick={() => {
                    setShowCompose(false);
                    toast.success('Draft saved');
                  }}>
                  
                      Save Draft
                    </Button>
                    <Button
                  leftIcon={<Send className="h-4 w-4" />}
                  onClick={() => {
                    setShowCompose(false);
                    toast.success('Email sent');
                  }}>
                  
                      Send Email
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
        }
        </div>
      }

      {/* ===== NOTIFICATIONS TAB ===== */}
      {activeTab === 'notifications' &&
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Notifications */}
          <Card>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Recent Notifications
            </h3>
            <div className="space-y-0 divide-y divide-gray-100">
              {[
            {
              icon: <FileCheck className="h-5 w-5 text-green-600" />,
              bg: 'bg-green-50',
              title: 'New Assessment Submission',
              desc: 'Thabo Mokoena submitted Database Development Assessment',
              time: '2 hours ago'
            },
            {
              icon: <MessageSquare className="h-5 w-5 text-blue-600" />,
              bg: 'bg-blue-50',
              title: 'New Message',
              desc: 'MICT SETA Support sent you a message regarding verification visit',
              time: 'Yesterday'
            },
            {
              icon: <Calendar className="h-5 w-5 text-amber-600" />,
              bg: 'bg-amber-50',
              title: 'Upcoming Workshop',
              desc: 'Reminder: Practical Workshop scheduled for tomorrow at 10:00 AM',
              time: 'Yesterday'
            },
            {
              icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
              bg: 'bg-red-50',
              title: 'SETA Compliance Alert',
              desc: 'Workplace Assessment Documentation due in 3 days',
              time: '2 days ago'
            },
            {
              icon: <UserPlus className="h-5 w-5 text-purple-600" />,
              bg: 'bg-purple-50',
              title: 'New Learner Registration',
              desc: 'Nomsa Dlamini has been added to IT Skills Development Program',
              time: '3 days ago'
            }].
            map((notif, i) =>
            <div
              key={i}
              className="flex items-start py-4 first:pt-0 last:pb-0">
              
                  <div
                className={`p-2 rounded-full ${notif.bg} mr-3 flex-shrink-0`}>
                
                    {notif.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-brand-blue">
                      {notif.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{notif.desc}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-4">
                    {notif.time}
                  </span>
                </div>
            )}
            </div>
            <div className="mt-4 text-center">
              <button
              onClick={() => setActiveTab('notifications')}
              className="text-sm text-brand-blue hover:underline">
              
                View all notifications
              </button>
            </div>
          </Card>

          {/* Notification Settings */}
          <Card>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Notification Settings
            </h3>
            <table className="w-full">
              <thead>
                <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="text-left pb-3">Notification Type</th>
                  <th className="text-center pb-3 w-20">Email</th>
                  <th className="text-center pb-3 w-20">Push</th>
                  <th className="text-center pb-3 w-20">SMS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
              {
                type: 'New Messages',
                email: true,
                push: true,
                sms: false
              },
              {
                type: 'Assessment Deadlines',
                email: true,
                push: true,
                sms: true
              },
              {
                type: 'Learner Submissions',
                email: true,
                push: false,
                sms: false
              },
              {
                type: 'SETA Updates',
                email: true,
                push: true,
                sms: true
              },
              {
                type: 'System Announcements',
                email: true,
                push: true,
                sms: false
              }].
              map((setting, i) =>
              <tr key={i}>
                    <td className="py-3 text-sm text-gray-900">
                      {setting.type}
                    </td>
                    <td className="py-3 text-center">
                      <input
                    type="checkbox"
                    defaultChecked={setting.email}
                    className="h-4 w-4 text-brand-blue rounded border-gray-300 focus:ring-brand-blue" />
                  
                    </td>
                    <td className="py-3 text-center">
                      <input
                    type="checkbox"
                    defaultChecked={setting.push}
                    className="h-4 w-4 text-brand-blue rounded border-gray-300 focus:ring-brand-blue" />
                  
                    </td>
                    <td className="py-3 text-center">
                      <input
                    type="checkbox"
                    defaultChecked={setting.sms}
                    className="h-4 w-4 text-brand-blue rounded border-gray-300 focus:ring-brand-blue" />
                  
                    </td>
                  </tr>
              )}
              </tbody>
            </table>
            <div className="mt-6">
              <Button
              onClick={() => toast.success('Settings updated successfully')}>
              
                Update Settings
              </Button>
            </div>
          </Card>
        </div>
      }

      {/* ===== GROUPS TAB ===== */}
      {activeTab === 'groups' &&
      <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">
              Communication Groups
            </h3>
            <Button
            leftIcon={<Users className="h-4 w-4" />}
            onClick={() => setShowCreateGroup(true)}>
            
              Create New Group
            </Button>
          </div>

          {/* Groups Table */}
          <Card noPadding>
            <DataTable data={groups} columns={groupColumns} keyField="id" />
          </Card>

          {/* Group Activity + Tips */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Group Activity">
              <div className="space-y-4">
                {groupActivity.map((item, i) =>
              <div key={i} className="flex items-start">
                    <div className="p-2 bg-blue-50 rounded-full mr-3 flex-shrink-0">
                      <Users className="h-5 w-5 text-brand-blue" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">{item.detail}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {item.time}
                    </span>
                  </div>
              )}
              </div>
            </Card>

            <Card title="Group Management Tips">
              <div className="space-y-3">
                <div className="flex items-start p-3 bg-blue-50 rounded-lg">
                  <Info className="h-5 w-5 text-brand-blue mr-3 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">
                    Create separate groups for each learnership program to
                    better organize communications and ensure learners receive
                    relevant information only.
                  </p>
                </div>
                <div className="flex items-start p-3 bg-blue-50 rounded-lg">
                  <Info className="h-5 w-5 text-brand-blue mr-3 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">
                    Use the bulk invite feature to quickly add multiple learners
                    to a group based on their enrollment in specific learnership
                    programs.
                  </p>
                </div>
                <div className="flex items-start p-3 bg-blue-50 rounded-lg">
                  <Info className="h-5 w-5 text-brand-blue mr-3 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">
                    Regular communication through group messages helps maintain
                    learner engagement and provides a platform for peer support
                    and collaboration.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      }

      {/* Create Group Modal */}
      <Modal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        title="Create New Communication Group">
        
        <div className="space-y-4">
          <Input label="Group Name*" placeholder="Enter group name" />
          <Select
            label="Group Type*"
            options={[
            {
              value: 'learnership',
              label: 'Learnership'
            },
            {
              value: 'staff',
              label: 'Staff'
            },
            {
              value: 'external',
              label: 'External'
            }]
            }
            defaultValue="learnership" />
          
          <Select
            label="Learnership Program*"
            options={[
            {
              value: '',
              label: 'Select a learnership program'
            },
            {
              value: 'it',
              label: 'Technical Support NQF Level 4'
            },
            {
              value: 'business',
              label: 'Business Administration'
            }]
            } />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              placeholder="Enter group description"
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-y" />
            
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="ghost" onClick={() => setShowCreateGroup(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowCreateGroup(false)}>
              Create Group
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Announcement Modal */}
      <Modal
        isOpen={showEditAnnouncement}
        onClose={() => setShowEditAnnouncement(false)}
        title="Edit Announcement">
        
        <div className="space-y-4">
          <Input
            label="Title"
            defaultValue={announcements[selectedAnnouncement]?.title} />
          
          <Select
            label="Audience"
            options={[
            {
              value: 'all_it',
              label: 'All IT Skills Learners'
            },
            {
              value: 'all_learners',
              label: 'All Learners'
            },
            {
              value: 'all_facilitators',
              label: 'All Facilitators'
            }]
            }
            defaultValue={
            announcements[selectedAnnouncement]?.audience ===
            'All IT Skills Learners' ?
            'all_it' :
            announcements[selectedAnnouncement]?.to === 'All Learners' ?
            'all_learners' :
            announcements[selectedAnnouncement]?.to ===
            'All Facilitators' ?
            'all_facilitators' :
            'all_it'
            } />
          
          <Select
            label="Priority"
            options={[
            {
              value: 'High',
              label: 'High'
            },
            {
              value: 'Medium',
              label: 'Medium'
            },
            {
              value: 'Low',
              label: 'Low'
            }]
            }
            defaultValue={announcements[selectedAnnouncement]?.priority} />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Body
            </label>
            <textarea
              defaultValue={announcements[selectedAnnouncement]?.body || ''}
              rows={6}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-y" />
            
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setShowEditAnnouncement(false)}>
              
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowEditAnnouncement(false);
                toast.success('Announcement updated');
              }}>
              
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Announcement Modal */}
      <Modal
        isOpen={showCreateAnnouncement}
        onClose={() => setShowCreateAnnouncement(false)}
        title="Create Announcement">
        
        <div className="space-y-4">
          <Input label="Title" placeholder="Enter announcement title" />
          <Select
            label="Audience"
            options={[
            {
              value: 'all_it',
              label: 'All IT Skills Learners'
            },
            {
              value: 'all_learners',
              label: 'All Learners'
            },
            {
              value: 'all_facilitators',
              label: 'All Facilitators'
            }]
            } />
          
          <Select
            label="Priority"
            options={[
            {
              value: 'High',
              label: 'High'
            },
            {
              value: 'Medium',
              label: 'Medium'
            },
            {
              value: 'Low',
              label: 'Low'
            }]
            } />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Body
            </label>
            <textarea
              placeholder="Type your announcement here..."
              rows={6}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-y" />
            
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setShowCreateAnnouncement(false)}>
              
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowCreateAnnouncement(false);
                toast.success('Announcement created');
              }}>
              
              Create Announcement
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Email Template Modal */}
      <Modal
        isOpen={showEditTemplate}
        onClose={() => setShowEditTemplate(false)}
        title="Edit Email Template">
        
        <div className="space-y-4">
          <Input
            label="Template Name"
            defaultValue={
            editingTemplateIndex !== null ?
            emailTemplates[editingTemplateIndex]?.name :
            ''
            } />
          
          <Input
            label="Subject Line"
            defaultValue={
            editingTemplateIndex !== null ?
            emailTemplates[editingTemplateIndex]?.subject :
            ''
            } />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Body
            </label>
            <textarea
              placeholder="Dear [Name],&#10;&#10;Type your template body here..."
              rows={8}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-y" />
            
            <p className="text-xs text-gray-500 mt-1">
              Available variables: [Name], [Date], [Programme], [Assignment
              Name]
            </p>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="ghost" onClick={() => setShowEditTemplate(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowEditTemplate(false);
                toast.success('Template updated');
              }}>
              
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Email Template Modal */}
      <Modal
        isOpen={showCreateTemplate}
        onClose={() => setShowCreateTemplate(false)}
        title="Create Email Template">
        
        <div className="space-y-4">
          <Input label="Template Name" placeholder="e.g., Welcome Email" />
          <Input
            label="Subject Line"
            placeholder="e.g., Welcome to [Programme]" />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Body
            </label>
            <textarea
              placeholder="Dear [Name],&#10;&#10;Type your template body here..."
              rows={8}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-y" />
            
            <p className="text-xs text-gray-500 mt-1">
              Available variables: [Name], [Date], [Programme], [Assignment
              Name]
            </p>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setShowCreateTemplate(false)}>
              
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowCreateTemplate(false);
                toast.success('Template created');
              }}>
              
              Create Template
            </Button>
          </div>
        </div>
      </Modal>

      {/* Call Modal */}
      <Modal
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        title={callType === 'video' ? 'Video Call' : 'Voice Call'}>
        
        <div className="text-center py-8 space-y-6">
          <div className="relative inline-block">
            <Avatar
              name={selectedContactData?.name || 'Contact'}
              size="lg"
              className="h-24 w-24 text-3xl" />
            
            <div className="absolute bottom-0 right-0 h-6 w-6 bg-green-500 border-4 border-white rounded-full"></div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {selectedContactData?.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">Calling...</p>
          </div>

          <div className="flex justify-center space-x-4 pt-4">
            <button className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <MicOff className="h-5 w-5 text-gray-600" />
            </button>
            {callType === 'video' &&
            <button className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <Video className="h-5 w-5 text-gray-600" />
              </button>
            }
            <button
              className="h-12 w-12 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
              onClick={() => setShowCallModal(false)}>
              
              <Phone className="h-5 w-5 text-white transform rotate-[135deg]" />
            </button>
          </div>
        </div>
      </Modal>
    </div>);

}