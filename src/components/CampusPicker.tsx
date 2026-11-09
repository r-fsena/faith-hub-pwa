import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFeatureFlags } from '../context/FeatureFlagContext';
import { fetchCurrentMember } from '../services/api';
import { orderCampuses, formatDistance, type CampusLocation, type Coordinates } from '../services/campusDiscovery';

interface Props { campuses: CampusLocation[]; organizationId: string; selectedId: string; isOpen: boolean; onSelect: (id: string) => void }

/** Shared by both shells. Coordinates stay in memory and are never sent to the API. */
export function CampusPicker(props: Props) {
  const { user, isAuthenticated } = useAuth();
  return <CampusPickerSession key={`${props.organizationId}:${user?.userId || 'guest'}`} {...props} authenticated={isAuthenticated} />;
}

function CampusPickerSession({ campuses, organizationId, selectedId, isOpen, onSelect, authenticated }: Props & { authenticated: boolean }) {
  const { isFeatureEnabled } = useFeatureFlags();
  const proximityEnabled = isFeatureEnabled('system.multicampus_enabled', false);
  const [member, setMember] = useState<{ organization_id: string; campus_id: string } | null>(null);
  const [memberError, setMemberError] = useState(false);
  const [profileAttempt, setProfileAttempt] = useState(0);
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'ready' | 'denied' | 'error' | 'unsupported'>('idle');
  const alive = useRef(true);
  const request = useRef(0);
  const autoRequested = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current++; }; }, []);

  useEffect(() => {
    let current = true;
    setMember(null); setMemberError(false);
    if (isOpen && authenticated) {
      fetchCurrentMember(organizationId).then(profile => {
        if (!current) return;
        if (profile?.organization_id === organizationId) setMember(profile);
      }).catch(() => { if (current) setMemberError(true); });
    }
    return () => { current = false; };
  }, [organizationId, authenticated, isOpen, profileAttempt]);

  function locate() {
    if (!navigator.geolocation) { setLocationStatus('unsupported'); return; }
    const id = ++request.current;
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(result => {
      if (!alive.current || request.current !== id) return;
      setPosition({ latitude: result.coords.latitude, longitude: result.coords.longitude });
      setLocationStatus('ready');
    }, error => {
      if (!alive.current || request.current !== id) return;
      setLocationStatus(error.code === 1 ? 'denied' : 'error');
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 120000 });
  }

  useEffect(() => {
    if (isOpen && proximityEnabled && !autoRequested.current) { autoRequested.current = true; locate(); }
  }, [isOpen, proximityEnabled]);

  const ordered = orderCampuses(campuses, organizationId, member, proximityEnabled ? position : null);
  const statusText = locationStatus === 'loading' ? 'Buscando sua localização…'
    : locationStatus === 'ready' ? 'Demais unidades por proximidade. Distâncias aproximadas em linha reta.'
    : locationStatus === 'denied' ? 'Localização não autorizada. Permita o acesso nas configurações do navegador para ordenar por distância.'
    : locationStatus === 'unsupported' ? 'Este navegador não disponibiliza sua localização.'
    : locationStatus === 'error' ? 'Não foi possível obter sua localização. Tente novamente.'
    : 'Use sua localização para ver as unidades mais próximas.';

  return <div className="campus-picker">
    <p style={{ color: 'var(--text-secondary)', fontSize: '.8rem', margin: '0 0 12px' }}>
      Sua unidade de cadastro aparece primeiro. Escolha uma unidade para visitar no aplicativo.
    </p>
    {proximityEnabled && <div style={{ marginBottom: 16 }}>
      <p role="status" style={{ color: 'var(--text-secondary)', fontSize: '.78rem', margin: '0 0 8px' }}>{statusText}</p>
      <button type="button" disabled={locationStatus === 'loading'} onClick={locate} style={{ padding: '9px 12px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--panel-border)', color: 'var(--text-main)', cursor: 'pointer' }}>
        {position ? 'Atualizar localização' : 'Usar minha localização'}
      </button>
    </div>}
    {memberError && <p role="status" style={{ color: 'var(--text-secondary)', fontSize: '.78rem' }}>Não foi possível consultar sua unidade de cadastro. <button type="button" onClick={() => setProfileAttempt(n => n + 1)}>Tentar novamente</button></p>}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {ordered.map(({ campus, isHome, distance }) => <button type="button" key={campus.id} data-campus-id={campus.id} aria-pressed={campus.id === selectedId} onClick={() => onSelect(campus.id)} style={{
        textAlign: 'left', width: '100%', padding: 14, borderRadius: 'var(--exp-radius, 16px)', cursor: 'pointer', fontFamily: 'inherit',
        background: campus.id === selectedId ? 'var(--accent-primary-light)' : 'var(--bg-card)', color: 'var(--text-main)',
        border: campus.id === selectedId ? '2px solid var(--accent-primary)' : '1px solid var(--panel-border)'
      }}>
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', fontWeight: 800, fontSize: '.94rem' }}>
          {campus.name}{isHome && <small style={{ border: '1px solid currentColor', borderRadius: 6, padding: '2px 6px' }}>Minha unidade</small>}
          {Boolean(campus.is_headquarters) && <small>Sede</small>}
        </span>
        <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '.76rem', marginTop: 5 }}>
          {[campus.address, campus.city, campus.state].filter(Boolean).join(' · ')}
        </span>
        {campus.pastor_name && <span style={{ display: 'block', fontSize: '.74rem', marginTop: 5 }}>Pastor local: {campus.pastor_name}</span>}
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: '.75rem', fontWeight: 700, marginTop: 7 }}>
          {proximityEnabled && position && <span>{distance === null ? 'Localização da unidade não cadastrada' : `${formatDistance(distance)} de você`}</span>}
          {campus.id === selectedId && <span>✓ Visualizando esta unidade</span>}
        </span>
      </button>)}
      {!ordered.length && <p style={{ color: 'var(--text-secondary)' }}>Nenhuma unidade disponível nesta igreja.</p>}
    </div>
    {proximityEnabled && <p style={{ color: 'var(--text-secondary)', fontSize: '.68rem', marginTop: 14 }}>Localizações cadastradas pela igreja. Dados complementares © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>OpenStreetMap</a>.</p>}
  </div>;
}
