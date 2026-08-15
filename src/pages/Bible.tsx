import React, { useState } from 'react';

export const Bible: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [selectedBook, setSelectedBook] = useState('Salmos');
  const [selectedChapter, setSelectedChapter] = useState(23);

  const books = ['Gênesis', 'Salmos', 'Provérbios', 'Isaías', 'Mateus', 'João', 'Romanos', 'Filipenses', 'Apocalipse'];

  const sampleVerses: { [key: string]: string[] } = {
    'Salmos_23': [
      '1. O Senhor é o meu pastor; de nada terei falta.',
      '2. Em verdes pastagens me faz repousar e me conduz a águas tranquilas;',
      '3. restaura-me o vigor. Guia-me nas veredas da justiça por amor do seu nome.',
      '4. Mesmo quando eu andar por um vale de trevas e morte, não temerei perigo algum, pois tu estás comigo; a tua vara e o teu cajado me protegem.',
      '5. Preparas um banquete para mim na presença dos meus inimigos. Unges a minha cabeça com óleo, e o meu cálice transborda.',
      '6. Sei que a bondade e a fidelidade me acompanharão todos os dias da minha vida, e voltarei à casa do Senhor enquanto eu viver.'
    ]
  };

  const currentVerses = sampleVerses[`${selectedBook}_${selectedChapter}`] || [
    '1. No princípio era o Verbo, e o Verbo estava com Deus, e o Verbo era Deus.',
    '2. Ele estava no princípio com Deus.',
    '3. Todas as coisas foram feitas por intermédio dele; sem ele, nada do que existe teria sido feito.'
  ];

  return (
    <div className="pwa-content animate-fade-in">
      
      <div className="section-header-row">
        <div>
          {onBack && (
            <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.80rem', fontWeight: 800, cursor: 'pointer', marginBottom: '4px' }}>
              ← Voltar ao Início
            </button>
          )}
          <h2 className="section-title" style={{ fontSize: '1.25rem' }}>Bíblia Sagrada (NVI)</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Alimento diário para a alma</p>
        </div>
      </div>

      {/* Seletores de Livro e Capítulo */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <select 
          className="input-pwa" 
          value={selectedBook}
          onChange={e => setSelectedBook(e.target.value)}
          style={{ flex: 2 }}
        >
          {books.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        <select 
          className="input-pwa" 
          value={selectedChapter}
          onChange={e => setSelectedChapter(Number(e.target.value))}
          style={{ flex: 1 }}
        >
          {[1, 2, 3, 23, 40, 91, 119, 133].map(c => (
            <option key={c} value={c}>Cap. {c}</option>
          ))}
        </select>
      </div>

      {/* Texto Bíblico */}
      <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '12px' }}>
          {selectedBook} {selectedChapter}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', lineHeight: 1.7, fontSize: '0.92rem', color: 'var(--text-main)' }}>
          {currentVerses.map((verse, idx) => (
            <p key={idx} style={{ margin: 0 }}>
              {verse}
            </p>
          ))}
        </div>
      </div>

    </div>
  );
};
