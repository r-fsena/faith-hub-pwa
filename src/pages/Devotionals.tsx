import React, { useState } from 'react';

interface DevotionalItem {
  id: string;
  day_number: number;
  title: string;
  date: string;
  passage: string;
  verse_text: string;
  content: string;
  author: string;
}

const SAMPLE_DEVOTIONALS: DevotionalItem[] = [
  {
    id: '1',
    day_number: 15,
    title: 'Renovando as Forças no Senhor',
    date: 'Hoje, 15 de Agosto',
    passage: 'Isaías 40:29-31',
    verse_text: 'Ele fortalece o cansado e multiplica as forças ao que não tem nenhum vigor.',
    content: 'O cansaço da caminhada é natural à condição humana, mas a nossa fonte inesgotável vem do alto. Quando aprendemos a esperar no tempo e na fidelidade do Senhor, encontramos asas para voar por cima das tempestades mais densas. Permita que hoje o Espírito Santo renove a sua mente, o seu coração e a sua determinação.',
    author: 'Pr. Rafael Sena'
  },
  {
    id: '2',
    day_number: 14,
    title: 'O Poder da Comunhão em Família',
    date: '14 de Agosto',
    passage: 'Salmos 133:1-3',
    verse_text: 'Como é bom e agradável quando os irmãos convivem em união!',
    content: 'A igreja não é apenas um templo físico, mas uma família viva unida pelo sangue de Cristo. Quando nos reunimos nas células, nos lares e nos cultos com sinceridade de coração, o Senhor ali ordena a bênção e a vida para sempre. Cuide dos seus relacionamentos ministeriais e familiares.',
    author: 'Liderança Pastoral'
  },
  {
    id: '3',
    day_number: 13,
    title: 'Caminhando pela Fé e não por Vista',
    date: '13 de Agosto',
    passage: '2 Coríntios 5:7',
    verse_text: 'Porque vivemos por fé, e não pelo que vemos.',
    content: 'Os olhos naturais enxergam apenas as circunstâncias imediatas, mas os olhos espirituais da fé contemplam as promessas eternas de Deus. Permaneça firme naquilo que o Senhor já declarou sobre a sua vida e seu ministério.',
    author: 'Pr. Rafael Sena'
  },
  {
    id: '4',
    day_number: 12,
    title: 'A Paz que Excede Todo Entendimento',
    date: '12 de Agosto',
    passage: 'Filipenses 4:6-7',
    verse_text: 'Não andem ansiosos por coisa alguma, mas em tudo, pela oração e súplicas, apresentem seus pedidos a Deus.',
    content: 'A verdadeira paz bíblica não é ausência de problemas, mas a presença constante de Jesus no barco. Entregue suas preocupações no altar nesta manhã.',
    author: 'Pra. Ana Cláudia'
  }
];

export const Devotionals: React.FC = () => {
  const [selectedDevotional, setSelectedDevotional] = useState<DevotionalItem>(SAMPLE_DEVOTIONALS[0]);
  const [liked, setLiked] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'reading' | 'calendar'>('reading');
  const [selectedMonth] = useState('Agosto 2026');

  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  const handleSelectDay = (day: number) => {
    const found = SAMPLE_DEVOTIONALS.find(d => d.day_number === day);
    if (found) {
      setSelectedDevotional(found);
    } else {
      setSelectedDevotional({
        id: `dev_${day}`,
        day_number: day,
        title: `Graça & Provisão Diária (Dia ${day})`,
        date: `${day} de Agosto`,
        passage: 'Lamentações 3:22-23',
        verse_text: 'As misericórdias do Senhor são a causa de não sermos consumidos; renovam-se a cada manhã.',
        content: `Neste dia ${day}, busque ao Senhor nas primeiras horas. Sua fidelidade é grande e sustenta todos os que Nele confiam de todo coração.`,
        author: 'Corpo Pastoral'
      });
    }
    setViewMode('reading');
  };

  return (
    <div className="pwa-content animate-fade-in">
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="section-title" style={{ fontSize: '1.25rem' }}>Palavra & Devocionais</h2>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Edificação diária para sua vida e família</p>
        </div>

        <button
          type="button"
          onClick={() => setViewMode(viewMode === 'reading' ? 'calendar' : 'reading')}
          style={{
            background: 'var(--accent-primary-light)',
            color: 'var(--accent-primary)',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '0.74rem',
            cursor: 'pointer'
          }}
        >
          {viewMode === 'reading' ? '📅 Calendário' : '📖 Ler Devocional'}
        </button>
      </div>

      {/* MODO CALENDÁRIO */}
      {viewMode === 'calendar' ? (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {selectedMonth}
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Toque no dia para ler</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center' }}>
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
              <div key={i} style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-muted)', paddingBottom: '6px' }}>
                {d}
              </div>
            ))}

            {daysInMonth.map(day => {
              const isSelected = selectedDevotional.day_number === day;
              const hasPreset = SAMPLE_DEVOTIONALS.some(d => d.day_number === day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  style={{
                    height: '38px',
                    borderRadius: '10px',
                    border: isSelected ? '2px solid var(--accent-primary)' : (hasPreset ? '1px solid var(--panel-border)' : '1px solid transparent'),
                    background: isSelected ? 'var(--accent-primary)' : (hasPreset ? '#f0fdfa' : '#f8fafc'),
                    color: isSelected ? '#ffffff' : (hasPreset ? 'var(--accent-primary)' : 'var(--text-secondary)'),
                    fontWeight: hasPreset || isSelected ? 800 : 500,
                    fontSize: '0.80rem',
                    cursor: 'pointer'
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* MODO LEITURA */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Card Devocional Selecionado */}
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ☀️ {selectedDevotional.date}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {selectedDevotional.passage}
              </span>
            </div>

            <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '12px' }}>
              {selectedDevotional.title}
            </h1>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', borderLeft: '4px solid var(--accent-primary)', marginBottom: '16px' }}>
              <p style={{ fontSize: '0.86rem', fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                "{selectedDevotional.verse_text}"
              </p>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '4px', display: 'block' }}>
                {selectedDevotional.passage}
              </span>
            </div>

            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
              {selectedDevotional.content}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--panel-border)', paddingTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-primary-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>
                  ✍️
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-main)' }}>{selectedDevotional.author}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Autor</div>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setLiked(!liked)}
                style={{ background: liked ? '#fee2e2' : '#f1f5f9', color: liked ? '#ef4444' : 'var(--text-secondary)', border: 'none', padding: '8px 14px', borderRadius: '10px', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {liked ? '❤️ Abençoado!' : '🤍 Foi edificante'}
              </button>
            </div>
          </div>

          {/* Histórico / Outras Edições */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '10px' }}>
              Edições Anteriores
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {SAMPLE_DEVOTIONALS.map(dev => (
                <div 
                  key={dev.id}
                  onClick={() => setSelectedDevotional(dev)}
                  style={{ 
                    background: selectedDevotional.id === dev.id ? '#f0fdfa' : '#ffffff', 
                    border: selectedDevotional.id === dev.id ? '1.5px solid var(--accent-primary)' : '1px solid var(--panel-border)',
                    borderRadius: '14px', 
                    padding: '12px 14px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{dev.date}</div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)' }}>{dev.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{dev.passage}</div>
                  </div>
                  <span style={{ color: 'var(--text-muted)' }}>›</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
