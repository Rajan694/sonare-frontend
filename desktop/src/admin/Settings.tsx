import React, { useEffect, useState } from 'react';
import { Activity, Check, RefreshCw, RotateCcw } from 'lucide-react';
import Button from '../components/ui/Button';
import { adminApi, type PipedHealthTestResult } from './api';
import { useLoad } from './useLoad';
import { Notice } from './components/Notice';
import { PageHeader } from './components/PageHeader';
import { Panel } from './components/Panel';
import { TextInput } from './components/TextInput';
import { cn } from '../lib/cn';

const isValidHttpUrl = (str: string): boolean => {
  const trimmed = str.trim();
  if (!trimmed) return true; // empty means use env default
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const Settings = () => {
  const { data, setData, error, loading, reload } = useLoad(() => adminApi.getSettings(), []);
  const [inputValue, setInputValue] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<PipedHealthTestResult | null>(null);

  useEffect(() => {
    if (data) {
      setInputValue(data.pipedApiUrl.saved ?? '');
      setInitialized(true);
    }
  }, [data]);

  const savedValue = data?.pipedApiUrl.saved ?? '';
  const trimmedInput = inputValue.trim();
  const isChanged = trimmedInput !== savedValue.trim();
  const isValid = isValidHttpUrl(trimmedInput);
  const canSave = initialized && isChanged && isValid && !saving;

  const urlToTest = trimmedInput || data?.pipedApiUrl.effective || '';
  const canTest = initialized && isValidHttpUrl(urlToTest) && urlToTest.length > 0 && !testing;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;

    setSaving(true);
    setActionError(null);
    setSaveSuccess(false);

    try {
      const nextUrl = trimmedInput ? trimmedInput : null;
      const updated = await adminApi.saveSettings(nextUrl);
      setData(updated);
      setInputValue(updated.pipedApiUrl.saved ?? '');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!canTest) return;

    setTesting(true);
    setTestResult(null);
    setActionError(null);

    try {
      const res = await adminApi.testPipedUrl(urlToTest);
      setTestResult(res);
    } catch (err) {
      setTestResult({ ok: false, ms: 0, error: (err as Error).message });
    } finally {
      setTesting(false);
    }
  };

  const handleUseEnvDefault = () => {
    setInputValue('');
    setTestResult(null);
    setSaveSuccess(false);
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Upstream API configuration and system-level defaults.">
        <button type="button" className="chip" onClick={reload} aria-label="Refresh">
          <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} aria-hidden /> Refresh
        </button>
      </PageHeader>

      {(error || actionError) && (
        <div className="mb-4">
          <Notice>{error ?? actionError}</Notice>
        </div>
      )}

      <div className="max-w-[720px] flex flex-col gap-4">
        <Panel
          title="Piped API"
          subtitle="The backend's upstream YouTube API. A value saved here overrides .env PIPED_API_URL immediately without requiring a backend restart."
        >
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div>
              <TextInput
                label="API Base URL"
                placeholder={data?.pipedApiUrl.envDefault ?? 'http://localhost:8090'}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setTestResult(null);
                  setSaveSuccess(false);
                }}
                disabled={loading || saving}
                spellCheck={false}
                hint={
                  trimmedInput && !isValid ? (
                    <span className="text-red">Must be a valid http or https URL</span>
                  ) : (
                    'Leave blank to fall back to the .env default.'
                  )
                }
              />

              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-label-m text-t3">
                <span>Effective URL:</span>
                <span className="font-mono text-t1 px-2 py-0.5 rounded bg-s2 border border-ln text-label-s select-all">
                  {data?.pipedApiUrl.effective ?? 'Loading…'}
                </span>
                {data?.pipedApiUrl.saved ? (
                  <span className="badge bg-accbg text-acc">Custom override</span>
                ) : (
                  <span className="badge bg-s3 text-t3">Using .env default</span>
                )}
              </div>
            </div>

            {testResult && (
              <div
                role="status"
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2.5 text-body-s',
                  testResult.ok ? 'bg-accbg text-acc' : 'bg-red/10 text-red',
                )}
              >
                {testResult.ok ? (
                  <>
                    <Check size={16} className="flex-none" aria-hidden />
                    <span>Reachable in {testResult.ms} ms</span>
                  </>
                ) : (
                  <>
                    <Activity size={16} className="flex-none" aria-hidden />
                    <span>{testResult.error ?? 'Connection failed'}</span>
                  </>
                )}
              </div>
            )}

            {saveSuccess && (
              <div role="status" className="text-body-s text-acc flex items-center gap-1.5">
                <Check size={15} aria-hidden />
                Settings saved successfully.
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-ln">
              <Button type="submit" variant="acc" disabled={!canSave}>
                {saving ? 'Saving…' : 'Save'}
              </Button>

              <Button type="button" variant="out" onClick={handleTest} disabled={!canTest}>
                <Activity size={15} className={testing ? 'animate-pulse' : undefined} aria-hidden />
                {testing ? 'Testing…' : 'Test'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleUseEnvDefault}
                disabled={loading || saving || inputValue === ''}
              >
                <RotateCcw size={15} aria-hidden />
                Use .env default
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </>
  );
};

export default Settings;
