import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useAuthStore, UserInfo, ActiveCheckout } from '../stores/authStore';

interface MeResponse {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'developer';
  activeSkills: string[];
  activeCheckout: {
    pageId: string;
    pageName: string;
    gitBranch: string;
    containerId?: string;
  } | null;
}

interface SessionRecoveryState {
  loading: boolean;
  error: string | null;
}

/**
 * Session recovery hook.
 * On app load, calls GET /api/auth/me to restore session.
 * If there's an activeCheckout, verifies container health and redirects to IDE.
 * If container is unhealthy, clears the checkout and shows a message.
 */
export function useSessionRecovery(): SessionRecoveryState {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, setUser, setActiveCheckout, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Only redirect on first mount (app load / page refresh), not on subsequent navigations
  const hasRecovered = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    if (hasRecovered.current) {
      return;
    }

    let cancelled = false;

    const recover = async () => {
      try {
        const res = await apiClient.get<MeResponse>('/auth/me');
        if (cancelled) return;

        const { id, username, displayName, role, activeCheckout: rawCheckout } = res.data;
        setUser({ id, username, displayName, role });

        if (rawCheckout && rawCheckout.pageId) {
          const activeCheckout: ActiveCheckout = {
            pageId: rawCheckout.pageId,
            pageName: rawCheckout.pageName,
            branch: rawCheckout.gitBranch,
          };
          // Verify container health
          try {
            await apiClient.get(`/pages/${activeCheckout.pageId}/container/health`);

            if (cancelled) return;
            setActiveCheckout(activeCheckout);
            // Only redirect if user is NOT already on an IDE page or a specific page
            // (i.e., only redirect from root "/" or "/login" on first load)
            if (!location.pathname.startsWith('/ide/') && !location.pathname.startsWith('/pages')) {
              navigate(`/ide/${activeCheckout.pageId}`, { replace: true });
            }
          } catch {
            if (cancelled) return;
            // Container unhealthy - clear checkout
            setActiveCheckout(null);
            setError('容器状态异常，原签出记录已失效');
          }
        }
      } catch {
        if (cancelled) return;
        // /auth/me failed - token may be invalid
        // 401 interceptor will handle logout+redirect
      } finally {
        if (!cancelled) {
          hasRecovered.current = true;
          setLoading(false);
        }
      }
    };

    recover();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return { loading, error };
}
