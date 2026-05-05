import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { RubricForm } from './RubricForm';
import { useAppStore } from '../../store/appStore';
import { CheckCircle, AlertTriangle, XCircle, History } from 'lucide-react';
interface ModerationAssessment {
  id: number | string;
  learner: string;
  title: string;
  date: string;
}
interface ModerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: ModerationAssessment | null;
}
export function ModerationModal({
  isOpen,
  onClose,
  assessment
}: ModerationModalProps) {
  const { moderateAssessment } = useAppStore();
  const [confirmAction, setConfirmAction] = useState<
    'approve' | 'reject' | 'changes' | null>(
    null);
  const [comment, setComment] = useState('');
  if (!assessment) return null;
  // Mock criteria - in real app would come from assessment
  const criteria = [
  {
    id: 'c1',
    description: 'Demonstrates understanding of HTML5 semantic structure',
    maxScore: 5
  },
  {
    id: 'c2',
    description: 'Applies CSS3 styling effectively and responsively',
    maxScore: 5
  },
  {
    id: 'c3',
    description: 'Implements basic JavaScript interactivity',
    maxScore: 5
  },
  {
    id: 'c4',
    description: 'Code is clean, commented, and follows best practices',
    maxScore: 5
  }];

  const handleConfirm = async () => {
    if (confirmAction) {
      await moderateAssessment(assessment.id, confirmAction, comment);
      setConfirmAction(null);
      setComment('');
      onClose();
    }
  };
  const getActionColor = () => {
    switch (confirmAction) {
      case 'approve':
        return 'bg-green-50 border-green-200';
      case 'reject':
        return 'bg-red-50 border-red-200';
      case 'changes':
        return 'bg-amber-50 border-amber-200';
      default:
        return '';
    }
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Moderation Review: ${assessment.learner}`}
      size="xl">
      
      {confirmAction ?
      <div className="space-y-4">
          <div
          className={`p-4 rounded-lg border ${getActionColor()} flex items-start`}>
          
            {confirmAction === 'approve' &&
          <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
          }
            {confirmAction === 'reject' &&
          <XCircle className="h-6 w-6 text-red-600 mr-3" />
          }
            {confirmAction === 'changes' &&
          <AlertTriangle className="h-6 w-6 text-amber-600 mr-3" />
          }
            <div>
              <h3 className="font-medium text-gray-900 capitalize">
                Confirm{' '}
                {confirmAction === 'changes' ?
              'Request Changes' :
              confirmAction}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Please provide a mandatory comment for the assessor/learner
                regarding this decision.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Moderator Comment <span className="text-red-500">*</span>
            </label>
            <textarea
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-navy focus:ring-brand-navy"
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Enter your feedback here..." />
          
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="ghost" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
            disabled={!comment.trim()}
            variant={confirmAction === 'reject' ? 'danger' : 'primary'}
            onClick={handleConfirm}>
            
              Confirm Decision
            </Button>
          </div>
        </div> :

      <div className="space-y-6">
          <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">Assessment</p>
              <p className="font-medium">{assessment.title}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Submitted</p>
              <p className="font-medium">{assessment.date}</p>
            </div>
            <div>
              <Badge variant="info">In Moderation</Badge>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">
              Assessor's Grading
            </h4>
            <div className="opacity-75 pointer-events-none">
              <RubricForm
              criteria={criteria}
              onSubmit={() => undefined}
              readOnly={true} />
            
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h4 className="font-medium text-gray-900 mb-4">
              Moderation Decision
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button
              variant="outline"
              className="border-green-200 hover:bg-green-50 text-green-700"
              onClick={() => setConfirmAction('approve')}
              leftIcon={<CheckCircle className="h-4 w-4" />}>
              
                Approve
              </Button>
              <Button
              variant="outline"
              className="border-amber-200 hover:bg-amber-50 text-amber-700"
              onClick={() => setConfirmAction('changes')}
              leftIcon={<AlertTriangle className="h-4 w-4" />}>
              
                Request Changes
              </Button>
              <Button
              variant="outline"
              className="border-red-200 hover:bg-red-50 text-red-700"
              onClick={() => setConfirmAction('reject')}
              leftIcon={<XCircle className="h-4 w-4" />}>
              
                Reject
              </Button>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <History className="h-4 w-4 mr-2" />
              Moderation History
            </div>
            <p className="text-xs text-gray-400 italic">
              No previous moderation attempts.
            </p>
          </div>
        </div>
      }
    </Modal>);

}