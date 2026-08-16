import React, { useState, useEffect } from 'react';

interface Book {
  id: string;
  name: string;
  testament: 'OLD' | 'NEW';
  chapters: number;
}

const BOOKS: Book[] = [
  { id: 'gn', name: 'Gênesis', testament: 'OLD', chapters: 50 },
  { id: 'ex', name: 'Êxodo', testament: 'OLD', chapters: 40 },
  { id: 'sl', name: 'Salmos', testament: 'OLD', chapters: 150 },
  { id: 'pv', name: 'Provérbios', testament: 'OLD', chapters: 31 },
  { id: 'is', name: 'Isaías', testament: 'OLD', chapters: 66 },
  { id: 'mt', name: 'Mateus', testament: 'NEW', chapters: 28 },
  { id: 'mc', name: 'Marcos', testament: 'NEW', chapters: 16 },
  { id: 'lc', name: 'Lucas', testament: 'NEW', chapters: 24 },
  { id: 'jo', name: 'João', testament: 'NEW', chapters: 21 },
  { id: 'rm', name: 'Romanos', testament: 'NEW', chapters: 16 },
  { id: '1co', name: '1 Coríntios', testament: 'NEW', chapters: 16 },
  { id: 'fp', name: 'Filipenses', testament: 'NEW', chapters: 4 },
  { id: 'ap', name: 'Apocalipse', testament: 'NEW', chapters: 22 }
];

const SAMPLE_VERSES_NVI: Record<string, string[]> = {
  'jo_1': [
    'No princípio era aquele que é a Palavra. Ele estava com Deus, e era Deus.',
    'Ela estava com Deus no princípio.',
    'Todas as coisas foram feitas por intermédio dele; sem ele, nada do que existe teria sido feito.',
    'Nele estava a vida, e esta era a luz dos homens.',
    'A luz brilha nas trevas, e as trevas não a derrotaram.'
  ],
  'sl_23': [
    'O Senhor é o meu pastor; de nada terei falta.',
    'Em verdes pastagens me faz repousar e me conduz a águas tranquilas;',
    'restaura-me o vigor. Guia-me nas veredas da justiça por amor do seu nome.',
    'Mesmo quando eu andar por um vale de trevas e morte, não temerei perigo algum, pois tu estás comigo; a tua vara e o teu cajado me protegem.',
    'Preparas um banquete para mim à vista dos meus inimigos. Tu unges a minha cabeça com óleo, e o meu cálice transborda.',
    'Sei que a bondade e a fidelidade me acompanharão todos os dias da minha vida, e habitarei na casa do Senhor para sempre.'
  ]
};

const SAMPLE_VERSES_ARC: Record<string, string[]> = {
  'jo_1': [
    'No princípio era o Verbo, e o Verbo estava com Deus, e o Verbo era Deus.',
    'Ele estava no princípio com Deus.',
    'Todas as coisas foram feitas por ele, e sem ele nada do que foi feito se fez.',
    'Nele estava a vida e a vida era a luz dos homens.',
    'E a luz resplandece nas trevas, e as trevas não a compreenderam.'
  ],
  'sl_23': [
    'O Senhor é o meu pastor; nada me faltará.',
    'Deitar-me faz em verdes pastos, guia-me mansamente a águas mansas.',
    'Refrigera a minha alma; guia-me pelas veredas da justiça por amor do seu nome.',
    'Ainda que eu andasse pelo vale da sombra da morte, não temeria mal algum, porque tu estás comigo; a tua vara e o teu cajado me consolam.',
    'Preparas uma mesa perante mim na presença dos meus inimigos, unges a minha cabeça com óleo, o meu cálice transborda.',
    'Certamente que a bondade e a misericórdia me seguirão todos os dias da minha vida; e habitarei na Casa do Senhor por longos dias.'
  ]
};

export const Bible: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [selectedBook, setSelectedBook] = useState<Book>(BOOKS[8]); // João
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [version, setVersion] = useState<'NVI' | 'ARC'>('NVI');
  const [fontSize, setFontSize] = useState<number>(16);
  
  // Marcação de Versículos
  const [selectedVerseIndex, setSelectedVerseIndex] = useState<number | null>(null);
  const [highlights, setHighlights] = useState<Record<string, string>>({}); // { 'jo_1_v1': '#fef08a' }

  useEffect(() => {
    const saved = localStorage.getItem('faithhub_bible_highlights');
    if (saved) {
      try {
        setHighlights(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const saveHighlights = (updated: Record<string, string>) => {
    setHighlights(updated);
    localStorage.setItem('faithhub_bible_highlights', JSON.stringify(updated));
  };

  const currentKey = `${selectedBook.id}_${selectedChapter}`;
  const versesData = version === 'NVI' ? SAMPLE_VERSES_NVI : SAMPLE_VERSES_ARC;
  const verses = versesData[currentKey] || [
    '1. Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.',
    '2. Porque Deus enviou o seu Filho ao mundo, não para que condenasse o mundo, mas para que o mundo fosse salvo por ele.',
    '3. Quem crê nele não é condenado; mas quem não crê já está condenado, porquanto não crê no nome do unigênito Filho de Deus.'
  ];

  const handleApplyHighlight = (color: string) => {
    if (selectedVerseIndex === null) return;
    const verseKey = `${currentKey}_v${selectedVerseIndex}`;
    const updated = { ...highlights, [verseKey]: color };
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
    const textToCopy = `"${verseText}" — ${selectedBook.name} ${selectedChapter}:${(selectedVerseIndex || 0) + 1} (${version})`;
    navigator.clipboard.writeText(textToCopy);
    alert('📋 Versículo copiado para a área de transferência!');
    setSelectedVerseIndex(null);
  };

  return (
    <div className="pwa-content animate-fade-in">
      
      {/* Header com Voltar e Seletor de Versão */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {onBack && (
            <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.80rem', fontWeight: 800, cursor: 'pointer', marginBottom: '4px' }}>
              ← Voltar ao Início
            </button>
          )}
          <h2 className="section-title" style={{ fontSize: '1.25rem' }}>Bíblia Sagrada</h2>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Leitura e meditação na Palavra</p>
        </div>

        {/* Controles de Versão e Tamanho de Fonte */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <select 
            className="input-pwa"
            value={version}
            onChange={e => setVersion(e.target.value as any)}
            style={{ padding: '6px 8px', fontSize: '0.74rem', fontWeight: 800, borderRadius: '10px', background: '#ffffff', cursor: 'pointer', width: 'auto' }}
          >
            <option value="NVI">NVI</option>
            <option value="ARC">ARC</option>
          </select>

          <button 
            type="button" 
            onClick={() => setFontSize(Math.max(13, fontSize - 2))}
            style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: '#ffffff', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
            title="Diminuir fonte"
          >
            A-
          </button>
          <button 
            type="button" 
            onClick={() => setFontSize(Math.min(22, fontSize + 2))}
            style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: '#ffffff', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
            title="Aumentar fonte"
          >
            A+
          </button>
        </div>
      </div>

      {/* Barra de Seleção de Livro e Capítulo */}
      <div style={{ background: '#ffffff', borderRadius: '18px', padding: '14px', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            className="input-pwa"
            value={selectedBook.id}
            onChange={e => {
              const b = BOOKS.find(x => x.id === e.target.value);
              if (b) { setSelectedBook(b); setSelectedChapter(1); setSelectedVerseIndex(null); }
            }}
            style={{ background: '#f8fafc', fontWeight: 800, cursor: 'pointer' }}
          >
            {BOOKS.map(b => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.testament === 'OLD' ? 'Antigo' : 'Novo'})
              </option>
            ))}
          </select>

          <select
            className="input-pwa"
            value={selectedChapter}
            onChange={e => { setSelectedChapter(Number(e.target.value)); setSelectedVerseIndex(null); }}
            style={{ background: '#f8fafc', fontWeight: 800, cursor: 'pointer', width: '110px' }}
          >
            {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(ch => (
              <option key={ch} value={ch}>
                Cap. {ch}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ÁREA DE LEITURA DOS VERSÍCULOS */}
      <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)', minHeight: '40vh' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
            {selectedBook.name} {selectedChapter}
          </h3>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-primary)', background: 'var(--accent-primary-light)', padding: '3px 8px', borderRadius: '6px' }}>
            {version}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {verses.map((verse, index) => {
            const verseKey = `${currentKey}_v${index}`;
            const highlightColor = highlights[verseKey];
            const isSelected = selectedVerseIndex === index;

            return (
              <p
                key={index}
                onClick={() => setSelectedVerseIndex(isSelected ? null : index)}
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: 1.6,
                  color: 'var(--text-main)',
                  margin: 0,
                  padding: '6px 8px',
                  borderRadius: '8px',
                  background: isSelected ? '#e0f2fe' : (highlightColor || 'transparent'),
                  border: isSelected ? '1.5px solid #0284c7' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
              >
                <strong style={{ fontSize: '0.78em', color: 'var(--accent-primary)', marginRight: '6px' }}>
                  {index + 1}
                </strong>
                {verse}
              </p>
            );
          })}
        </div>

      </div>

      {/* BARRA FLUTUANTE DE MARCA-TEXTO / AÇÕES QUANDO UM VERSÍCULO ESTÁ SELECIONADO */}
      {selectedVerseIndex !== null && (
        <div 
          style={{
            position: 'fixed',
            bottom: '76px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: '440px',
            background: '#1e293b',
            color: '#ffffff',
            borderRadius: '16px',
            padding: '12px 16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 100
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, opacity: 0.8 }}>Grifar:</span>
            {['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8'].map(color => (
              <button
                key={color}
                type="button"
                onClick={() => handleApplyHighlight(color)}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: color,
                  border: '2px solid #ffffff',
                  cursor: 'pointer'
                }}
              />
            ))}
            <button
              type="button"
              onClick={handleRemoveHighlight}
              style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}
              title="Remover grifo"
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => handleCopyVerse(verses[selectedVerseIndex])}
              style={{ background: 'var(--accent-primary)', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
            >
              📋 Copiar
            </button>
            <button
              type="button"
              onClick={() => setSelectedVerseIndex(null)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1rem', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
