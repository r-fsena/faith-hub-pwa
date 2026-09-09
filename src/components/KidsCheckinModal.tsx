import React, { useState, useEffect } from 'react';
import { useBranding } from '../context/BrandingContext';
import { useAuth } from '../context/AuthContext';
import { BottomSheet } from './BottomSheet';
import { KidsBadgeModal, type KidsBadgeData } from './KidsBadgeModal';

const API_URL = import.meta.env.VITE_API_URL || 'https://usl72lj2m5.execute-api.us-east-2.amazonaws.com';

interface KidsCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KidsCheckinModal: React.FC<KidsCheckinModalProps> = ({ isOpen, onClose }) => {
  const { branding } = useBranding();
  const { user } = useAuth();
  const orgId = branding.organization_id || branding.id || 'org_default';

  const [mode, setMode] = useState<'MEMBER' | 'VISITOR'>('MEMBER');
  const [rooms, setRooms] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Seleção de Família e Criança (Membro)
  const [selectedFamily, setSelectedFamily] = useState<any | null>(null);
  const [selectedChild, setSelectedChild] = useState<any | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');

  // Formulário Visitante
  const [visitorForm, setVisitorForm] = useState({
    parent_name: '',
    parent_phone: '',
    child_name: '',
    birthdate: '',
    allergies: '',
    room_id: ''
  });

  // Modal de Comprovante / Etiqueta de Sucesso
  const [createdBadge, setCreatedBadge] = useState<KidsBadgeData | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadRooms();
    } else {
      resetState();
    }
  }, [isOpen, orgId]);

  const resetState = () => {
    setSelectedFamily(null);
    setSelectedChild(null);
    setSearchQuery('');
    setVisitorForm({
      parent_name: '',
      parent_phone: '',
      child_name: '',
      birthdate: '',
      allergies: '',
      room_id: rooms[0]?.id || ''
    });
  };

  const loadRooms = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/kids/rooms?organization_id=${encodeURIComponent(orgId)}`);
      if (res.ok) {
        const json = await res.json();
        const list = json.data || [];
        setRooms(list);
        if (list.length > 0) {
          setSelectedRoomId(list[0].id);
          setVisitorForm(prev => ({ ...prev, room_id: list[0].id }));
        }
      }
    } catch (e) {
      console.error('Erro ao carregar salas:', e);
    } finally {
      setLoading(false);
    }
  };

  const searchFamilies = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFamilies([]);
      return;
    }
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

  const calculateAge = (birthdate?: string) => {
    if (!birthdate) return null;
    const birth = new Date(birthdate);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  };

  const getSuggestedRoomForAge = (age: number | null) => {
    if (age === null || rooms.length === 0) return rooms[0]?.id || '';
    const found = rooms.find(r => age >= r.min_age && age <= r.max_age);
    return found ? found.id : rooms[0]?.id || '';
  };

  const handleSelectChild = (child: any) => {
    setSelectedChild(child);
    const age = calculateAge(child.birthdate);
    setSelectedRoomId(getSuggestedRoomForAge(age));
  };

  // Submeter Check-in de Membro
  const handleSubmitMemberCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild || !selectedFamily) return;

    setSubmitting(true);
    try {
      const payload = {
        child_id: selectedChild.id,
        child_name: selectedChild.name,
        birthdate: selectedChild.birthdate || null,
        allergies: selectedChild.allergies || null,
        medical_notes: selectedChild.medical_notes || null,
        room_id: selectedRoomId || rooms[0]?.id,
        parent_name: selectedFamily.name,
        parent_phone: selectedFamily.phone || '',
        parent_email: selectedFamily.email || null,
        parent_member_id: selectedFamily.id,
        is_visitor: false,
        organization_id: orgId,
        checked_in_by: user?.name || 'Educador (PWA Mobile)'
      };

      const res = await fetch(`${API_URL}/kids/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (res.ok) {
        setCreatedBadge({
          ...json.checkin,
          church_name: branding.church_name
        });
        resetState();
      } else {
        alert(json.message || 'Erro ao realizar check-in');
      }
    } catch (e: any) {
      alert(e?.message || 'Erro de conexão');
    } finally {
      setSubmitting(false);
    }
  };

  // Submeter Check-in de Visitante
  const handleSubmitVisitorCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorForm.child_name.trim() || !visitorForm.parent_name.trim() || !visitorForm.parent_phone.trim()) {
      alert('Por favor, preencha os campos obrigatórios.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        child_id: null,
        child_name: visitorForm.child_name,
        birthdate: visitorForm.birthdate || null,
        allergies: visitorForm.allergies || null,
        room_id: visitorForm.room_id || rooms[0]?.id,
        parent_name: visitorForm.parent_name,
        parent_phone: visitorForm.parent_phone,
        is_visitor: true,
        register_as_member: true,
        organization_id: orgId,
        checked_in_by: user?.name || 'Educador (PWA Mobile)'
      };

      const res = await fetch(`${API_URL}/kids/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (res.ok) {
        setCreatedBadge({
          ...json.checkin,
          church_name: branding.church_name
        });
        resetState();
      } else {
        alert(json.message || 'Erro ao realizar check-in');
      }
    } catch (e: any) {
      alert(e?.message || 'Erro de conexão');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose} maxHeight="90vh">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', position: 'relative' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              margin: '0 auto 8px auto'
            }}>
              🚸
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
              Check-in de Crianças
            </h3>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Recepção, totens e registro de entrada infantil
            </p>
          </div>

          {/* Seletor de Modo: Membro vs Visitante */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            borderRadius: '12px',
            padding: '4px',
            gap: '4px'
          }}>
            <button
              type="button"
              onClick={() => { setMode('MEMBER'); resetState(); }}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '10px',
                border: 'none',
                background: mode === 'MEMBER' ? '#ffffff' : 'transparent',
                color: mode === 'MEMBER' ? '#2563eb' : '#64748b',
                fontWeight: mode === 'MEMBER' ? 900 : 700,
                fontSize: '0.80rem',
                cursor: 'pointer',
                boxShadow: mode === 'MEMBER' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              👥 Membro Cadastrado
            </button>
            <button
              type="button"
              onClick={() => { setMode('VISITOR'); resetState(); }}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '10px',
                border: 'none',
                background: mode === 'VISITOR' ? '#ffffff' : 'transparent',
                color: mode === 'VISITOR' ? '#2563eb' : '#64748b',
                fontWeight: mode === 'VISITOR' ? 900 : 700,
                fontSize: '0.80rem',
                cursor: 'pointer',
                boxShadow: mode === 'VISITOR' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              ✨ Novo Visitante
            </button>
          </div>

          {/* ========================================================
              MODO 1: MEMBRO CADASTRADO
              ======================================================== */}
          {mode === 'MEMBER' && (
            <div>
              {!selectedFamily ? (
                <div>
                  <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => searchFamilies(e.target.value)}
                      placeholder="🔍 Digite o telefone ou nome da família..."
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '14px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.86rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Lista de Famílias Encontradas */}
                  {families.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                      {families.map(fam => (
                        <div
                          key={fam.id}
                          onClick={() => {
                            setSelectedFamily(fam);
                            if (fam.children && fam.children.length === 1) {
                              handleSelectChild(fam.children[0]);
                            }
                          }}
                          style={{
                            background: '#ffffff',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '14px',
                            padding: '12px 14px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
                              👨‍👩‍👧 {fam.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              📱 {fam.phone || 'Sem telefone'} • {(fam.children || []).length} criança(s)
                            </div>
                          </div>
                          <span style={{ fontSize: '0.80rem', color: '#2563eb', fontWeight: 800 }}>
                            Selecionar →
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : searchQuery.trim().length > 1 ? (
                    <div style={{ textAlign: 'center', padding: '24px 12px', color: '#64748b' }}>
                      <p style={{ fontSize: '0.82rem', margin: 0 }}>Nenhuma família encontrada com esse termo.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setMode('VISITOR');
                          setVisitorForm(prev => ({ ...prev, parent_name: searchQuery }));
                        }}
                        style={{
                          marginTop: '8px',
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          fontWeight: 800,
                          fontSize: '0.76rem',
                          cursor: 'pointer'
                        }}
                      >
                        + Cadastrar como visitante rápido
                      </button>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '28px 16px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                      <span style={{ fontSize: '1.6rem' }}>👨‍👩‍👧‍👦</span>
                      <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '6px 0 0 0' }}>
                        Comece digitando o número de telefone ou o sobrenome para localizar as crianças cadastradas.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Família Selecionada: Escolher Criança e Sala */
                <form onSubmit={handleSubmitMemberCheckin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Card Família Ativa */}
                  <div style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e40af' }}>
                        👨‍👩‍👧 Família: {selectedFamily.name}
                      </div>
                      <div style={{ fontSize: '0.70rem', color: '#3b82f6' }}>
                        {selectedFamily.phone}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedFamily(null); setSelectedChild(null); }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Trocar
                    </button>
                  </div>

                  {/* Seleção de Criança */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                      Selecione a Criança:
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(selectedFamily.children || []).map((ch: any) => {
                        const isSelected = selectedChild?.id === ch.id;
                        const age = calculateAge(ch.birthdate);
                        return (
                          <div
                            key={ch.id}
                            onClick={() => handleSelectChild(ch)}
                            style={{
                              border: isSelected ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                              background: isSelected ? '#eff6ff' : '#ffffff',
                              borderRadius: '12px',
                              padding: '10px 14px',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
                                {ch.name} {age !== null ? `(${age} anos)` : ''}
                              </div>
                              {ch.allergies && (
                                <div style={{ fontSize: '0.68rem', color: '#b91c1c', fontWeight: 700, marginTop: '2px' }}>
                                  ⚠️ Alergia: {ch.allergies}
                                </div>
                              )}
                            </div>
                            <input
                              type="radio"
                              checked={isSelected}
                              onChange={() => {}}
                              style={{ cursor: 'pointer' }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Seleção de Sala */}
                  {selectedChild && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                        Sala Kids de Destino:
                      </label>
                      <select
                        value={selectedRoomId}
                        onChange={e => setSelectedRoomId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '0.84rem',
                          background: '#ffffff'
                        }}
                      >
                        {rooms.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.min_age} a {r.max_age} anos)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!selectedChild || submitting}
                    style={{
                      marginTop: '8px',
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '14px',
                      padding: '12px',
                      fontSize: '0.88rem',
                      fontWeight: 900,
                      cursor: selectedChild && !submitting ? 'pointer' : 'not-allowed',
                      opacity: selectedChild && !submitting ? 1 : 0.6,
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                    }}
                  >
                    {submitting ? 'Registrando...' : 'Confirmar Check-in →'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ========================================================
              MODO 2: NOVO VISITANTE
              ======================================================== */}
          {mode === 'VISITOR' && (
            <form onSubmit={handleSubmitVisitorCheckin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                  Nome do Responsável *
                </label>
                <input
                  type="text"
                  required
                  value={visitorForm.parent_name}
                  onChange={e => setVisitorForm({ ...visitorForm, parent_name: e.target.value })}
                  placeholder="Nome do Pai ou Mãe"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                  WhatsApp do Responsável *
                </label>
                <input
                  type="tel"
                  required
                  value={visitorForm.parent_phone}
                  onChange={e => setVisitorForm({ ...visitorForm, parent_phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                    Nome da Criança *
                  </label>
                  <input
                    type="text"
                    required
                    value={visitorForm.child_name}
                    onChange={e => setVisitorForm({ ...visitorForm, child_name: e.target.value })}
                    placeholder="Nome completo"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                    Nascimento
                  </label>
                  <input
                    type="date"
                    value={visitorForm.birthdate}
                    onChange={e => {
                      const b = e.target.value;
                      const age = calculateAge(b);
                      setVisitorForm({
                        ...visitorForm,
                        birthdate: b,
                        room_id: getSuggestedRoomForAge(age)
                      });
                    }}
                    style={{ width: '100%', padding: '10px 8px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.80rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                  Sala Kids:
                </label>
                <select
                  value={visitorForm.room_id}
                  onChange={e => setVisitorForm({ ...visitorForm, room_id: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem', background: '#ffffff', boxSizing: 'border-box' }}
                >
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.min_age} a {r.max_age} anos)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                  Alergias / Cuidados Especiais (Opcional)
                </label>
                <input
                  type="text"
                  value={visitorForm.allergies}
                  onChange={e => setVisitorForm({ ...visitorForm, allergies: e.target.value })}
                  placeholder="Ex: lactose, glúten, asma..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: '6px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '12px',
                  fontSize: '0.88rem',
                  fontWeight: 900,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                }}
              >
                {submitting ? 'Cadastrando...' : 'Emitir Check-in de Visitante →'}
              </button>
            </form>
          )}

        </div>
      </BottomSheet>

      {/* Modal de Etiqueta / PIN após sucesso */}
      <KidsBadgeModal
        isOpen={Boolean(createdBadge)}
        onClose={() => setCreatedBadge(null)}
        badge={createdBadge}
        onNewCheckin={() => setCreatedBadge(null)}
      />
    </>
  );
};
