import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  MessageSquare,
  Bell,
  Megaphone,
  Mail,
  Users,
  Send,
  Search,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { messagingService, notificationService } from '../services/api';
import type { Message, Notification } from '../types';
import { useAuth } from '../contexts/AuthContext';

type Conversation = {
  peerId: string;
  peerName: string;
  preview: string;
  time: string;
  unread: boolean;
  lastMessageId: string;
};

export function FacilitatorCommunicationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'messages' | 'notifications'>(
    'messages',
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [composeToId, setComposeToId] = useState('');
  const [composeBody, setComposeBody] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [msgRes, notifRes] = await Promise.all([
        messagingService.getConversations(),
        notificationService.list(),
      ]);
      setMessages(msgRes.data ?? []);
      setNotifications(notifRes.data ?? []);
    } catch {
      toast.error('Could not load communication data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const conversations = useMemo((): Conversation[] => {
    const byPeer = new Map<string, Message>();
    for (const m of messages) {
      const peerId = m.fromId === user?.id ? m.toId : m.fromId;
      const existing = byPeer.get(peerId);
      if (!existing || m.createdAt > existing.createdAt) {
        byPeer.set(peerId, m);
      }
    }
    return Array.from(byPeer.entries())
      .map(([peerId, m]) => {
        const isIncoming = m.toId === user?.id;
        const peerName = isIncoming ? m.fromName : m.toName;
        return {
          peerId,
          peerName,
          preview: m.content.slice(0, 80),
          time: new Date(m.createdAt).toLocaleString(),
          unread: isIncoming && !m.isRead,
          lastMessageId: m.id,
        };
      })
      .filter((c) =>
        search.trim()
          ? c.peerName.toLowerCase().includes(search.toLowerCase())
          : true,
      );
  }, [messages, user?.id, search]);

  const thread = useMemo(() => {
    if (!selectedPeerId) return [];
    return messages
      .filter(
        (m) =>
          (m.fromId === selectedPeerId && m.toId === user?.id) ||
          (m.toId === selectedPeerId && m.fromId === user?.id),
      )
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  }, [messages, selectedPeerId, user?.id]);

  const selectedPeerName =
    conversations.find((c) => c.peerId === selectedPeerId)?.peerName ?? 'Contact';

  const sendToPeer = async (toId: string, content: string) => {
    if (!content.trim()) return;
    try {
      await messagingService.send(toId, content.trim());
      toast.success('Message sent');
      setDraft('');
      await load();
    } catch {
      toast.error('Could not send message');
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await notificationService.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch {
      toast.error('Could not update notification');
    }
  };

  const tabs = [
    { id: 'messages' as const, label: 'Messages', icon: MessageSquare },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
  ];

  const legacyTabs = [
    { label: 'Announcements', icon: Megaphone },
    { label: 'Email', icon: Mail },
    { label: 'Groups', icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communication Center</h1>
          <p className="text-sm text-gray-500">
            Direct messages and system notifications
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/messages')}>
            Open full inbox
          </Button>
          <Button leftIcon={<Send className="h-4 w-4" />} onClick={() => setShowCompose(true)}>
            New message
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'primary' : 'outline'}
            size="sm"
            leftIcon={<tab.icon className="h-4 w-4" />}
            onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </Button>
        ))}
        {legacyTabs.map((tab) => (
          <Button
            key={tab.label}
            variant="outline"
            size="sm"
            leftIcon={<tab.icon className="h-4 w-4" />}
            onClick={() => navigate('/messages')}>
            {tab.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : activeTab === 'messages' ? (
        <div className="grid lg:grid-cols-3 gap-4 min-h-[480px]">
          <Card className="lg:col-span-1 p-0 overflow-hidden flex flex-col">
            <div className="p-3 border-b">
              <Input
                placeholder="Search conversations…"
                icon={<Search className="h-4 w-4" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto divide-y">
              {conversations.length === 0 ? (
                <p className="p-4 text-sm text-gray-500">No conversations yet.</p>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.peerId}
                    type="button"
                    onClick={() => setSelectedPeerId(c.peerId)}
                    className={`w-full text-left p-3 hover:bg-gray-50 ${
                      selectedPeerId === c.peerId ? 'bg-blue-50' : ''
                    }`}>
                    <div className="flex items-center gap-3">
                      <Avatar name={c.peerName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-2">
                          <span className="font-medium text-gray-900 truncate">
                            {c.peerName}
                          </span>
                          {c.unread && <Badge variant="info">New</Badge>}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{c.preview}</p>
                        <p className="text-xs text-gray-400">{c.time}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>

          <Card className="lg:col-span-2 flex flex-col p-0 overflow-hidden">
            {!selectedPeerId ? (
              <p className="p-8 text-center text-gray-500">
                Select a conversation or compose a new message.
              </p>
            ) : (
              <>
                <div className="p-4 border-b font-medium">{selectedPeerName}</div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {thread.map((m) => {
                    const isMe = m.fromId === user?.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-md px-4 py-2 rounded-2xl text-sm ${
                            isMe
                              ? 'bg-brand-navy text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                          {m.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="p-4 border-t flex gap-2">
                  <Input
                    placeholder="Type a message…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && selectedPeerId) {
                        void sendToPeer(selectedPeerId, draft);
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      if (selectedPeerId) void sendToPeer(selectedPeerId, draft);
                    }}>
                    Send
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      ) : (
        <Card title="Notifications" className="divide-y">
          {notifications.length === 0 ? (
            <p className="p-4 text-gray-500 text-sm">No notifications.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => void markNotificationRead(n.id)}
                className={`w-full text-left p-4 hover:bg-gray-50 ${
                  !n.read ? 'bg-blue-50/40' : ''
                }`}>
                <p className="font-medium text-gray-900">{n.title}</p>
                <p className="text-sm text-gray-500">{n.description}</p>
              </button>
            ))
          )}
        </Card>
      )}

      <Modal
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        title="New message"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCompose(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!composeToId.trim()) {
                  toast.error('Recipient user ID is required');
                  return;
                }
                await sendToPeer(composeToId.trim(), composeBody);
                setShowCompose(false);
                setComposeToId('');
                setComposeBody('');
              }}>
              Send
            </Button>
          </>
        }>
        <div className="space-y-3">
          <Input
            label="Recipient user ID"
            value={composeToId}
            onChange={(e) => setComposeToId(e.target.value)}
            placeholder="UUID from user directory"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              className="w-full rounded-md border-gray-300"
              rows={4}
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
