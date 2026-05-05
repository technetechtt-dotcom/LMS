import React, { useState } from 'react';
import { Search, Send, Paperclip, MoreVertical } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { FileUpload } from '../components/ui/FileUpload';
import { Select } from '../components/ui/Select';
import { api } from '../services/api';
import { toast } from 'sonner';
export function MessagingPage() {
  const [selectedChat, setSelectedChat] = useState<string | null>('1');
  const [replyText, setReplyText] = useState('');
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  // Mock conversations
  const conversations = [
  {
    id: '1',
    user: 'Sarah Khumalo',
    role: 'Facilitator',
    subject: 'Assessment Feedback',
    preview: 'Please review the comments on your latest submission...',
    time: '2h ago',
    unread: true,
    avatar: 'SK'
  },
  {
    id: '2',
    user: 'David Naidoo',
    role: 'Workplace Mentor',
    subject: 'Logbook Sign-off',
    preview: 'I have signed off on your Month 2 logbook.',
    time: '1d ago',
    unread: false,
    avatar: 'DN'
  },
  {
    id: '3',
    user: 'System Admin',
    role: 'Admin',
    subject: 'Platform Maintenance',
    preview: 'The LMS will be undergoing scheduled maintenance...',
    time: '2d ago',
    unread: false,
    avatar: 'SA'
  }];

  const messages = [
  {
    id: 1,
    sender: 'Sarah Khumalo',
    text: 'Hi John, please review the comments on your latest submission. You need to expand on the CSS Grid section.',
    time: '10:30 AM',
    isMe: false
  },
  {
    id: 2,
    sender: 'Me',
    text: 'Thanks Sarah, I will make the changes and resubmit by tomorrow.',
    time: '10:45 AM',
    isMe: true
  },
  {
    id: 3,
    sender: 'Sarah Khumalo',
    text: 'Great, let me know if you need any help with the flexbox layout examples.',
    time: '11:00 AM',
    isMe: false
  }];

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    try {
      await api.messages.send('1', 'Reply', replyText);
      toast.success('Message sent');
      setReplyText('');
    } catch (e) {
      toast.error('Failed to send message');
    }
  };
  const handleCompose = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsComposeOpen(false);
    toast.success('Message sent successfully');
  };
  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Conversation List */}
      <Card className="w-1/3 flex flex-col h-full" noPadding>
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">Messages</h2>
            <Button size="sm" onClick={() => setIsComposeOpen(true)}>
              Compose
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search messages..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy" />
            
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((chat) =>
          <div
            key={chat.id}
            onClick={() => setSelectedChat(chat.id)}
            className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${selectedChat === chat.id ? 'bg-blue-50/50' : ''}`}>
            
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center space-x-3">
                  <Avatar initials={chat.avatar} size="sm" />
                  <div>
                    <p
                    className={`text-sm font-medium ${chat.unread ? 'text-gray-900 font-bold' : 'text-gray-700'}`}>
                    
                      {chat.user}
                    </p>
                    <p className="text-xs text-gray-500">{chat.role}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {chat.time}
                </span>
              </div>
              <p
              className={`text-sm mt-2 ${chat.unread ? 'text-gray-900 font-medium' : 'text-gray-600'} truncate`}>
              
                {chat.subject}
              </p>
              <p className="text-xs text-gray-500 mt-1 truncate">
                {chat.preview}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Message Detail */}
      <Card className="flex-1 flex flex-col h-full" noPadding>
        {selectedChat ?
        <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50 rounded-t-lg">
              <div className="flex items-center space-x-3">
                <Avatar initials="SK" />
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Sarah Khumalo
                  </h3>
                  <p className="text-xs text-gray-500">Assessment Feedback</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
              {messages.map((msg) =>
            <div
              key={msg.id}
              className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
              
                  <div
                className={`max-w-[70%] rounded-lg p-4 ${msg.isMe ? 'bg-brand-navy text-white rounded-br-none' : 'bg-gray-100 text-gray-900 rounded-bl-none'}`}>
                
                    <p className="text-sm">{msg.text}</p>
                    <p
                  className={`text-xs mt-2 text-right ${msg.isMe ? 'text-blue-200' : 'text-gray-500'}`}>
                  
                      {msg.time}
                    </p>
                  </div>
                </div>
            )}
            </div>

            {/* Reply Area */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <div className="flex space-x-4">
                <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAttachmentModal(true)}>
                
                  <Paperclip className="h-5 w-5 text-gray-500" />
                </Button>
                <div className="flex-1">
                  <textarea
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-navy focus:ring-brand-navy text-sm p-3"
                  rows={2}
                  placeholder="Type your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)} />
                
                </div>
                <Button onClick={handleSendReply} disabled={!replyText.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </> :

        <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to start messaging
          </div>
        }
      </Card>

      {/* Compose Modal */}
      <Modal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        title="New Message">
        
        <form onSubmit={handleCompose} className="space-y-4">
          <Select
            label="Recipient"
            options={[
            {
              value: 'sarah',
              label: 'Sarah Khumalo (Facilitator)'
            },
            {
              value: 'david',
              label: 'David Naidoo (Mentor)'
            },
            {
              value: 'admin',
              label: 'System Admin'
            }]
            } />
          
          <Input label="Subject" placeholder="Enter message subject" required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-navy focus:ring-brand-navy"
              rows={5}
              required />
            
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="ghost" onClick={() => setIsComposeOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Send Message</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showAttachmentModal}
        onClose={() => setShowAttachmentModal(false)}
        title="Attach File">
        
        <div className="space-y-4">
          <FileUpload onUpload={(files) => console.log(files)} />
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setShowAttachmentModal(false)}>
              
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success('File attached');
                setShowAttachmentModal(false);
              }}>
              
              Attach
            </Button>
          </div>
        </div>
      </Modal>
    </div>);

}