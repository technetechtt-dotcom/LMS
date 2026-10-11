import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';
import { workplaceLogService, type WorkplaceLogRow } from '../services/api';

export function WorkplaceLogbookPage() {
  const { linkedLearnerId, user } = useAuth();
  const isLearner = user?.role === 'Learner';
  const isMentor = user?.role === 'Workplace Mentor';
  const [logs, setLogs] = useState<WorkplaceLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    logDate: new Date().toISOString().slice(0, 10),
    hoursWorked: 8,
    activity: '',
    supervisorName: '',
    supervisorEmail: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await workplaceLogService.list(isLearner ? linkedLearnerId ?? undefined : undefined);
    setLogs(res.data ?? []);
  }, [isLearner, linkedLearnerId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isLearner && !linkedLearnerId) {
          if (!cancelled) setLogs([]);
          return;
        }
        await load();
      } catch {
        if (!cancelled) toast.error('Could not load workplace logs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [linkedLearnerId, isLearner, load]);

  const submit = async () => {
    if (!linkedLearnerId) {
      toast.error('No enrolment is linked to this account');
      return;
    }
    if (!form.activity.trim() || !form.supervisorName.trim()) {
      toast.error('Activity and supervisor name are required');
      return;
    }
    try {
      if (editingId) {
        await workplaceLogService.update(editingId, form);
        toast.success('Log updated');
      } else {
        await workplaceLogService.create({
          enrollmentId: linkedLearnerId,
          ...form,
        });
        toast.success('Log submitted for mentor verification');
      }
      setEditingId(null);
      setForm({
        logDate: new Date().toISOString().slice(0, 10),
        hoursWorked: 8,
        activity: '',
        supervisorName: '',
        supervisorEmail: '',
      });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save log');
    }
  };

  const verify = async (id: string, decision: 'approve' | 'reject') => {
    try {
      await workplaceLogService.mentorVerify(id, decision, feedback[id]);
      toast.success(decision === 'approve' ? 'Log verified' : 'Log returned to learner');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not verify log');
    }
  };

  const learnerName = (log: WorkplaceLogRow) => {
    const learner = log.enrollment?.learner;
    return learner ? `${learner.firstName} ${learner.lastName}`.trim() : 'Learner';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Workplace logbook</h1>
        <p className="text-sm text-gray-500">
          {isLearner
            ? `Record workplace hours for ${user?.name ?? 'your enrolment'}. Mentors verify entries before they count toward completion.`
            : isMentor
              ? 'Review and verify workplace hours for allocated learners.'
              : 'Review workplace hours submitted across your organisation.'}
        </p>
      </div>

      {isLearner && (
        <Card className="p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">
            {editingId ? 'Edit or resubmit entry' : 'New log entry'}
          </h2>
          {!linkedLearnerId ? (
            <p className="text-sm text-amber-700">No enrolment is linked to this account.</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Log date"
                  type="date"
                  value={form.logDate}
                  onChange={(e) => setForm({ ...form, logDate: e.target.value })}
                />
                <Input
                  label="Hours worked"
                  type="number"
                  value={String(form.hoursWorked)}
                  onChange={(e) => setForm({ ...form, hoursWorked: Number(e.target.value) })}
                />
                <Input
                  label="Supervisor name"
                  value={form.supervisorName}
                  onChange={(e) => setForm({ ...form, supervisorName: e.target.value })}
                />
                <Input
                  label="Supervisor email"
                  value={form.supervisorEmail}
                  onChange={(e) => setForm({ ...form, supervisorEmail: e.target.value })}
                />
              </div>
              <label className="block text-sm font-medium text-gray-700">
                Activity
                <textarea
                  className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm"
                  rows={3}
                  value={form.activity}
                  onChange={(e) => setForm({ ...form, activity: e.target.value })}
                />
              </label>
              <div className="flex gap-2">
                <Button onClick={() => void submit()}>
                  {editingId ? 'Save and resubmit' : 'Submit log'}
                </Button>
                {editingId && (
                  <Button variant="outline" onClick={() => setEditingId(null)}>
                    Cancel edit
                  </Button>
                )}
              </div>
            </>
          )}
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-semibold text-gray-900 mb-3">
          {isLearner ? 'Your entries' : 'Workplace entries'}
        </h2>
        {loading ? (
          <p className="text-gray-500">Loading workplace logs…</p>
        ) : logs.length === 0 ? (
          <p className="text-gray-500">No workplace logs recorded yet.</p>
        ) : (
          <ul className="space-y-3">
            {logs.map((log) => (
              <li key={log.id} className="border border-gray-200 rounded-md p-3">
                <div className="flex justify-between gap-3">
                  <div>
                    {!isLearner && (
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        {learnerName(log)}
                        {log.enrollment?.programme?.title
                          ? ` • ${log.enrollment.programme.title}`
                          : ''}
                      </p>
                    )}
                    <p className="font-medium text-gray-900">{log.activity}</p>
                    <p className="text-sm text-gray-500">
                      {String(log.logDate).slice(0, 10)} • {String(log.hoursWorked)} hours
                    </p>
                    {log.mentorFeedback && (
                      <p className="text-sm text-amber-700 mt-1">{log.mentorFeedback}</p>
                    )}
                  </div>
                  <Badge variant="neutral">{log.mentorStatus}</Badge>
                </div>
                {isLearner && log.mentorStatus !== 'VERIFIED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => {
                      setEditingId(log.id);
                      setForm({
                        logDate: String(log.logDate).slice(0, 10),
                        hoursWorked: Number(log.hoursWorked),
                        activity: log.activity,
                        supervisorName: log.supervisorName,
                        supervisorEmail: log.supervisorEmail ?? '',
                      });
                    }}>
                    Edit / resubmit
                  </Button>
                )}
                {isMentor && log.mentorStatus !== 'VERIFIED' && (
                  <div className="mt-3 space-y-2">
                    <Input
                      label="Mentor feedback"
                      value={feedback[log.id] ?? ''}
                      onChange={(e) =>
                        setFeedback((prev) => ({ ...prev, [log.id]: e.target.value }))
                      }
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => void verify(log.id, 'approve')}>
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void verify(log.id, 'reject')}>
                        Return
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
