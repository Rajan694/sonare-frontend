import React, { useEffect, useState } from 'react';
import { Activity, ArrowDown, ArrowUp, Check, Plus, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import { Switch } from '../components/ui/Switch';
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

  // --- Piped state ---
  const [inputValue, setInputValue] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [savingPiped, setSavingPiped] = useState(false);
  const [pipedActionError, setPipedActionError] = useState<string | null>(null);
  const [pipedSaveSuccess, setPipedSaveSuccess] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<PipedHealthTestResult | null>(null);

  // --- In-App YouTube state ---
  const [inAppYoutubeVal, setInAppYoutubeVal] = useState<boolean>(true);
  const [clientsVal, setClientsVal] = useState<string[]>(['VISIONOS']);
  const [clientToAdd, setClientToAdd] = useState<string>('');
  const [savingInApp, setSavingInApp] = useState(false);
  const [inAppActionError, setInAppActionError] = useState<string | null>(null);
  const [inAppSaveSuccess, setInAppSaveSuccess] = useState(false);

  useEffect(() => {
    if (data) {
      setInputValue(data.pipedApiUrl.saved ?? '');
      setInAppYoutubeVal(data.inAppYoutube.saved ?? data.inAppYoutube.effective);
      setClientsVal(data.youtubeClients.saved ? [...data.youtubeClients.saved] : [...data.youtubeClients.effective]);
      setInitialized(true);
    }
  }, [data]);

  // --- Piped calculations ---
  const savedPipedValue = data?.pipedApiUrl.saved ?? '';
  const trimmedPipedInput = inputValue.trim();
  const isPipedChanged = trimmedPipedInput !== savedPipedValue.trim();
  const isPipedValid = isValidHttpUrl(trimmedPipedInput);
  const canSavePiped = initialized && isPipedChanged && isPipedValid && !savingPiped;

  const urlToTest = trimmedPipedInput || data?.pipedApiUrl.effective || '';
  const canTestPiped = initialized && isValidHttpUrl(urlToTest) && urlToTest.length > 0 && !testing;

  // --- In-App YouTube calculations ---
  const savedInAppVal = data?.inAppYoutube.saved;
  const savedClientsVal = data?.youtubeClients.saved;

  const currentClientsSaved = savedClientsVal ?? data?.youtubeClients.default ?? ['VISIONOS'];
  const currentInAppSaved = savedInAppVal ?? true;

  const isClientsChanged =
    clientsVal.length !== currentClientsSaved.length || clientsVal.some((c, i) => c !== currentClientsSaved[i]);
  const isInAppToggleChanged = inAppYoutubeVal !== currentInAppSaved;
  const isInAppChanged = isClientsChanged || isInAppToggleChanged;

  const isClientsValid = clientsVal.length >= 1 && clientsVal.length <= 5;
  const canSaveInApp = initialized && isInAppChanged && isClientsValid && !savingInApp;

  const allowedClients = data?.youtubeClients.allowed ?? [];
  const availableClientsToAdd = allowedClients.filter((c) => !clientsVal.includes(c));

  // --- Piped handlers ---
  const handleSavePiped = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSavePiped) return;

    setSavingPiped(true);
    setPipedActionError(null);
    setPipedSaveSuccess(false);

    try {
      const nextUrl = trimmedPipedInput ? trimmedPipedInput : null;
      const updated = await adminApi.saveSettings({ pipedApiUrl: nextUrl });
      setData(updated);
      setInputValue(updated.pipedApiUrl.saved ?? '');
      setPipedSaveSuccess(true);
      setTimeout(() => setPipedSaveSuccess(false), 3000);
    } catch (err) {
      setPipedActionError((err as Error).message);
    } finally {
      setSavingPiped(false);
    }
  };

  const handleTestPiped = async () => {
    if (!canTestPiped) return;

    setTesting(true);
    setTestResult(null);
    setPipedActionError(null);

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
    setPipedSaveSuccess(false);
  };

  // --- In-App YouTube handlers ---
  const handleMoveClient = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= clientsVal.length) return;
    const next = [...clientsVal];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    setClientsVal(next);
    setInAppSaveSuccess(false);
  };

  const handleRemoveClient = (client: string) => {
    if (clientsVal.length <= 1) return;
    setClientsVal(clientsVal.filter((c) => c !== client));
    setInAppSaveSuccess(false);
  };

  const handleAddClient = () => {
    if (!clientToAdd || clientsVal.includes(clientToAdd) || clientsVal.length >= 5) return;
    setClientsVal([...clientsVal, clientToAdd]);
    setClientToAdd('');
    setInAppSaveSuccess(false);
  };

  const handleSaveInApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSaveInApp) return;

    setSavingInApp(true);
    setInAppActionError(null);
    setInAppSaveSuccess(false);

    try {
      const updated = await adminApi.saveSettings({
        inAppYoutube: inAppYoutubeVal,
        youtubeClients: clientsVal,
      });
      setData(updated);
      setInAppYoutubeVal(updated.inAppYoutube.saved ?? updated.inAppYoutube.effective);
      setClientsVal(
        updated.youtubeClients.saved ? [...updated.youtubeClients.saved] : [...updated.youtubeClients.effective],
      );
      setInAppSaveSuccess(true);
      setTimeout(() => setInAppSaveSuccess(false), 3000);
    } catch (err) {
      setInAppActionError((err as Error).message);
    } finally {
      setSavingInApp(false);
    }
  };

  const handleResetInAppDefaults = async () => {
    setSavingInApp(true);
    setInAppActionError(null);
    setInAppSaveSuccess(false);

    try {
      const updated = await adminApi.saveSettings({
        inAppYoutube: null,
        youtubeClients: null,
      });
      setData(updated);
      setInAppYoutubeVal(updated.inAppYoutube.effective);
      setClientsVal([...updated.youtubeClients.effective]);
      setInAppSaveSuccess(true);
      setTimeout(() => setInAppSaveSuccess(false), 3000);
    } catch (err) {
      setInAppActionError((err as Error).message);
    } finally {
      setSavingInApp(false);
    }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Upstream API configuration and system-level defaults.">
        <button type="button" className="chip" onClick={reload} aria-label="Refresh">
          <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} aria-hidden /> Refresh
        </button>
      </PageHeader>

      {error && (
        <div className="mb-4">
          <Notice>{error}</Notice>
        </div>
      )}

      <div className="max-w-[720px] flex flex-col gap-6">
        {/* Piped API Panel */}
        <Panel
          title="Piped API"
          subtitle="The backend's upstream YouTube API. A value saved here overrides .env PIPED_API_URL immediately without requiring a backend restart."
        >
          {pipedActionError && (
            <div className="mb-4">
              <Notice>{pipedActionError}</Notice>
            </div>
          )}

          <form onSubmit={handleSavePiped} className="flex flex-col gap-4">
            <div>
              <TextInput
                label="API Base URL"
                placeholder={data?.pipedApiUrl.envDefault ?? 'http://localhost:8090'}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setTestResult(null);
                  setPipedSaveSuccess(false);
                }}
                disabled={loading || savingPiped}
                spellCheck={false}
                hint={
                  trimmedPipedInput && !isPipedValid ? (
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

            {pipedSaveSuccess && (
              <div role="status" className="text-body-s text-acc flex items-center gap-1.5">
                <Check size={15} aria-hidden />
                Settings saved successfully.
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-ln">
              <Button type="submit" variant="acc" disabled={!canSavePiped}>
                {savingPiped ? 'Saving…' : 'Save'}
              </Button>

              <Button type="button" variant="out" onClick={handleTestPiped} disabled={!canTestPiped}>
                <Activity size={15} className={testing ? 'animate-pulse' : undefined} aria-hidden />
                {testing ? 'Testing…' : 'Test'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleUseEnvDefault}
                disabled={loading || savingPiped || inputValue === ''}
              >
                <RotateCcw size={15} aria-hidden />
                Use .env default
              </Button>
            </div>
          </form>
        </Panel>

        {/* In-app YouTube Panel */}
        <Panel
          title="In-app YouTube (Android & desktop apps)"
          subtitle="Configure client extraction directly inside the apps."
        >
          {inAppActionError && (
            <div className="mb-4">
              <Notice>{inAppActionError}</Notice>
            </div>
          )}

          <form onSubmit={handleSaveInApp} className="flex flex-col gap-5">
            {/* Kill switch */}
            <div className="flex items-start justify-between gap-4 p-3.5 bg-s2 rounded-md border border-ln">
              <div className="min-w-0">
                <span className="text-label-l text-t1 block">Fetch YouTube inside the apps</span>
                <span className="text-body-s text-t3 block mt-0.5">
                  When off, every app goes straight to the backend's Piped instance.
                </span>
              </div>
              <Switch
                checked={inAppYoutubeVal}
                onCheckedChange={(checked) => {
                  setInAppYoutubeVal(checked);
                  setInAppSaveSuccess(false);
                }}
                disabled={loading || savingInApp}
                aria-label="Fetch YouTube inside the apps"
              />
            </div>

            {/* Ordered clients list */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <label className="text-label-l text-t2">youtubei.js Clients (tried in order)</label>
                <span className="text-label-m text-t3">{clientsVal.length} / 5</span>
              </div>

              <div className="flex flex-col gap-1.5 border border-ln rounded-md p-2 bg-s2">
                {clientsVal.map((client, idx) => (
                  <div
                    key={client}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded bg-s1 border border-ln text-body-m"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-label-m text-t4 w-4">{idx + 1}.</span>
                      <span className="font-mono text-t1 font-medium">{client}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="ib ib-28 text-t3 hover:text-t1 disabled:opacity-30"
                        onClick={() => handleMoveClient(idx, 'up')}
                        disabled={idx === 0 || loading || savingInApp}
                        aria-label={`Move ${client} up`}
                      >
                        <ArrowUp size={14} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="ib ib-28 text-t3 hover:text-t1 disabled:opacity-30"
                        onClick={() => handleMoveClient(idx, 'down')}
                        disabled={idx === clientsVal.length - 1 || loading || savingInApp}
                        aria-label={`Move ${client} down`}
                      >
                        <ArrowDown size={14} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="ib ib-28 text-t3 hover:text-red disabled:opacity-30"
                        onClick={() => handleRemoveClient(client)}
                        disabled={clientsVal.length <= 1 || loading || savingInApp}
                        aria-label={`Remove ${client}`}
                      >
                        <Trash2 size={14} aria-hidden />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add client picker */}
              {clientsVal.length < 5 && availableClientsToAdd.length > 0 && (
                <div className="mt-2.5 flex items-center gap-2">
                  <select
                    className="h-9 px-3 bg-s2 border border-ln2 rounded-md text-t1 text-body-s outline-none focus:border-acc"
                    value={clientToAdd}
                    onChange={(e) => setClientToAdd(e.target.value)}
                    disabled={loading || savingInApp}
                  >
                    <option value="">Select client to add…</option>
                    {availableClientsToAdd.map((client) => (
                      <option key={client} value={client}>
                        {client}
                      </option>
                    ))}
                  </select>

                  <Button
                    type="button"
                    variant="out"
                    size="sm"
                    onClick={handleAddClient}
                    disabled={!clientToAdd || loading || savingInApp}
                  >
                    <Plus size={14} aria-hidden /> Add client
                  </Button>
                </div>
              )}

              <div className="mt-2 text-label-m text-t3">Default: VISIONOS</div>
            </div>

            {inAppSaveSuccess && (
              <div role="status" className="text-body-s text-acc flex items-center gap-1.5">
                <Check size={15} aria-hidden />
                In-app YouTube settings saved successfully.
              </div>
            )}

            <p className="text-label-m text-t3 italic">
              Apps pick changes up the next time they start or come to the foreground.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-ln">
              <Button type="submit" variant="acc" disabled={!canSaveInApp}>
                {savingInApp ? 'Saving…' : 'Save'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleResetInAppDefaults}
                disabled={
                  loading || savingInApp || (data?.inAppYoutube.saved === null && data?.youtubeClients.saved === null)
                }
              >
                <RotateCcw size={15} aria-hidden />
                Reset to defaults
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </>
  );
};

export default Settings;
