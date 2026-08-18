import React, { useState, useEffect, useMemo } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { useBranding } from '../context/BrandingContext';

interface BibleBook {
  abbrev: string;
  name: string;
  chapters: string[][];
}

export type BibleVersion = 'nvi' | 'acf' | 'aa' | 'nvt' | 'kja';
type ColorTheme = 'light' | 'sepia' | 'dark';

export const ALL_BIBLE_VERSIONS: Record<BibleVersion, { label: string; fullName: string; description: string }> = {
  nvi: { label: 'NVI', fullName: 'Nova Versão Internacional', description: 'Tradução contemporânea fiel e de fácil compreensão' },
  acf: { label: 'ACF', fullName: 'Almeida Corrigida Fiel', description: 'Tradução clássica tradicional baseada no Textus Receptus' },
  aa: { label: 'AA', fullName: 'Almeida Atualizada', description: 'Edição revista de Almeida com estilo sóbrio e formal' },
  nvt: { label: 'NVT', fullName: 'Nova Versão Transformadora', description: 'Linguagem dinâmica, fluida e clara' },
  kja: { label: 'KJA', fullName: 'King James Atualizada', description: 'Texto canônico para estudo aprofundado das escrituras' }
};

const HIGHLIGHT_COLORS = [
  { name: 'Amarelo', hex: '#fef08a' },
  { name: 'Verde', hex: '#bbf7d0' },
  { name: 'Azul', hex: '#bae6fd' },
  { name: 'Rosa', hex: '#fbcfe8' }
];

const bibleMemoryCache: Record<string, BibleBook[]> = {};

export const Bible: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { branding } = useBranding();
  const bibleCfg = branding.bible_config;

  // Lista de versões permitidas pela congregação
  const allowedVersions: BibleVersion[] = useMemo(() => {
    const raw = bibleCfg?.enabled_versions;
    if (Array.isArray(raw) && raw.length > 0) {
      const valid = raw.filter(v => v in ALL_BIBLE_VERSIONS) as BibleVersion[];
      if (valid.length > 0) return valid;
    }
    return ['nvi', 'acf', 'aa'];
  }, [bibleCfg]);

  const defaultVer: BibleVersion = (bibleCfg?.default_version && allowedVersions.includes(bibleCfg.default_version as BibleVersion))
    ? (bibleCfg.default_version as BibleVersion)
    : (allowedVersions[0] || 'nvi');

  // Estado dos Dados
  const [version, setVersion] = useState<BibleVersion>(defaultVer);
  const [bibleData, setBibleData] = useState<BibleBook[]>(() => bibleMemoryCache[defaultVer] || []);
  const [loading, setLoading] = useState<boolean>(() => !bibleMemoryCache[defaultVer] || bibleMemoryCache[defaultVer].length === 0);

  // Garante que se a versão atual for desabilitada, troca para a padrão
  useEffect(() => {
    if (!allowedVersions.includes(version)) {
      setVersion(defaultVer);
    }
  }, [allowedVersions, defaultVer]);

  // Navegação
  const [selectedBookIndex, setSelectedBookIndex] = useState<number>(42); // 42 = João
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [pickerTestament, setPickerTestament] = useState<'ALL' | 'OLD' | 'NEW'>('ALL');
  const [searchBookTerm, setSearchBookTerm] = useState<string>('');
  const [tempBookIndex, setTempBookIndex] = useState<number | null>(null);

  // Leitura & Acessibilidade
  const [fontSize, setFontSize] = useState<number>(17);
  const [theme, setTheme] = useState<ColorTheme>('light');

  // Marcações & Ações de Versículo
  const [selectedVerseIndex, setSelectedVerseIndex] = useState<number | null>(null);
  const [highlights, setHighlights] = useState<Record<string, string>>({}); // { 'jo_1_v1': '#fef08a' }

  // Carregar Bíblia Completa
  useEffect(() => {
    loadBible(version);
  }, [version]);

  // Carregar marcações salvas
  useEffect(() => {
    const saved = localStorage.getItem('faithhub_bible_highlights');
    if (saved) {
      try {
        setHighlights(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const loadBible = async (ver: BibleVersion) => {
    if (bibleMemoryCache[ver] && bibleMemoryCache[ver].length > 0) {
      setBibleData(bibleMemoryCache[ver]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Tenta buscar do JSON estático local
      const res = await fetch(`/bible/${ver}.json`);
      if (res.ok) {
        const data = await res.json();
        bibleMemoryCache[ver] = data;
        setBibleData(data);
      } else {
        // Fallback para CDN do GitHub
        const fallbackRes = await fetch(`https://raw.githubusercontent.com/thiagobodruk/bible/master/json/pt_${ver}.json`);
        const fallbackData = await fallbackRes.json();
        bibleMemoryCache[ver] = fallbackData;
        setBibleData(fallbackData);
      }
    } catch (err) {
      console.error("Erro ao carregar Bíblia:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveHighlights = (updated: Record<string, string>) => {
    setHighlights(updated);
    localStorage.setItem('faithhub_bible_highlights', JSON.stringify(updated));
  };

  // Livro e Versículos Atuais
  const currentBook = bibleData[selectedBookIndex] || bibleData[0];
  const totalChapters = currentBook?.chapters?.length || 1;
  const currentVerses = currentBook?.chapters?.[selectedChapter - 1] || [];
  const currentKey = `${currentBook?.abbrev || 'book'}_${selectedChapter}`;

  // Navegação entre capítulos
  const handlePrevChapter = () => {
    if (selectedChapter > 1) {
      setSelectedChapter(prev => prev - 1);
      setSelectedVerseIndex(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (selectedBookIndex > 0) {
      const prevBookIdx = selectedBookIndex - 1;
      const prevBook = bibleData[prevBookIdx];
      setSelectedBookIndex(prevBookIdx);
      setSelectedChapter(prevBook.chapters.length);
      setSelectedVerseIndex(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextChapter = () => {
    if (selectedChapter < totalChapters) {
      setSelectedChapter(prev => prev + 1);
      setSelectedVerseIndex(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (selectedBookIndex < bibleData.length - 1) {
      const nextBookIdx = selectedBookIndex + 1;
      setSelectedBookIndex(nextBookIdx);
      setSelectedChapter(1);
      setSelectedVerseIndex(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Ações de Marcação
  const handleApplyHighlight = (colorHex: string) => {
    if (selectedVerseIndex === null) return;
    const verseKey = `${currentKey}_v${selectedVerseIndex}`;
    const updated = { ...highlights, [verseKey]: colorHex };
    saveHighlights(updated);
    setSelectedVerseIndex(null);
  };

  const handleRemoveHighlight = () => {
    if (selectedVerseIndex === null) return;
    const verseKey = `${currentKey}_v${selectedVerseIndex}`;
    const updated = { ...highlights };
    delete updated[verseKey];
    saveHighlights(updated);
    setSelectedVerseIndex(null);
  };

  const handleCopyVerse = (verseText: string) => {
    const verLabel = ALL_BIBLE_VERSIONS[version]?.label || version.toUpperCase();
    const textToCopy = `"${verseText}" — ${currentBook.name} ${selectedChapter}:${(selectedVerseIndex || 0) + 1} (${verLabel})`;
    navigator.clipboard.writeText(textToCopy);
    alert('📋 Versículo copiado com sucesso!');
    setSelectedVerseIndex(null);
  };

  const handleShareVerse = (verseText: string) => {
    const verLabel = ALL_BIBLE_VERSIONS[version]?.label || version.toUpperCase();
    const textToShare = `"${verseText}" — ${currentBook.name} ${selectedChapter}:${(selectedVerseIndex || 0) + 1} (${verLabel})`;
    if (navigator.share) {
      navigator.share({
        title: `${currentBook.name} ${selectedChapter}:${(selectedVerseIndex || 0) + 1}`,
        text: textToShare
      }).catch(() => {});
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textToShare)}`, '_blank');
    }
    setSelectedVerseIndex(null);
  };

  // Filtro de Livros no Picker
  const filteredBooks = useMemo(() => {
    return bibleData.map((b, idx) => ({ ...b, originalIndex: idx })).filter(b => {
      const isOld = b.originalIndex < 39;
      if (pickerTestament === 'OLD' && !isOld) return false;
      if (pickerTestament === 'NEW' && isOld) return false;
      if (searchBookTerm.trim()) {
        return b.name.toLowerCase().includes(searchBookTerm.toLowerCase().trim());
      }
      return true;
    });
  }, [bibleData, pickerTestament, searchBookTerm]);

  // Estilos de Tema de Leitura
  const themeStyles = {
    light: { bg: '#ffffff', text: '#0f172a', border: 'var(--panel-border)', cardBg: '#ffffff', verseHover: '#f1f5f9' },
    sepia: { bg: '#fbf0d9', text: '#433422', border: '#e6d5b8', cardBg: '#f6ebd0', verseHover: '#ebd8b7' },
    dark: { bg: '#0f172a', text: '#f8fafc', border: '#334155', cardBg: '#1e293b', verseHover: '#334155' }
  }[theme];

  return (
    <div className="pwa-content animate-fade-in" style={{ gap: '14px' }}>
      
      {/* Topo / Header com Acessibilidade e Voltar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {onBack && (
            <button 
              type="button" 
              onClick={onBack} 
              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', marginBottom: '2px', padding: 0 }}
            >
              ← Voltar ao Início
            </button>
          )}
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
            📖 Bíblia Sagrada
          </h2>
          <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
            66 Livros • 1.189 Capítulos na Íntegra
          </span>
        </div>

        {/* Controles de Versão e Tema */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Seletor de Versão */}
          {allowedVersions.length > 1 && bibleCfg?.allow_user_version_switch !== false ? (
            <select
              value={version}
              onChange={e => setVersion(e.target.value as BibleVersion)}
              style={{
                padding: '6px 8px',
                borderRadius: '10px',
                border: '1px solid var(--panel-border)',
                background: '#ffffff',
                fontSize: '0.74rem',
                fontWeight: 800,
                color: 'var(--accent-primary)',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {allowedVersions.map(v => (
                <option key={v} value={v}>
                  {ALL_BIBLE_VERSIONS[v]?.label || v.toUpperCase()}
                </option>
              ))}
            </select>
          ) : (
            <div style={{
              padding: '6px 10px',
              borderRadius: '10px',
              border: '1px solid var(--panel-border)',
              background: '#f8fafc',
              fontSize: '0.74rem',
              fontWeight: 900,
              color: 'var(--accent-primary)'
            }}>
              {ALL_BIBLE_VERSIONS[version]?.label || version.toUpperCase()}
            </div>
          )}

          {/* Seletor de Tema (Claro / Sépia / Escuro) */}
          <button
            type="button"
            onClick={() => setTheme(theme === 'light' ? 'sepia' : theme === 'sepia' ? 'dark' : 'light')}
            style={{
              padding: '6px 10px',
              borderRadius: '10px',
              border: '1px solid var(--panel-border)',
              background: theme === 'sepia' ? '#fbf0d9' : theme === 'dark' ? '#1e293b' : '#ffffff',
              color: theme === 'dark' ? '#ffffff' : '#0f172a',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
            title="Alternar Tema"
          >
            {theme === 'light' ? '☀️ Claro' : theme === 'sepia' ? '📜 Sépia' : '🌙 Noite'}
          </button>

          {/* Ajuste de Tamanho da Fonte */}
          <div style={{ display: 'flex', border: '1px solid var(--panel-border)', borderRadius: '10px', overflow: 'hidden', background: '#ffffff' }}>
            <button
              type="button"
              onClick={() => setFontSize(Math.max(14, fontSize - 2))}
              style={{ padding: '4px 8px', border: 'none', background: 'none', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
              title="Diminuir Fonte"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setFontSize(Math.min(26, fontSize + 2))}
              style={{ padding: '4px 8px', border: 'none', background: 'none', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', borderLeft: '1px solid var(--panel-border)' }}
              title="Aumentar Fonte"
            >
              A+
            </button>
          </div>
        </div>
      </div>

      {/* NOTA PASTORAL DA CONGREGAÇÃO */}
      {bibleCfg?.pastoral_note && (
        <div style={{
          background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
          borderRadius: '16px',
          padding: '12px 16px',
          border: '1px solid #99f6e4',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: '1.2rem' }}>🕊️</span>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f766e', textTransform: 'uppercase' }}>
              Orientação da Liderança
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#134e4a', lineHeight: 1.4 }}>
              {bibleCfg.pastoral_note}
            </p>
          </div>
        </div>
      )}

      {/* Barra de Seleção Rápida de Livro & Capítulo */}
      <div 
        onClick={() => { setTempBookIndex(selectedBookIndex); setIsPickerOpen(true); }}
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '16px',
          padding: '12px 16px',
          border: '1.5px solid var(--accent-primary)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.2rem' }}>📜</span>
          <div>
            <div style={{ fontSize: '0.96rem', fontWeight: 900, color: 'var(--text-main)' }}>
              {currentBook?.name || 'Carregando...'} {selectedChapter}
            </div>
            <div style={{ fontSize: '0.70rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
              {selectedBookIndex < 39 ? 'Antigo Testamento' : 'Novo Testamento'} • {ALL_BIBLE_VERSIONS[version]?.label || version.toUpperCase()}
            </div>
          </div>
        </div>

        <button
          type="button"
          style={{
            background: 'var(--accent-primary-light)',
            color: 'var(--accent-primary)',
            border: 'none',
            borderRadius: '10px',
            padding: '6px 12px',
            fontSize: '0.74rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          Trocar Livro ▾
        </button>
      </div>

      {/* ÁREA DE LEITURA DO CAPÍTULO */}
      <div style={{
        background: themeStyles.cardBg,
        color: themeStyles.text,
        borderRadius: '24px',
        padding: '22px 18px',
        border: `1px solid ${themeStyles.border}`,
        boxShadow: 'var(--shadow-sm)',
        minHeight: '55vh',
        transition: 'all 0.25s ease'
      }}>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div>
            <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>Carregando escrituras sagradas...</p>
          </div>
        ) : (
          <>
            {/* Título do Livro e Capítulo */}
            <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: `1px solid ${themeStyles.border}`, paddingBottom: '12px' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0, letterSpacing: '-0.3px' }}>
                {currentBook?.name} {selectedChapter}
              </h1>
              <span style={{ fontSize: '0.72rem', opacity: 0.8, fontWeight: 700 }}>
                {ALL_BIBLE_VERSIONS[version]?.fullName || version.toUpperCase()}
              </span>
            </div>

            {/* Versículos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentVerses.map((verseText, vIdx) => {
                const verseNumber = vIdx + 1;
                const verseKey = `${currentKey}_v${vIdx}`;
                const highlightColor = highlights[verseKey];
                const isSelected = selectedVerseIndex === vIdx;

                return (
                  <p
                    key={vIdx}
                    onClick={() => setSelectedVerseIndex(isSelected ? null : vIdx)}
                    style={{
                      fontSize: `${fontSize}px`,
                      lineHeight: 1.68,
                      margin: 0,
                      padding: '8px 10px',
                      borderRadius: '10px',
                      background: isSelected ? '#bae6fd' : (highlightColor || 'transparent'),
                      border: isSelected ? '1.5px solid #0284c7' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <strong style={{
                      fontSize: '0.72em',
                      color: 'var(--accent-primary)',
                      marginRight: '8px',
                      userSelect: 'none'
                    }}>
                      {verseNumber}
                    </strong>
                    {verseText}
                  </p>
                );
              })}
            </div>
          </>
        )}

      </div>

      {/* NAVEGAÇÃO INFERIOR ENTRE CAPÍTULOS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '4px 0 16px 0' }}>
        <button
          type="button"
          onClick={handlePrevChapter}
          disabled={selectedBookIndex === 0 && selectedChapter === 1}
          style={{
            background: '#ffffff',
            border: '1px solid var(--panel-border)',
            padding: '12px',
            borderRadius: '14px',
            fontWeight: 800,
            fontSize: '0.80rem',
            color: 'var(--text-main)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: 'var(--shadow-sm)',
            opacity: (selectedBookIndex === 0 && selectedChapter === 1) ? 0.4 : 1
          }}
        >
          <span>‹</span> Anterior
        </button>

        <button
          type="button"
          onClick={handleNextChapter}
          disabled={selectedBookIndex === bibleData.length - 1 && selectedChapter === totalChapters}
          style={{
            background: 'var(--accent-primary)',
            border: 'none',
            padding: '12px',
            borderRadius: '14px',
            fontWeight: 800,
            fontSize: '0.80rem',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: '0 4px 10px rgba(15, 118, 110, 0.25)',
            opacity: (selectedBookIndex === bibleData.length - 1 && selectedChapter === totalChapters) ? 0.4 : 1
          }}
        >
          Próximo <span>›</span>
        </button>
      </div>

      {/* ========================================================
          DRAWER / BOTTOM SHEET: SELETOR DE LIVRO & CAPÍTULO
          ======================================================== */}
      <BottomSheet
        isOpen={isPickerOpen}
        onClose={() => { setIsPickerOpen(false); setTempBookIndex(null); }}
        maxHeight="82vh"
      >
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
            Navegar nas Escrituras
          </h3>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            Selecione o Livro e o Capítulo que deseja ler.
          </p>
        </div>

        {/* Abas Antigo / Novo Testamento */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
          <button
            type="button"
            onClick={() => setPickerTestament('ALL')}
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              background: pickerTestament === 'ALL' ? '#ffffff' : 'transparent',
              color: pickerTestament === 'ALL' ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '0.72rem',
              cursor: 'pointer'
            }}
          >
            Todos (66)
          </button>
          <button
            type="button"
            onClick={() => setPickerTestament('OLD')}
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              background: pickerTestament === 'OLD' ? '#ffffff' : 'transparent',
              color: pickerTestament === 'OLD' ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '0.72rem',
              cursor: 'pointer'
            }}
          >
            Antigo (39)
          </button>
          <button
            type="button"
            onClick={() => setPickerTestament('NEW')}
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              background: pickerTestament === 'NEW' ? '#ffffff' : 'transparent',
              color: pickerTestament === 'NEW' ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '0.72rem',
              cursor: 'pointer'
            }}
          >
            Novo (27)
          </button>
        </div>

        {/* Campo de Busca de Livro */}
        <input
          type="text"
          value={searchBookTerm}
          onChange={e => setSearchBookTerm(e.target.value)}
          placeholder="🔍 Buscar livro (ex: Salmos, Romanos, Mateus)..."
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '12px',
            background: '#f8fafc',
            border: '1.5px solid var(--panel-border)',
            fontSize: '0.84rem',
            outline: 'none'
          }}
        />

        {/* 1. SELETOR DE LIVROS */}
        {tempBookIndex === null ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 140px), 1fr))', gap: '8px', maxHeight: '48vh', overflowY: 'auto', paddingRight: '2px' }}>
            {filteredBooks.map((b) => (
              <button
                key={b.abbrev}
                type="button"
                onClick={() => setTempBookIndex(b.originalIndex)}
                style={{
                  padding: '12px 10px',
                  borderRadius: '12px',
                  border: b.originalIndex === selectedBookIndex ? '2px solid var(--accent-primary)' : '1px solid var(--panel-border)',
                  background: b.originalIndex === selectedBookIndex ? 'var(--accent-primary-light)' : '#ffffff',
                  color: 'var(--text-main)',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.84rem' }}>{b.name}</div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>{b.chapters.length} Capítulos</div>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)' }}>›</span>
              </button>
            ))}
          </div>
        ) : (
          /* 2. SELETOR DE CAPÍTULOS DO LIVRO SELECIONADO */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setTempBookIndex(null)}
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}
              >
                ← Voltar aos Livros
              </button>
              <span style={{ fontWeight: 900, fontSize: '0.90rem', color: 'var(--text-main)' }}>
                {bibleData[tempBookIndex]?.name}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', maxHeight: '40vh', overflowY: 'auto', paddingRight: '2px' }}>
              {Array.from({ length: bibleData[tempBookIndex]?.chapters?.length || 1 }, (_, i) => i + 1).map(chNum => (
                <button
                  key={chNum}
                  type="button"
                  onClick={() => {
                    setSelectedBookIndex(tempBookIndex);
                    setSelectedChapter(chNum);
                    setSelectedVerseIndex(null);
                    setIsPickerOpen(false);
                    setTempBookIndex(null);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{
                    padding: '12px 6px',
                    borderRadius: '12px',
                    border: (tempBookIndex === selectedBookIndex && chNum === selectedChapter) ? '2px solid var(--accent-primary)' : '1px solid var(--panel-border)',
                    background: (tempBookIndex === selectedBookIndex && chNum === selectedChapter) ? 'var(--accent-primary)' : '#ffffff',
                    color: (tempBookIndex === selectedBookIndex && chNum === selectedChapter) ? '#ffffff' : 'var(--text-main)',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  {chNum}
                </button>
              ))}
            </div>
          </div>
        )}
      </BottomSheet>

      {/* ========================================================
          BARRA FLUTUANTE DE MARCAÇÃO / COMPARTILHAMENTO
          ======================================================== */}
      {selectedVerseIndex !== null && currentVerses[selectedVerseIndex] && (
        <div 
          style={{
            position: 'fixed',
            bottom: 'calc(var(--bottom-nav-height) + var(--safe-bottom) + 12px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 28px)',
            maxWidth: '440px',
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(12px)',
            borderRadius: '20px',
            padding: '12px 14px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            animation: 'slideUp 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: '#93c5fd', fontWeight: 800 }}>
              {currentBook.name} {selectedChapter}:{selectedVerseIndex + 1}
            </span>
            <button
              type="button"
              onClick={() => setSelectedVerseIndex(null)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.80rem', cursor: 'pointer', fontWeight: 700 }}
            >
              ✕ Fechar
            </button>
          </div>

          {/* Paleta de Cores Marca-Texto */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {HIGHLIGHT_COLORS.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => handleApplyHighlight(c.hex)}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: c.hex,
                    border: '2px solid #ffffff',
                    cursor: 'pointer'
                  }}
                  title={`Marcar em ${c.name}`}
                />
              ))}
              <button
                type="button"
                onClick={handleRemoveHighlight}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: '#334155',
                  color: '#ffffff',
                  border: '1px solid #64748b',
                  fontSize: '0.64rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Remover Marcação"
              >
                ✕
              </button>
            </div>

            {/* Copiar e Compartilhar */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => handleCopyVerse(currentVerses[selectedVerseIndex])}
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                📋 Copiar
              </button>
              <button
                type="button"
                onClick={() => handleShareVerse(currentVerses[selectedVerseIndex])}
                style={{
                  background: '#22c55e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                💬 Zap
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
