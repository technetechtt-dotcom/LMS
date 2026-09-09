import React, { useState } from 'react';
import { MessageSquare, X, Star, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { toast } from 'sonner';
import { auditService } from '../../services/api';

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [type, setType] = useState('general');
  const [message, setMessage] = useState('');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await auditService.log(
        'USER_FEEDBACK',
        'feedback',
        type,
        `rating=${rating}; ${message.trim()}`,
      );
      toast.success('Thank you for your feedback!');
      setIsOpen(false);
      setRating(0);
      setType('general');
      setMessage('');
    } catch {
      toast.error('Could not submit feedback');
    }
  };
  return (
    <>
      <AnimatePresence>
        {isOpen &&
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
            scale: 0.95
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1
          }}
          exit={{
            opacity: 0,
            y: 20,
            scale: 0.95
          }}
          className="fixed bottom-20 right-6 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-40 overflow-hidden">
          
            <div className="bg-brand-navy px-4 py-3 flex justify-between items-center">
              <h3 className="text-white font-medium text-sm">Send Feedback</h3>
              <button
              onClick={() => setIsOpen(false)}
              className="text-blue-200 hover:text-white transition-colors">
              
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  How would you rate your experience?
                </label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((star) =>
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="focus:outline-none transition-transform hover:scale-110">
                  
                      <Star
                    className={`h-6 w-6 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                  
                    </button>
                )}
                </div>
              </div>

              <Select
              label="Feedback Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={[
              {
                value: 'general',
                label: 'General Feedback'
              },
              {
                value: 'bug',
                label: 'Report a Bug'
              },
              {
                value: 'feature',
                label: 'Feature Request'
              }]
              } />
            

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tell us more
                </label>
                <textarea
                required
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-navy focus:ring-brand-navy text-sm"
                placeholder="What's on your mind?" />
              
              </div>

              <Button
              type="submit"
              className="w-full"
              size="sm"
              leftIcon={<Send className="h-3 w-3" />}>
              
                Submit Feedback
              </Button>
            </form>
          </motion.div>
        }
      </AnimatePresence>

      <motion.button
        whileHover={{
          scale: 1.05
        }}
        whileTap={{
          scale: 0.95
        }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close feedback form' : 'Open feedback form'}
        aria-expanded={isOpen}
        className={`
          fixed bottom-6 right-6 p-3 rounded-full shadow-lg z-40 transition-colors
          ${isOpen ? 'bg-gray-200 text-gray-600' : 'bg-brand-navy text-white hover:bg-brand-blue'}
        `}>
        
        {isOpen ?
        <X className="h-6 w-6" /> :

        <MessageSquare className="h-6 w-6" />
        }
      </motion.button>
    </>);

}
