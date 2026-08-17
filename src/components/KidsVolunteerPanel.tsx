import React, { useState, useEffect } from 'react';
import { useBranding } from '../context/BrandingContext';
import { useAuth } from '../context/AuthContext';
import { BottomSheet } from './BottomSheet';
import { KidsBadgeModal } from './KidsBadgeModal';
import { KidsQrScannerModal } from './KidsQrScannerModal';

const API_URL = import.meta.env.VITE_API_URL || 'https://usl72lj2m5.execute-api.us-east-2.amazonaws.com';

interface KidsVolunteerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KidsVolunteerPanel: React.FC<KidsVolunteerPanelProps> = ({ isOpen, onClose }) => {
  const { branding } = useBranding();
  const { user } = useAuth();
  const orgId = branding.organization_id || branding.id || 'org_default';

  // Subtabs no painel do voluntário
  const [subTab, setSubTab] = useState<'presence' | 'checkin' | 'calls'>('presence');
  
  // Data
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeCheckins, setActiveCheckins] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Form Check-in Rápido
  const [checkinMode, setCheckinMode] = useState<'MEMBER' | 'VISITOR'>('MEMBER');
  const [selectedFamily, setSelectedFamily] = useState<any | null>(null);
  const [selectedChild, setSelectedChild] = useState<any | null>(null);
  const [familySearchQuery, setFamilySearchQuery] = useState('');
  const [quickForm, setQuickForm] = useState({
    child_name: '',
    birthdate: '',
    allergies: '',
    medical_notes: '',
    room_id: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    is_visitor: false,
    register_as_member: true
  });
  const [createdCheckinSuccess, setCreatedCheckinSuccess] = useState<any | null>(null);

  const calculateAge = (birthdate?: string) => {
    if (!birthdate) return null;
    const birth = new Date(birthdate);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getSuggestedRoomForAge = (age: number | null) => {
    if (age === null || rooms.length === 0) return rooms[0]?.id || '';
    const found = rooms.find(r => age >= r.min_age && age <= r.max_age);
    return found ? found.id : rooms[0]?.id || '';
  };

  // Ações de Chamada e Checkout
  const [callingCheckin, setCallingCheckin] = useState<any | null>(null);
  const [callReason, setCallReason] = useState('CHORO');
  const [callCustomMsg, setCallCustomMsg] = useState('');
  const [callingSaving, setCallingSaving] = useState(false);

  const [checkoutTarget, setCheckoutTarget] = useState<any | null>(null);
  const [checkoutPin, setCheckoutPin] = useState('');
  const [checkoutError, setCheckoutError] = useState('');

  // Scanner de Câmera QR Code
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<any | null>(null);

  const loadData = async (isInitial = false) => {
    if (isInitial && rooms.length === 0 && activeCheckins.length === 0) {
      setLoading(true);
    }
    try {
      // 1. Salas
      const roomsRes = await fetch(`${API_URL}/kids/rooms?organization_id=${encodeURIComponent(orgId)}`);
      if (roomsRes.ok) {
        const json = await roomsRes.json();
        const list = json.data || [];
        setRooms(list);
        if (list.length > 0) {
          setQuickForm(prev => prev.room_id ? prev : { ...prev, room_id: list[0].id });
        }
      }

      // 2. Check-ins Ativos
      const checkRes = await fetch(`${API_URL}/kids/checkins?organization_id=${encodeURIComponent(orgId)}&status=active`);
      if (checkRes.ok) {
        const json = await checkRes.json();
        setActiveCheckins(json.data || []);
      }
    } catch (e) {
      console.error("Erro ao carregar dados do kids no PWA:", e);
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  const loadFamilies = async (query = '') => {
    try {
      const res = await fetch(`${API_URL}/kids/families?organization_id=${encodeURIComponent(orgId)}&search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const json = await res.json();
        setFamilies(json.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData(true);
      loadFamilies();
      const interval = setInterval(() => {
        loadData(false);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [isOpen, orgId]);

  // Handler: Realizar Check-in pelo celular
  const handlePerformCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetRoomId = quickForm.room_id || (rooms.length > 0 ? rooms[0].id : '');
      const payload = {
        child_id: selectedChild?.id || null,
        child_name: quickForm.child_name,
        birthdate: quickForm.birthdate || null,
        allergies: quickForm.allergies || null,
        medical_notes: quickForm.medical_notes || null,
        room_id: targetRoomId,
        parent_name: quickForm.parent_name,
        parent_phone: quickForm.parent_phone,
        parent_email: quickForm.parent_email || null,
        parent_member_id: selectedFamily?.id || null,
        is_visitor: quickForm.is_visitor,
        register_as_member: quickForm.register_as_member,
        organization_id: orgId,
        checked_in_by: user?.name || 'Educador (PWA Mobile)'
      };

      const res = await fetch(`${API_URL}/kids/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json().catch(() => ({}));

      if (res.ok) {
        setCreatedCheckinSuccess({
          ...json.checkin,
          church_name: branding.church_name
        });
        loadData();
        // Reset form
        setSelectedChild(null);
        setSelectedFamily(null);
        setQuickForm({
          child_name: '',
          birthdate: '',
          allergies: '',
          medical_notes: '',
          room_id: rooms.length > 0 ? rooms[0].id : '',
          parent_name: '',
          parent_phone: '',
          parent_email: '',
          is_visitor: false,
          register_as_member: true
        });
      } else {
        alert(json.message || 'Erro ao realizar check-in');
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Erro de conexão ao realizar check-in');
    }
  };

  // Handler: Disparar Chamador de Pais
  const handleTriggerCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callingCheckin) return;
    setCallingSaving(true);
    try {
      const res = await fetch(`${API_URL}/kids/call-parent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkin_id: callingCheckin.id,
          reason: callReason,
          message: callCustomMsg || null
        })
      });

      if (res.ok) {
        setCallingCheckin(null);
        loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCallingSaving(false);
    }
  };

  // Handler: Resolver Chamada
  const handleResolveCall = async (checkinId: string) => {
    try {
      await fetch(`${API_URL}/kids/resolve-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkin_id: checkinId })
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Handler: Validar Checkout Seguro via PIN
  const handlePerformCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutTarget) return;
    setCheckoutError('');
    try {
      const res = await fetch(`${API_URL}/kids/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkin_id: checkoutTarget.id,
          security_code: checkoutPin,
          checked_out_by: user?.name || 'Educador (PWA Mobile)'
        })
      });

      if (res.ok) {
        setCheckoutTarget(null);
        setCheckoutPin('');
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        setCheckoutError(err.message || 'PIN incorreto!');
      }
    } catch (e) {
      setCheckoutError('Erro de conexão ao validar checkout.');
    }
  };

  // Handler: Checkout Seguro via Leitura de Câmera QR Code
  const handleScanSuccessCheckout = async (scannedCode: string) => {
    setIsScannerOpen(false);
    const target = scannerTarget;
    setScannerTarget(null);

    let targetCheckin = target;

    if (!targetCheckin) {
      targetCheckin = activeCheckins.find(c => 
        c.security_code.trim().toUpperCase() === scannedCode.trim().toUpperCase() ||
        scannedCode.includes(c.security_code)
      );
    }

    if (!targetCheckin) {
      alert(`O QR Code "${scannedCode}" não foi encontrado na lista de crianças ativas.`);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/kids/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkin_id: targetCheckin.id,
          security_code: scannedCode,
          checked_out_by: user?.name || 'Educador (PWA Mobile)'
        })
      });

      if (res.ok) {
        alert(`✅ Checkout de ${targetCheckin.child_name} realizado com sucesso!`);
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Código QR inválido para esta criança.');
      }
    } catch (e) {
      alert('Erro de conexão ao realizar checkout.');
    }
  };

  const filteredCheckins = activeCheckins.filter(c => {
    const matchRoom = selectedRoomId === 'all' || c.room_id === selectedRoomId;
    const matchSearch = !search || c.child_name.toLowerCase().includes(search.toLowerCase()) || c.parent_name.toLowerCase().includes(search.toLowerCase()) || c.security_code.toLowerCase().includes(search.toLowerCase());
    return matchRoom && matchSearch;
  });

  const callingCount = activeCheckins.filter(c => c.status === 'CALLING_PARENTS').length;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="🚸 Painel do Educador Kids (Mobile)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: '65dvh' }}>
        
        {/* Navigation Tabs Bar */}
        <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 12 }}>
          <button
            type="button"
            onClick={() => setSubTab('presence')}
            style={{
              flex: 1,
              background: subTab === 'presence' ? 'var(--accent-primary)' : 'transparent',
              color: subTab === 'presence' ? '#ffffff' : '#64748b',
              border: 'none',
              borderRadius: 8,
              padding: '8px 4px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            👶 Crianças ({activeCheckins.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setSubTab('checkin');
              setCreatedCheckinSuccess(null);
            }}
            style={{
              flex: 1,
              background: subTab === 'checkin' ? 'var(--accent-primary)' : 'transparent',
              color: subTab === 'checkin' ? '#ffffff' : '#64748b',
              border: 'none',
              borderRadius: 8,
              padding: '8px 4px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            🏷️ Check-in
          </button>

          <button
            type="button"
            onClick={() => setSubTab('calls')}
            style={{
              flex: 1,
              background: subTab === 'calls' ? '#ef4444' : 'transparent',
              color: subTab === 'calls' ? '#ffffff' : (callingCount > 0 ? '#b91c1c' : '#64748b'),
              border: 'none',
              borderRadius: 8,
              padding: '8px 4px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            📢 Chamados {callingCount > 0 && `(${callingCount})`}
          </button>
        </div>

        {/* ========================================================
            SUBTAB 1: CRIANÇAS PRESENTES NA SALA (MOBILE VIEW)
            ======================================================== */}
        {subTab === 'presence' && (
          <div>
            {/* Botão Rápido de Scanner Geral de Devolução */}
            <button
              type="button"
              onClick={() => {
                setScannerTarget(null);
                setIsScannerOpen(true);
              }}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 14,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontWeight: 900,
                fontSize: '0.84rem',
                cursor: 'pointer',
                marginBottom: 12,
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)'
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>📸</span>
              <span>Realizar Checkout (Ler QR Code)</span>
            </button>

            {/* Filtro de Sala por Carrossel de Pílulas */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => setSelectedRoomId('all')}
                style={{
                  background: selectedRoomId === 'all' ? 'var(--accent-primary)' : '#ffffff',
                  color: selectedRoomId === 'all' ? '#ffffff' : 'var(--text-main)',
                  border: '1px solid var(--panel-border)',
                  padding: '6px 12px',
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                Todas ({activeCheckins.length})
              </button>
              {rooms.map(r => {
                const count = activeCheckins.filter(c => c.room_id === r.id).length;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRoomId(r.id)}
                    style={{
                      background: selectedRoomId === r.id ? (r.color || 'var(--accent-primary)') : '#ffffff',
                      color: selectedRoomId === r.id ? '#ffffff' : 'var(--text-main)',
                      border: '1px solid var(--panel-border)',
                      padding: '6px 12px',
                      borderRadius: 10,
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer'
                    }}
                  >
                    {r.icon} {r.name} ({count})
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <input
              type="text"
              className="pwa-input"
              placeholder="Buscar por criança, responsável ou PIN..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ marginBottom: 12, fontSize: '0.78rem' }}
            />

            {/* Lista de Crianças Presentes */}
            {loading && activeCheckins.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: '0.80rem' }}>
                Carregando crianças presentes...
              </div>
            ) : filteredCheckins.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, background: '#ffffff', borderRadius: 14, border: '1px dashed var(--panel-border)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 6 }}>👶</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)' }}>Nenhuma criança nesta sala</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Use a aba "Check-in" para registrar a entrada dos pequenos.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredCheckins.map(c => {
                  const isCalling = c.status === 'CALLING_PARENTS';

                  return (
                    <div
                      key={c.id}
                      style={{
                        background: isCalling ? '#fef2f2' : '#ffffff',
                        border: isCalling ? '2px solid #ef4444' : '1px solid var(--panel-border)',
                        borderRadius: 14,
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: c.room_color || 'var(--accent-primary)',
                            color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 900, fontSize: '0.95rem'
                          }}>
                            {c.child_name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.90rem', fontWeight: 900, color: 'var(--text-main)' }}>
                              {c.child_name}
                            </div>
                            <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                              {c.room_name} • Resp: {c.parent_name}
                            </div>
                          </div>
                        </div>

                        <div style={{
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          padding: '3px 8px',
                          borderRadius: 8,
                          textAlign: 'right'
                        }}>
                          <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#64748b' }}>PIN</div>
                          <div style={{ fontSize: '0.90rem', fontWeight: 900, color: 'var(--accent-primary)' }}>{c.security_code}</div>
                        </div>
                      </div>

                      {/* Alergias / Avisos Médicos */}
                      {c.allergies && (
                        <div style={{ background: '#fff1f2', color: '#be123c', padding: '4px 8px', borderRadius: 6, fontSize: '0.70rem', fontWeight: 700 }}>
                          ⚠️ Alergia: {c.allergies}
                        </div>
                      )}

                      {/* Botões de Ação na Porta da Sala */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 6, paddingTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setCallingCheckin(c);
                            setCallReason('CHORO');
                            setCallCustomMsg('');
                          }}
                          style={{
                            background: isCalling ? '#fee2e2' : '#fff7ed',
                            color: isCalling ? '#b91c1c' : '#c2410c',
                            border: '1px solid #fed7aa',
                            borderRadius: 8,
                            padding: '6px 4px',
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 3
                          }}
                        >
                          <span>🚨</span> Chamar
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setScannerTarget(c);
                            setIsScannerOpen(true);
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '6px 4px',
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4
                          }}
                        >
                          <span>📸</span> Ler QR Code
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCheckoutTarget(c);
                            setCheckoutPin('');
                            setCheckoutError('');
                          }}
                          style={{
                            background: '#f0fdf4',
                            color: '#15803d',
                            border: '1px solid #bbf7d0',
                            borderRadius: 8,
                            padding: '6px 4px',
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 3
                          }}
                        >
                          <span>🔐</span> PIN Manual
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            SUBTAB 2: FAZER CHECK-IN EXPRESSO PELO CELULAR
            ======================================================== */}
        {subTab === 'checkin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Toggle Membro vs Visitante */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: 4, borderRadius: 12 }}>
              <button
                type="button"
                onClick={() => {
                  setCheckinMode('MEMBER');
                  setQuickForm(prev => ({ ...prev, is_visitor: false }));
                }}
                style={{
                  flex: 1,
                  background: checkinMode === 'MEMBER' ? 'var(--accent-primary)' : 'transparent',
                  color: checkinMode === 'MEMBER' ? '#ffffff' : '#64748b',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                👤 Membro Cadastrado
              </button>
              <button
                type="button"
                onClick={() => {
                  setCheckinMode('VISITOR');
                  setSelectedFamily(null);
                  setSelectedChild(null);
                  setFamilySearchQuery('');
                  setQuickForm(prev => ({ ...prev, is_visitor: true, parent_member_id: '' }));
                }}
                style={{
                  flex: 1,
                  background: checkinMode === 'VISITOR' ? 'var(--accent-primary)' : 'transparent',
                  color: checkinMode === 'VISITOR' ? '#ffffff' : '#64748b',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                👋 Visitante Rápido
              </button>
            </div>

            {/* MODO MEMBRO: Busca Inteligente (Só exibe quando pesquisar) */}
            {checkinMode === 'MEMBER' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {!selectedFamily ? (
                  <div>
                    <label style={{ fontSize: '0.80rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 6, display: 'block' }}>
                      🔍 1. Buscar Responsável na Base de Membros:
                    </label>
                    <input
                      type="text"
                      className="pwa-input"
                      placeholder="Digite o nome, WhatsApp ou e-mail do pai/mãe..."
                      value={familySearchQuery}
                      onChange={e => {
                        const val = e.target.value;
                        setFamilySearchQuery(val);
                        if (val.trim().length >= 2) {
                          loadFamilies(val);
                        }
                      }}
                      style={{
                        padding: '12px 14px',
                        fontSize: '0.94rem',
                        minHeight: 48,
                        borderRadius: 12,
                        border: '1.5px solid #cbd5e1'
                      }}
                    />

                    {/* Resultados da Busca (Apenas com 2+ caracteres) */}
                    {familySearchQuery.trim().length >= 2 && (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                        {families.length === 0 ? (
                          <div style={{ padding: 12, textAlign: 'center', background: '#f8fafc', borderRadius: 10, fontSize: '0.78rem', color: '#64748b' }}>
                            Nenhum membro encontrado com "{familySearchQuery}".
                          </div>
                        ) : (
                          families.map(fam => (
                            <div
                              key={fam.id}
                              onClick={() => {
                                setSelectedFamily(fam);
                                setFamilySearchQuery('');
                                // Se tiver filhos cadastrados, já auto-seleciona o primeiro filho se houver apenas 1
                                if (fam.children && fam.children.length === 1) {
                                  const firstChild = fam.children[0];
                                  const childAge = calculateAge(firstChild.birthdate);
                                  setSelectedChild(firstChild);
                                  setQuickForm({
                                    child_name: firstChild.name,
                                    birthdate: firstChild.birthdate || '',
                                    allergies: firstChild.allergies || '',
                                    medical_notes: firstChild.medical_notes || '',
                                    room_id: getSuggestedRoomForAge(childAge),
                                    parent_name: fam.name,
                                    parent_phone: fam.phone || '',
                                    parent_email: fam.email || '',
                                    is_visitor: false,
                                    register_as_member: true
                                  });
                                } else {
                                  setSelectedChild(null);
                                  setQuickForm(prev => ({
                                    ...prev,
                                    parent_name: fam.name,
                                    parent_phone: fam.phone || '',
                                    parent_email: fam.email || '',
                                    is_visitor: false
                                  }));
                                }
                              }}
                              style={{
                                background: '#ffffff',
                                border: '1.5px solid #e2e8f0',
                                borderRadius: 12,
                                padding: '10px 14px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-primary-gradient)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.90rem' }}>
                                  {fam.name.charAt(0)}
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.86rem', fontWeight: 900, color: 'var(--text-main)' }}>{fam.name}</div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{fam.phone || fam.email}</div>
                                </div>
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--accent-primary)', fontWeight: 800, background: 'var(--accent-primary-light)', padding: '4px 8px', borderRadius: 6 }}>
                                {fam.children.length} filho(s)
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Card do Responsável Selecionado */
                  <div style={{ background: '#f0fdfa', border: '1.5px solid #99f6e4', borderRadius: 14, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '1.2rem' }}>👤</span>
                        <div>
                          <div style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f766e' }}>
                            {selectedFamily.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#115e59' }}>
                            {selectedFamily.phone || selectedFamily.email} • Membro
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFamily(null);
                          setSelectedChild(null);
                          setQuickForm({
                            child_name: '',
                            birthdate: '',
                            allergies: '',
                            medical_notes: '',
                            room_id: rooms[0]?.id || '',
                            parent_name: '',
                            parent_phone: '',
                            parent_email: '',
                            is_visitor: false,
                            register_as_member: true
                          });
                        }}
                        style={{
                          background: '#ffffff',
                          color: '#e11d48',
                          border: '1px solid #fecdd3',
                          borderRadius: 8,
                          padding: '4px 10px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        Trocar Pai/Mãe
                      </button>
                    </div>

                    {/* Seleção dos Filhos Associados com um toque */}
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #99f6e4' }}>
                      <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0f766e', marginBottom: 6 }}>
                        👶 Selecione o filho para fazer Check-in:
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {selectedFamily.children.map((ch: any) => {
                          const isChildActive = selectedChild?.id === ch.id;
                          const childAge = calculateAge(ch.birthdate);
                          return (
                            <button
                              key={ch.id}
                              type="button"
                              onClick={() => {
                                setSelectedChild(ch);
                                setQuickForm({
                                  ...quickForm,
                                  child_name: ch.name,
                                  birthdate: ch.birthdate || '',
                                  allergies: ch.allergies || '',
                                  medical_notes: ch.medical_notes || '',
                                  room_id: getSuggestedRoomForAge(childAge),
                                  parent_name: selectedFamily.name,
                                  parent_phone: selectedFamily.phone || '',
                                  parent_email: selectedFamily.email || '',
                                  is_visitor: false
                                });
                              }}
                              style={{
                                background: isChildActive ? 'var(--accent-primary)' : '#ffffff',
                                color: isChildActive ? '#ffffff' : 'var(--text-main)',
                                border: isChildActive ? '1.5px solid var(--accent-primary)' : '1px solid #cbd5e1',
                                borderRadius: 10,
                                padding: '8px 12px',
                                fontSize: '0.80rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                              }}
                            >
                              <span>👶 {ch.name}</span>
                              <span style={{ fontSize: '0.68rem', opacity: 0.85 }}>
                                {childAge !== null ? `(${childAge} anos)` : ''}
                              </span>
                            </button>
                          );
                        })}

                        {/* Opção para cadastrar novo filho */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedChild(null);
                            setQuickForm({
                              child_name: '',
                              birthdate: '',
                              allergies: '',
                              medical_notes: '',
                              room_id: rooms[0]?.id || '',
                              parent_name: selectedFamily.name,
                              parent_phone: selectedFamily.phone || '',
                              parent_email: selectedFamily.email || '',
                              is_visitor: false,
                              register_as_member: true
                            });
                          }}
                          style={{
                            background: '#ffffff',
                            color: '#0f766e',
                            border: '1.5px dashed #0f766e',
                            borderRadius: 10,
                            padding: '8px 12px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          ➕ Outro Filho
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* FORMULÁRIO DE DADOS DA CRIANÇA E SALA (Espaçoso e Confortável) */}
            <form onSubmit={handlePerformCheckin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Nome da Criança */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 4, display: 'block' }}>
                  👶 Nome da Criança *
                </label>
                <input
                  type="text"
                  className="pwa-input"
                  placeholder="Nome completo da criança"
                  value={quickForm.child_name}
                  onChange={e => setQuickForm({ ...quickForm, child_name: e.target.value })}
                  required
                  style={{
                    padding: '12px 14px',
                    fontSize: '0.96rem',
                    fontWeight: 700,
                    minHeight: 48,
                    borderRadius: 12,
                    border: '1.5px solid #cbd5e1'
                  }}
                />
              </div>

              {/* Sala e Data de Nascimento */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 4, display: 'block' }}>
                    🏷️ Sala Destino *
                  </label>
                  <select
                    className="pwa-input"
                    value={quickForm.room_id}
                    onChange={e => setQuickForm({ ...quickForm, room_id: e.target.value })}
                    required
                    style={{
                      padding: '12px 14px',
                      fontSize: '0.90rem',
                      fontWeight: 800,
                      minHeight: 48,
                      borderRadius: 12,
                      border: '1.5px solid #cbd5e1',
                      background: '#ffffff'
                    }}
                  >
                    <option value="">Selecione a sala</option>
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.icon} {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 4, display: 'block' }}>
                    🎂 Data Nasc.
                  </label>
                  <input
                    type="date"
                    className="pwa-input"
                    value={quickForm.birthdate}
                    onChange={e => {
                      const bdate = e.target.value;
                      const age = calculateAge(bdate);
                      setQuickForm({
                        ...quickForm,
                        birthdate: bdate,
                        room_id: age !== null ? getSuggestedRoomForAge(age) : quickForm.room_id
                      });
                    }}
                    style={{
                      padding: '12px 14px',
                      fontSize: '0.90rem',
                      minHeight: 48,
                      borderRadius: 12,
                      border: '1.5px solid #cbd5e1'
                    }}
                  />
                </div>
              </div>

              {/* Alergias / Cuidados Médicos */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 4, display: 'block' }}>
                  ⚠️ Alergias ou Observações Médicas
                </label>
                <input
                  type="text"
                  className="pwa-input"
                  placeholder="Ex: Alergia a lactose, amendoim, asma..."
                  value={quickForm.allergies}
                  onChange={e => setQuickForm({ ...quickForm, allergies: e.target.value })}
                  style={{
                    padding: '12px 14px',
                    fontSize: '0.92rem',
                    minHeight: 48,
                    borderRadius: 12,
                    border: '1.5px solid #cbd5e1'
                  }}
                />
              </div>

              {/* Responsável e WhatsApp */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 4, display: 'block' }}>
                    👤 Nome do Responsável *
                  </label>
                  <input
                    type="text"
                    className="pwa-input"
                    placeholder="Nome do Pai / Mãe"
                    value={quickForm.parent_name}
                    onChange={e => setQuickForm({ ...quickForm, parent_name: e.target.value })}
                    required
                    style={{
                      padding: '12px 14px',
                      fontSize: '0.92rem',
                      minHeight: 48,
                      borderRadius: 12,
                      border: '1.5px solid #cbd5e1'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 4, display: 'block' }}>
                    📱 WhatsApp dos Pais *
                  </label>
                  <input
                    type="tel"
                    className="pwa-input"
                    placeholder="(00) 00000-0000"
                    value={quickForm.parent_phone}
                    onChange={e => setQuickForm({ ...quickForm, parent_phone: e.target.value })}
                    required
                    style={{
                      padding: '12px 14px',
                      fontSize: '0.92rem',
                      minHeight: 48,
                      borderRadius: 12,
                      border: '1.5px solid #cbd5e1'
                    }}
                  />
                </div>
              </div>

              {/* Botão de Conclusão */}
              <button
                type="submit"
                className="pwa-btn-primary"
                style={{
                  marginTop: 6,
                  padding: '14px',
                  fontSize: '1rem',
                  fontWeight: 900,
                  minHeight: 52,
                  borderRadius: 14,
                  boxShadow: '0 4px 14px rgba(15, 118, 110, 0.3)'
                }}
              >
                ✓ Concluir Check-in & Gerar Crachá (PIN)
              </button>
            </form>
          </div>
        )}

        {/* ========================================================
            SUBTAB 3: CHAMADOS ATIVOS (MOBILE VIEW)
            ======================================================== */}
        {subTab === 'calls' && (
          <div>
            {callingCount === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                Nenhum chamado ativo no momento.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activeCheckins.filter(c => c.status === 'CALLING_PARENTS').map(c => (
                  <div
                    key={c.id}
                    style={{
                      background: '#fef2f2',
                      border: '1.5px solid #ef4444',
                      borderRadius: 12,
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 900, color: 'var(--text-main)' }}>{c.child_name}</span>
                      <span style={{ fontSize: '0.70rem', background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>
                        🚨 {c.call_reason}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Sala: {c.room_name} • Pais: {c.parent_name} ({c.parent_phone})
                    </div>
                    {c.call_message && (
                      <div style={{ fontSize: '0.72rem', fontStyle: 'italic', color: '#475569' }}>
                        "{c.call_message}"
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <a
                        href={`https://wa.me/55${c.parent_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${c.parent_name}, estamos na sala ${c.room_name} com ${c.child_name} e precisamos do seu comparecimento.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          flex: 1,
                          background: '#25d366',
                          color: '#ffffff',
                          borderRadius: 8,
                          padding: '6px',
                          textAlign: 'center',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          textDecoration: 'none'
                        }}
                      >
                        💬 WhatsApp
                      </a>
                      <button
                        type="button"
                        onClick={() => handleResolveCall(c.id)}
                        style={{
                          flex: 1,
                          background: '#059669',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        ✓ Pais Compareceram
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal / Dialogo de Chamar Pais */}
      {callingCheckin && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)',
          zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <form
            onSubmit={handleTriggerCall}
            style={{
              background: '#ffffff', borderRadius: 16, padding: 18, width: '100%', maxWidth: 340,
              display: 'flex', flexDirection: 'column', gap: 12
            }}
          >
            <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-main)' }}>
              🚨 Chamar Responsável de {callingCheckin.child_name}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[
                { id: 'CHORO', label: '😭 Choro' },
                { id: 'FRALDA', label: '🍼 Fralda' },
                { id: 'FEBRE', label: '💊 Febre' },
                { id: 'COMPARECER_SALA', label: '🚸 Na Sala' }
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setCallReason(m.id)}
                  style={{
                    background: callReason === m.id ? '#fee2e2' : '#f8fafc',
                    color: callReason === m.id ? '#b91c1c' : '#475569',
                    border: callReason === m.id ? '2px solid #ef4444' : '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '8px 4px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              className="pwa-input"
              placeholder="Mensagem adicional (opcional)"
              value={callCustomMsg}
              onChange={e => setCallCustomMsg(e.target.value)}
              style={{ fontSize: '0.76rem' }}
            />

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setCallingCheckin(null)}
                style={{ flex: 1, background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '8px', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={callingSaving}
                style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '8px', fontSize: '0.76rem', fontWeight: 900, cursor: 'pointer' }}
              >
                {callingSaving ? 'Enviando...' : '🚨 Disparar Alerta'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal / Dialogo de Checkout com Validação de PIN */}
      {checkoutTarget && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)',
          zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <form
            onSubmit={handlePerformCheckout}
            style={{
              background: '#ffffff', borderRadius: 16, padding: 18, width: '100%', maxWidth: 340,
              display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-main)' }}>
              🔐 Devolver {checkoutTarget.child_name}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
              Solicite o PIN do crachá digital do responsável:
            </div>

            <input
              type="text"
              className="pwa-input"
              placeholder="Ex: K-4829 ou 4829"
              value={checkoutPin}
              onChange={e => setCheckoutPin(e.target.value)}
              style={{ textAlign: 'center', fontSize: '1.3rem', fontWeight: 900, letterSpacing: '0.1em' }}
              required
              autoFocus
            />

            {checkoutError && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '6px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>
                {checkoutError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setCheckoutTarget(null)}
                style={{ flex: 1, background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '8px', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{ flex: 1, background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '8px', fontSize: '0.76rem', fontWeight: 900, cursor: 'pointer' }}
              >
                ✓ Validar PIN & Liberar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Crachá Digital com QR Code após Check-in */}
      <KidsBadgeModal
        isOpen={!!createdCheckinSuccess}
        onClose={() => {
          setCreatedCheckinSuccess(null);
          setSubTab('rooms'); // Retorna para a tela inicial das salas
        }}
        onNewCheckin={() => {
          setCreatedCheckinSuccess(null);
          setSelectedChild(null);
          setFamilySearchQuery('');
          setQuickForm({
            child_name: '',
            birthdate: '',
            allergies: '',
            medical_notes: '',
            room_id: rooms.length > 0 ? rooms[0].id : '',
            parent_name: selectedFamily ? selectedFamily.name : '',
            parent_phone: selectedFamily ? (selectedFamily.phone || '') : '',
            parent_email: selectedFamily ? (selectedFamily.email || '') : '',
            is_visitor: checkinMode === 'VISITOR',
            register_as_member: true
          });
        }}
        badge={createdCheckinSuccess}
      />

      {/* Modal de Leitura de Câmera QR Code */}
      <KidsQrScannerModal
        isOpen={isScannerOpen}
        onClose={() => {
          setIsScannerOpen(false);
          setScannerTarget(null);
        }}
        onScanSuccess={handleScanSuccessCheckout}
        childName={scannerTarget?.child_name}
      />
    </BottomSheet>
  );
};
