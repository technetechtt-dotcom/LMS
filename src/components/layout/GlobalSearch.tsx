import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  Users,
  BookOpen,
  FileCheck,
  FolderOpen,
  ArrowRight,
  type LucideIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  learnerService,
  programmeService,
  assessmentService
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

type Hit = {
  id: string;
  type: string;
  name: string;
  subtitle: string;
  icon: LucideIcon;
  path: string;
};

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const q = query.trim();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const [{ data: learners }, { data: programmes }, { data: assessments }] =
        await Promise.all([
        learnerService.getAll({ search: q }),
        programmeService.getAll(),
        assessmentService.getAll({ search: q })]
        );

        if (cancelled) return;

        const programmeHits: Hit[] = programmes.
        filter((p) => p.title.toLowerCase().includes(q.toLowerCase())).
        map((p) => ({
          id: p.id,
          type: 'Programme',
          name: p.title,
          subtitle: `${p.code} · NQF ${p.nqfLevel}`,
          icon: BookOpen,
          path: `/programmes/${p.id}`
        }));

        const assessmentPath = (id: string) =>
        user?.role === 'Learner' ?
        `/assessment/${id}/take` :
        `/assessment/${id}/submissions`;

        const hits: Hit[] = [
        ...learners.map((l) => ({
          id: l.id,
          type: 'Learner',
          name: l.name,
          subtitle: l.programmeName,
          icon: Users,
          path: `/learner/${l.id}`
        })),
        ...programmeHits,
        ...assessments.map((a) => ({
          id: a.id,
          type: 'Assessment',
          name: a.title,
          subtitle: `${a.programmeName} · ${a.status}`,
          icon: FileCheck,
          path: assessmentPath(a.id)
        }))];

        setResults(hits.slice(0, 24));
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, user?.role]);

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
    setQuery('');
  };

  const showEmptyPrompt = query.trim() === '';
  return (
    <AnimatePresence>
      {isOpen &&
      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        role="dialog"
        aria-modal="true">
        
          <motion.div
          initial={{
            opacity: 0
          }}
          animate={{
            opacity: 1
          }}
          exit={{
            opacity: 0
          }}
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
          onClick={onClose} />
        

          <motion.div
          initial={{
            opacity: 0,
            scale: 0.95,
            y: -20
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0
          }}
          exit={{
            opacity: 0,
            scale: 0.95,
            y: -20
          }}
          className="relative z-50 mx-auto mt-20 max-w-2xl transform rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 transition-all">
          
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input
              ref={inputRef}
              type="text"
              className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
              placeholder="Search learners, programmes, assessments..."
              value={query}
              onChange={(e) => setQuery(e.target.value)} />
            
              <div className="absolute right-3 top-3 flex items-center gap-2">
                {loading &&
                <span className="text-xs text-gray-400">Searching…</span>
                }
                <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600">
                
                  <span className="sr-only">Close</span>
                  <kbd className="inline-flex items-center rounded border border-gray-200 px-2 font-sans text-xs font-medium text-gray-400">
                    Esc
                  </kbd>
                </button>
              </div>
            </div>

            {showEmptyPrompt &&
          <div className="border-t border-gray-100 px-6 py-14 text-center text-sm sm:px-14">
                <FolderOpen className="mx-auto h-6 w-6 text-gray-400" />
                <p className="mt-4 font-semibold text-gray-900">
                  Search the platform
                </p>
                <p className="mt-2 text-gray-500">
                  Type at least 2 letters to query learners, programmes, and assessments.
                </p>
              </div>
          }

            {!showEmptyPrompt && !loading && results.length === 0 &&
          <div className="border-t border-gray-100 px-6 py-14 text-center text-sm sm:px-14">
                <p className="font-semibold text-gray-900">No results found</p>
                <p className="mt-2 text-gray-500">
                  We couldn't find anything matching "{query}". Try another
                  term.
                </p>
              </div>
          }

            {!showEmptyPrompt && results.length > 0 &&
          <ul className="max-h-96 scroll-py-3 overflow-y-auto border-t border-gray-100 p-3">
                {results.map((item) =>
            <li key={`${item.type}-${item.id}`}>
                    <button
                type="button"
                onClick={() => handleSelect(item.path)}
                className="group flex w-full select-none items-center rounded-md px-3 py-3 hover:bg-gray-50">
                
                      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-brand-navy/10">
                        <item.icon
                    className="h-6 w-6 text-brand-navy"
                    aria-hidden="true" />
                  
                      </div>
                      <div className="ml-4 flex-auto text-left">
                        <p className="text-sm font-medium text-gray-900">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.type} • {item.subtitle}
                        </p>
                      </div>
                      <ArrowRight className="ml-3 h-5 w-5 flex-none text-gray-400 group-hover:text-brand-navy" />
                    </button>
                  </li>
            )}
              </ul>
          }
          </motion.div>
        </div>
      }
    </AnimatePresence>);

}
