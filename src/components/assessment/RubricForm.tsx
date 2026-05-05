import React, { useState } from 'react';
import { Button } from '../ui/Button';
interface Criteria {
  id: string;
  description: string;
  maxScore: number;
}
interface RubricFormProps {
  criteria: Criteria[];
  onSubmit: (scores: Record<string, number>, comments: string) => void;
  readOnly?: boolean;
}
export function RubricForm({
  criteria,
  onSubmit,
  readOnly = false
}: RubricFormProps) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState('');
  const handleScoreChange = (id: string, score: number) => {
    if (readOnly) return;
    setScores((prev) => ({
      ...prev,
      [id]: score
    }));
  };
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const maxTotal = criteria.reduce((a, b) => a + b.maxScore, 0);
  const percentage = Math.round(totalScore / maxTotal * 100) || 0;
  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            Assessment Rubric
          </h3>
          <div className="text-right">
            <span className="text-2xl font-bold text-brand-navy">
              {totalScore}
            </span>
            <span className="text-gray-500"> / {maxTotal}</span>
            <span
              className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${percentage >= 70 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
              
              {percentage}%
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {criteria.map((item) =>
        <div key={item.id} className="border border-gray-200 rounded-md p-4">
            <div className="flex justify-between items-start mb-3">
              <p className="text-sm text-gray-900 font-medium flex-1">
                {item.description}
              </p>
              <span className="text-xs text-gray-500 ml-4">
                Max: {item.maxScore}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {[...Array(item.maxScore + 1)].map((_, i) =>
            <button
              key={i}
              onClick={() => handleScoreChange(item.id, i)}
              disabled={readOnly}
              className={`
                    w-8 h-8 rounded-full text-sm font-medium transition-colors
                    ${scores[item.id] === i ? 'bg-brand-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                    ${readOnly ? 'cursor-default' : 'cursor-pointer'}
                  `}>
              
                  {i}
                </button>
            )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Assessor Comments
        </label>
        <textarea
          rows={4}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-navy focus:ring-brand-navy sm:text-sm"
          placeholder="Enter feedback for the learner..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          disabled={readOnly} />
        
      </div>

      {!readOnly &&
      <div className="flex justify-end pt-4">
          <Button onClick={() => onSubmit(scores, comments)}>
            Submit Assessment
          </Button>
        </div>
      }
    </div>);

}