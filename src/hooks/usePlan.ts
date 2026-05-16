import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getPlanRules } from '../lib/plan';

export function usePlan() {
  const { profile } = useAuth();
  return useMemo(() => getPlanRules(profile), [profile]);
}
