import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HelpCircle,
  Book,
  MessageCircle,
  Phone,
  Mail,
  ExternalLink,
  Search } from
'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
export function HelpPage() {
  const navigate = useNavigate();
  const faqs = [
  {
    question: 'How do I reset my password?',
    answer:
    'You can reset your password by clicking the "Forgot Password" link on the login page. An email with reset instructions will be sent to your registered email address.'
  },
  {
    question: 'Where can I find my certificates?',
    answer:
    'Once you have completed a programme and it has been verified by the SETA, your certificate will be available for download under the "Certificates" tab in your dashboard.'
  },
  {
    question: 'How do I contact my facilitator?',
    answer:
    'You can send a direct message to your facilitator using the "Messages" feature in the sidebar. Select your facilitator from the contacts list to start a conversation.'
  },
  {
    question: 'What happens if I miss an assessment deadline?',
    answer:
    'If you miss an assessment deadline, you must contact your facilitator immediately. Depending on the circumstances, you may be granted an extension or required to submit a supplementary assessment.'
  }];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          How can we help you today?
        </h1>
        <div className="max-w-xl mx-auto">
          <Input
            placeholder="Search for articles, tutorials, or FAQs..."
            icon={<Search className="h-5 w-5" />} />
          
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="text-center hover:border-brand-navy transition-colors cursor-pointer">
          <div className="mx-auto h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <Book className="h-6 w-6 text-brand-blue" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Knowledge Base</h3>
          <p className="text-sm text-gray-500 mb-4">
            Browse our comprehensive guides and tutorials.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              document
                .getElementById('help-faq')
                ?.scrollIntoView({ behavior: 'smooth' });
            }}>
            
            Browse Articles
          </Button>
        </Card>

        <Card className="text-center hover:border-brand-navy transition-colors cursor-pointer">
          <div className="mx-auto h-12 w-12 bg-green-50 rounded-full flex items-center justify-center mb-4">
            <MessageCircle className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Live Chat</h3>
          <p className="text-sm text-gray-500 mb-4">
            Chat with our support team in real-time.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/messages')}>
            
            Start Chat
          </Button>
        </Card>

        <Card className="text-center hover:border-brand-navy transition-colors cursor-pointer">
          <div className="mx-auto h-12 w-12 bg-amber-50 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-amber-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Email Support</h3>
          <p className="text-sm text-gray-500 mb-4">
            Send us an email and we'll get back to you.
          </p>
          <a
            href="mailto:support@skillspro.co.za?subject=SkillForge%20Support"
            className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-transparent px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            
            Contact Us
          </a>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2" id="help-faq">
          <Card title="Frequently Asked Questions">
            <div className="space-y-4">
              {faqs.map((faq, i) =>
              <div
                key={i}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                
                  <h4 className="font-bold text-gray-900 mb-2 flex items-start">
                    <HelpCircle className="h-5 w-5 text-brand-blue mr-2 flex-shrink-0 mt-0.5" />
                    {faq.question}
                  </h4>
                  <p className="text-sm text-gray-600 ml-7">{faq.answer}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div>
          <Card title="Contact Information">
            <div className="space-y-4">
              <div className="flex items-start">
                <Phone className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Phone Support</p>
                  <p className="text-sm text-gray-500">0800 123 456</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Mon-Fri, 8am - 5pm SAST
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Email Support</p>
                  <p className="text-sm text-brand-blue hover:underline cursor-pointer">
                    support@skillspro.co.za
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <a
                  href="https://www.skillforge.co.za/support"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-transparent px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  
                  Visit Support Portal
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>);

}