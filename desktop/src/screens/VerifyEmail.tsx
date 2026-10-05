import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import { verifyEmail } from '../api/auth';

type Status = 'checking' | 'verified' | 'failed';

/** Opened from the emailed verification link: /verify-email?token=… */
const VerifyEmail = () => {
  const navigate = useNavigate();
  const token = useSearchParams()[0].get('token') ?? '';
  const [status, setStatus] = useState<Status>(token ? 'checking' : 'failed');
  const [error, setError] = useState('This link is incomplete. Open the link from the email again.');
  // The token works once; StrictMode runs effects twice in development.
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    verifyEmail(token)
      .then(() => setStatus('verified'))
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not verify the email');
        setStatus('failed');
      });
  }, [token]);

  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="surf flex flex-col gap-4 p-8 w-full max-w-[400px]">
        <span className="text-h1 text-t1">Verify email</span>
        {status === 'checking' && <span className="text-body-m text-t2">Checking the link…</span>}
        {status === 'verified' && (
          <span className="text-body-m text-t2" role="status">
            Your email is verified. Thanks!
          </span>
        )}
        {status === 'failed' && (
          <span className="text-body-m text-red" role="alert">
            {error}
          </span>
        )}
        <Button variant="acc" onClick={() => navigate('/home', { replace: true })}>
          Go to Sonare
        </Button>
      </div>
    </div>
  );
};
export default VerifyEmail;
