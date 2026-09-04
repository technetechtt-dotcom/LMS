import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Save,
  Eye,
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  CheckSquare,
  AlignLeft,
  Upload,
  ToggleLeft,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import type { QuestionType } from '../types';
import { instrumentService } from '../services/api';

type BuilderMcOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

type BuilderQuestion = {
  id: number;
  type: QuestionType;
  text: string;
  points: number;
  options?: BuilderMcOption[];
  correctAnswer?: boolean;
  wordLimit?: number;
};

function parseBuilderOptions(
  options: unknown,
  correctIndex?: number,
): BuilderMcOption[] {
  if (Array.isArray(options)) {
    return options.map((item, oi) => {
      if (typeof item === 'string') {
        return {
          id: `o${oi}`,
          text: item,
          isCorrect: oi === (correctIndex ?? 0),
        };
      }
      const rec = (item ?? {}) as { text?: string; isCorrect?: boolean };
      return {
        id: `o${oi}`,
        text: String(rec.text ?? ''),
        isCorrect:
          typeof rec.isCorrect === 'boolean'
            ? rec.isCorrect
            : oi === (correctIndex ?? 0),
      };
    });
  }
  if (options && typeof options === 'object') {
    const rec = options as { choices?: unknown; correctIndex?: number };
    const choices = Array.isArray(rec.choices) ? rec.choices : [];
    const idx =
      typeof rec.correctIndex === 'number' ? rec.correctIndex : (correctIndex ?? 0);
    return choices.map((text, oi) => ({
      id: `o${oi}`,
      text: String(text),
      isCorrect: oi === idx,
    }));
  }
  return [];
}

function parseTrueFalseCorrect(q: {
  correctAnswer?: unknown;
  options?: unknown;
}): boolean {
  if (typeof q.correctAnswer === 'boolean') return q.correctAnswer;
  if (q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
    const rec = q.options as { correct?: unknown; correctAnswer?: unknown };
    if (typeof rec.correctAnswer === 'boolean') return rec.correctAnswer;
    if (typeof rec.correct === 'boolean') return rec.correct;
    if (rec.correctAnswer != null) {
      return String(rec.correctAnswer).trim().toLowerCase() === 'true';
    }
    if (rec.correct != null) {
      return String(rec.correct).trim().toLowerCase() === 'true';
    }
  }
  return true;
}

export function AssessmentBuilderPage() {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const unitStandardId = searchParams.get('unitStandardId') ?? '';
  const isNew = !routeId || routeId === 'new';
  const [instrumentId, setInstrumentId] = useState(isNew ? '' : (routeId ?? ''));
  const isEditMode = !isNew;
  const [loading, setLoading] = useState(!isNew);
  const [settings, setSettings] = useState({
    title: '',
    programme: '',
    module: '',
    unitStandard: unitStandardId,
    type: 'quiz',
    dueDate: '',
    timeLimit: 60,
    passMark: 50,
    maxAttempts: 3,
    totalMarks: 100,
    status: 'Draft',
  });
  const [questions, setQuestions] = useState<BuilderQuestion[]>([]);
  const [unitStandards, setUnitStandards] = useState<
    Array<{ id: string; code: string; title: string }>
  >([]);
  const [showPreview, setShowPreview] = useState(false);

  const effectiveUnitStandardId = settings.unitStandard || unitStandardId;

  useEffect(() => {
    instrumentService
      .listUnitStandards()
      .then((res) => setUnitStandards(res.data ?? []))
      .catch(() => toast.error('Could not load unit standards'));
  }, []);

  useEffect(() => {
    if (unitStandardId) {
      setSettings((s) => ({ ...s, unitStandard: unitStandardId }));
    }
  }, [unitStandardId]);

  useEffect(() => {
    if (!instrumentId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await instrumentService.getById(instrumentId);
        const data = res.data as {
          title?: string;
          status?: string;
          maxAttempts?: number;
          passMark?: number;
          timeLimitMinutes?: number | null;
          unitStandardId?: string;
          questions?: Array<{
            id: string;
            questionType?: string;
            type?: string;
            content?: string;
            prompt?: string;
            points?: number;
            orderIndex?: number;
            options?: unknown;
            correctIndex?: number;
            correctAnswer?: boolean;
          }>;
        };
        if (cancelled) return;
        setSettings((s) => ({
          ...s,
          title: data.title ?? s.title,
          unitStandard: data.unitStandardId ?? unitStandardId,
          status: data.status === 'PUBLISHED' ? 'Published' : 'Draft',
          maxAttempts: data.maxAttempts ?? s.maxAttempts,
          passMark: data.passMark ?? s.passMark,
          timeLimit: data.timeLimitMinutes ?? s.timeLimit,
        }));
        const mapped = (data.questions ?? []).map((q, idx) => {
          const rawType = String(q.questionType ?? q.type ?? 'essay');
          const type: QuestionType =
            rawType === 'mcq_single' || rawType === 'multiple_choice'
              ? 'multiple_choice'
              : rawType === 'true_false'
                ? 'true_false'
                : rawType === 'short_answer'
                  ? 'short_answer'
                  : rawType === 'file_upload'
                    ? 'file_upload'
                    : 'essay';
          return {
            id: idx + 1,
            type,
            text: String(q.content ?? q.prompt ?? ''),
            points: Number(q.points ?? 10),
            options:
              type === 'multiple_choice'
                ? parseBuilderOptions(q.options, q.correctIndex)
                : undefined,
            correctAnswer:
              type === 'true_false' ? parseTrueFalseCorrect(q) : undefined,
          };
        });
        setQuestions(mapped);
      } catch {
        toast.error('Could not load instrument');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [instrumentId, unitStandardId]);
  const handleAddQuestion = (type: QuestionType) => {
    const newQuestion = {
      id: Date.now(),
      type,
      text: '',
      points: 10,
      options:
      type === 'multiple_choice' ?
      [
      {
        id: 'o1',
        text: '',
        isCorrect: false
      }] :

      undefined,
      correctAnswer: type === 'true_false' ? true : undefined
    };
    setQuestions([...questions, newQuestion]);
    toast.success(`Added new ${type.replace('_', ' ')} question`);
  };
  const handleDeleteQuestion = (id: number) => {
    setQuestions(questions.filter((q) => q.id !== id));
    toast.success('Question removed');
  };
  const handleSave = async (publish = false) => {
    if (!effectiveUnitStandardId) {
      toast.error('Select a unit standard before saving');
      return;
    }
    try {
      const settingsPayload = {
        title: settings.title || 'Draft instrument',
        maxAttempts: settings.maxAttempts,
        passMark: settings.passMark,
        timeLimitMinutes: settings.timeLimit > 0 ? settings.timeLimit : undefined,
      };
      let activeId = instrumentId;
      if (!activeId) {
        const created = await instrumentService.createDraft({
          unitStandardId: effectiveUnitStandardId,
          ...settingsPayload,
        });
        activeId = String(created.data.id ?? '');
        setInstrumentId(activeId);
      } else {
        await instrumentService.update(activeId, settingsPayload);
      }
      const apiQuestions = questions.map((q, idx) => ({
        type: q.type,
        content: q.text,
        points: q.points,
        order: idx + 1,
        options: q.options?.map((o) => o.text),
        correctIndex: q.options?.findIndex((o) => o.isCorrect) ?? 0,
        correctAnswer: q.correctAnswer,
      }));
      await instrumentService.replaceQuestions(activeId, apiQuestions);
      if (publish) {
        await instrumentService.publish(activeId);
        toast.success('Instrument published');
      } else {
        toast.success('Draft saved');
      }
      navigate('/facilitator-assessments');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  };
  const getQuestionIcon = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return <CheckSquare className="h-4 w-4" />;
      case 'true_false':
        return <ToggleLeft className="h-4 w-4" />;
      case 'short_answer':
        return <AlignLeft className="h-4 w-4" />;
      case 'essay':
        return <FileText className="h-4 w-4" />;
      case 'file_upload':
        return <Upload className="h-4 w-4" />;
      default:
        return <HelpCircle className="h-4 w-4" />;
    }
  };
  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6 overflow-hidden">
      {/* Sidebar - Settings */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto p-6 flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Assessment Settings
          </h2>
          <div className="space-y-4">
            <Input
              label="Title"
              value={settings.title}
              onChange={(e) =>
              setSettings({
                ...settings,
                title: e.target.value
              })
              }
              placeholder="Assessment Title" />
            
            <Select
              label="Programme"
              value={settings.programme}
              onChange={(e) =>
              setSettings({
                ...settings,
                programme: e.target.value
              })
              }
              options={[
              {
                value: 'it',
                label: 'IT Skills Program'
              },
              {
                value: 'business',
                label: 'Business Administration'
              },
              {
                value: 'safety',
                label: 'Workplace Safety'
              }]
              } />
            
            <Select
              label="Module"
              value={settings.module}
              onChange={(e) =>
              setSettings({
                ...settings,
                module: e.target.value
              })
              }
              options={[
              {
                value: 'm1',
                label: 'Module 1'
              },
              {
                value: 'm2',
                label: 'Module 2'
              },
              {
                value: 'm3',
                label: 'Module 3'
              }]
              } />
            
            <Select
              label="Unit Standard"
              value={settings.unitStandard}
              onChange={(e) =>
              setSettings({
                ...settings,
                unitStandard: e.target.value
              })
              }
              options={[
              {
                value: '',
                label: 'Select Unit Standard'
              },
              ...unitStandards.map((u) => ({
                value: u.id,
                label: `${u.code} — ${u.title}`,
              })),
              ]}
              />
            
            <Input
              label="Max attempts"
              type="number"
              min={0}
              value={settings.maxAttempts}
              onChange={(e) =>
              setSettings({
                ...settings,
                maxAttempts: Number(e.target.value)
              })
              } />
            
            <Select
              label="Type"
              value={settings.type}
              onChange={(e) =>
              setSettings({
                ...settings,
                type: e.target.value
              })
              }
              options={[
              {
                value: 'quiz',
                label: 'Quiz'
              },
              {
                value: 'practical',
                label: 'Practical'
              },
              {
                value: 'portfolio',
                label: 'Portfolio'
              },
              {
                value: 'oral',
                label: 'Oral Assessment'
              }]
              } />
            
            <Input
              label="Due Date"
              type="date"
              value={settings.dueDate}
              onChange={(e) =>
              setSettings({
                ...settings,
                dueDate: e.target.value
              })
              } />
            
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Time (min)"
                type="number"
                value={settings.timeLimit}
                onChange={(e) =>
                setSettings({
                  ...settings,
                  timeLimit: Number(e.target.value)
                })
                } />
              
              <Input
                label="Pass %"
                type="number"
                value={settings.passMark}
                onChange={(e) =>
                setSettings({
                  ...settings,
                  passMark: Number(e.target.value)
                })
                } />
              
            </div>
            <Input
              label="Total Marks"
              type="number"
              value={settings.totalMarks}
              onChange={(e) =>
              setSettings({
                ...settings,
                totalMarks: Number(e.target.value)
              })
              } />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Badge
                variant={
                settings.status === 'Published' ? 'success' : 'warning'
                }>
                
                {settings.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Question Builder */}
      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="text-gray-500 hover:text-gray-700">
              
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              {isEditMode ? 'Edit Assessment' : 'New Assessment'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              leftIcon={<Eye className="h-4 w-4" />}
              onClick={() => setShowPreview(true)}
              disabled={questions.length === 0}>
              Preview
            </Button>
            <Button
              variant="outline"
              leftIcon={<Save className="h-4 w-4" />}
              onClick={() => void handleSave(false)}>
              Save draft
            </Button>
            <Button
              leftIcon={<Save className="h-4 w-4" />}
              onClick={() => void handleSave(true)}>
              Publish
            </Button>
          </div>
        </div>

        {/* Builder Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="text-center text-gray-500 py-12">Loading instrument…</div>
          ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                Questions ({questions.length})
              </h2>
              <div className="relative group">
                <Button leftIcon={<Plus className="h-4 w-4" />}>
                  Add Question
                </Button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 hidden group-hover:block z-10">
                  <div className="py-1">
                    {[
                    {
                      type: 'multiple_choice',
                      label: 'Multiple Choice'
                    },
                    {
                      type: 'true_false',
                      label: 'True / False'
                    },
                    {
                      type: 'short_answer',
                      label: 'Short Answer'
                    },
                    {
                      type: 'essay',
                      label: 'Essay'
                    },
                    {
                      type: 'file_upload',
                      label: 'File Upload'
                    }].
                    map((item) =>
                    <button
                      key={item.type}
                      onClick={() =>
                      handleAddQuestion(item.type as QuestionType)
                      }
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      
                        {item.label}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {questions.map((q, index) =>
            <Card key={q.id} className="relative group">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                  onClick={() => handleDeleteQuestion(q.id)}
                  className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50">
                  
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-start gap-4 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-bold text-gray-600 flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge
                      variant="neutral"
                      className="flex items-center gap-1">
                      
                        {getQuestionIcon(q.type)}
                        <span className="capitalize">
                          {q.type.replace('_', ' ')}
                        </span>
                      </Badge>
                      <div className="flex items-center gap-2 ml-auto mr-8">
                        <span className="text-sm text-gray-500">Points:</span>
                        <input
                        type="number"
                        className="w-16 h-8 text-sm border-gray-300 rounded-md"
                        value={q.points}
                        onChange={(e) => {
                          const newQuestions = [...questions];
                          newQuestions[index].points = Number(e.target.value);
                          setQuestions(newQuestions);
                        }} />
                      
                      </div>
                    </div>

                    <textarea
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-brand-navy focus:border-brand-navy"
                    placeholder="Enter question text..."
                    rows={2}
                    value={q.text}
                    onChange={(e) => {
                      const newQuestions = [...questions];
                      newQuestions[index].text = e.target.value;
                      setQuestions(newQuestions);
                    }} />
                  

                    {/* Type Specific Fields */}
                    {q.type === 'multiple_choice' &&
                  <div className="space-y-2 pl-4 border-l-2 border-gray-100">
                        {q.options?.map((opt: BuilderMcOption, optIndex: number) =>
                    <div key={opt.id} className="flex items-center gap-3">
                            <input
                        type="radio"
                        name={`correct-${q.id}`}
                        checked={opt.isCorrect}
                        onChange={() => {
                          const newQuestions = [...questions];
                          const mq = newQuestions[index];
                          if (
                            mq.type !== 'multiple_choice' ||
                            !mq.options?.[optIndex]
                          )
                            return;
                          mq.options.forEach((o) => {
                            o.isCorrect = false;
                          });
                          mq.options[optIndex].isCorrect = true;
                          setQuestions(newQuestions);
                        }} />
                      
                            <input
                        type="text"
                        className="flex-1 h-8 text-sm border-gray-300 rounded-md"
                        value={opt.text}
                        placeholder={`Option ${optIndex + 1}`}
                        onChange={(e) => {
                          const newQuestions = [...questions];
                          const mq = newQuestions[index];
                          if (
                            mq.type !== 'multiple_choice' ||
                            !mq.options?.[optIndex]
                          )
                            return;
                          mq.options[optIndex].text = e.target.value;
                          setQuestions(newQuestions);
                        }} />
                      
                          </div>
                    )}
                        <button
                      className="text-sm text-brand-blue hover:underline pl-6"
                      onClick={() => {
                        const newQuestions = [...questions];
                        const mq = newQuestions[index];
                        if (mq.type !== 'multiple_choice') return;
                        if (!mq.options) mq.options = [];
                        mq.options.push({
                          id: `o${Date.now()}`,
                          text: '',
                          isCorrect: false,
                        });
                        setQuestions(newQuestions);
                      }}>
                      
                          + Add Option
                        </button>
                      </div>
                  }

                    {q.type === 'essay' &&
                  <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            Word Limit:
                          </span>
                          <input
                        type="number"
                        className="w-20 h-8 text-sm border-gray-300 rounded-md"
                        value={q.wordLimit}
                        onChange={(e) => {
                          const newQuestions = [...questions];
                          newQuestions[index].wordLimit = Number(
                            e.target.value
                          );
                          setQuestions(newQuestions);
                        }} />
                      
                        </div>
                      </div>
                  }

                    {q.type === 'true_false' &&
                  <div className="flex items-center gap-6 pl-4 border-l-2 border-gray-100">
                        <span className="text-sm text-gray-500">Correct answer:</span>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="radio"
                            name={`tf-correct-${q.id}`}
                            checked={q.correctAnswer === true}
                            onChange={() => {
                              const next = [...questions];
                              next[index].correctAnswer = true;
                              setQuestions(next);
                            }} />
                          True
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="radio"
                            name={`tf-correct-${q.id}`}
                            checked={q.correctAnswer === false}
                            onChange={() => {
                              const next = [...questions];
                              next[index].correctAnswer = false;
                              setQuestions(next);
                            }} />
                          False
                        </label>
                      </div>
                  }

                    {q.type === 'file_upload' &&
                  <div className="p-4 bg-gray-50 rounded-md border border-dashed border-gray-300 text-center text-sm text-gray-500">
                        Learners will upload a file here.
                      </div>
                  }
                  </div>
                </div>
              </Card>
            )}
            <div className="h-20"></div>
          </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Assessment preview"
        size="lg">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {settings.title || 'Untitled'} · Pass {settings.passMark}% ·{' '}
            {settings.timeLimit} min · {settings.maxAttempts} attempts max
          </p>
          {questions.map((q, i) => (
            <div key={q.id} className="border rounded-lg p-4">
              <p className="font-medium text-gray-900">
                {i + 1}. {q.text || '(No prompt)'}
              </p>
              <p className="text-xs text-gray-500 mt-1 capitalize">
                {q.type.replace('_', ' ')} · {q.points} marks
              </p>
            </div>
          ))}
        </div>
      </Modal>
    </div>);

}