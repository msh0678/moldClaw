import { useEffect, useState } from 'react';

interface AppStatus {
  status: 'active' | 'expired';
  message?: string;
}

const STATUS_URL = 'https://raw.githubusercontent.com/msh0678/moldClaw/main/config/app-status.json';

export function useAppStatus() {
  const [appStatus, setAppStatus] = useState<AppStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(STATUS_URL, { cache: 'no-store' })
      .then(res => res.json())
      .then((data: AppStatus) => {
        setAppStatus(data);
        setLoading(false);
      })
      .catch(() => {
        // 네트워크 실패 시 정상 동작 (오프라인 허용)
        setAppStatus({ status: 'active' });
        setLoading(false);
      });
  }, []);

  return { appStatus, loading };
}
