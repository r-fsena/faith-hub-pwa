import React, { useState, useEffect, useRef } from 'react';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

interface AddressSuggestion {
  display_name: string;
  formatted: string;
  road?: string;
  suburb?: string;
  city?: string;
  state?: string;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Ex: Av. Paulista, 1000 ou seu CEP...",
  label,
  required = false
}) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Fecha dropdown se clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAddress = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);

    try {
      // 1. Verifica se é um CEP (8 dígitos)
      const cleanCep = trimmed.replace(/\D/g, '');
      if (cleanCep.length === 8) {
        try {
          const cepRes = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`);
          if (cepRes.ok) {
            const cepData = await cepRes.json();
            const formatted = [
              cepData.street,
              cepData.neighborhood,
              `${cepData.city} - ${cepData.state}`
            ].filter(Boolean).join(', ');

            if (formatted) {
              setSuggestions([{
                display_name: formatted,
                formatted: formatted,
                road: cepData.street,
                suburb: cepData.neighborhood,
                city: cepData.city,
                state: cepData.state
              }]);
              setIsOpen(true);
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          // Fallback para busca por texto
        }
      }

      // 2. Busca Geocodificada Inteligente no Brasil (OpenStreetMap Nominatim)
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&countrycodes=br&addressdetails=1&limit=5`,
        {
          headers: {
            'Accept-Language': 'pt-BR,pt;q=0.9'
          }
        }
      );

      if (res.ok) {
        const data = await res.json();
        const formattedList: AddressSuggestion[] = data.map((item: any) => {
          const addr = item.address || {};
          const road = addr.road || addr.street || addr.pedestrian || addr.footway || item.name || '';
          const suburb = addr.suburb || addr.neighbourhood || addr.city_district || '';
          const city = addr.city || addr.town || addr.municipality || addr.village || '';
          const state = addr.state || '';

          let formatted = '';
          if (road) {
            formatted += road;
            if (suburb) formatted += `, ${suburb}`;
            if (city) formatted += ` - ${city}`;
            if (state) formatted += `/${state}`;
          } else {
            formatted = item.display_name.split(',').slice(0, 3).join(',');
          }

          return {
            display_name: item.display_name,
            formatted: formatted || item.display_name,
            road,
            suburb,
            city,
            state
          };
        });

        setSuggestions(formattedList);
        setIsOpen(formattedList.length > 0);
      }
    } catch (err) {
      console.log('Erro na busca de endereço:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    onChange(text);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      searchAddress(text);
    }, 380);
  };

  const handleSelectSuggestion = (sug: AddressSuggestion) => {
    onChange(sug.formatted);
    setIsOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {label && (
        <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
          {label}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          required={required}
          autoComplete="street-address"
          style={{
            width: '100%',
            padding: '12px 36px 12px 38px',
            borderRadius: '12px',
            background: '#f8fafc',
            border: '1.5px solid var(--panel-border)',
            fontSize: '0.88rem',
            color: 'var(--text-main)',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
        />

        {/* Ícone Inicial */}
        <span style={{ position: 'absolute', left: '12px', fontSize: '1rem', pointerEvents: 'none', opacity: 0.7 }}>
          📍
        </span>

        {/* Indicador de Carregamento ou Botão Limpar */}
        <div style={{ position: 'absolute', right: '12px', display: 'flex', alignItems: 'center' }}>
          {loading ? (
            <span style={{ fontSize: '0.82rem', animation: 'spin 1s linear infinite' }}>⏳</span>
          ) : value ? (
            <button
              type="button"
              onClick={() => { onChange(''); setSuggestions([]); setIsOpen(false); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                padding: '2px 4px',
                fontWeight: 700
              }}
              title="Limpar endereço"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      {/* Dica de usabilidade */}
      <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px' }}>
        💡 Digite o nome da rua, bairro ou CEP para buscar automaticamente.
      </span>

      {/* Dropdown de Sugestões Inteligentes */}
      {isOpen && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% - 14px)',
          left: 0,
          right: 0,
          background: '#ffffff',
          borderRadius: '14px',
          border: '1.5px solid var(--accent-primary)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          zIndex: 9999,
          maxHeight: '220px',
          overflowY: 'auto',
          padding: '6px 0'
        }}>
          <div style={{ padding: '6px 12px', fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>
            Sugestões encontradas (toque para preencher)
          </div>

          {suggestions.map((sug, idx) => (
            <div
              key={idx}
              onClick={() => handleSelectSuggestion(sug)}
              style={{
                padding: '10px 14px',
                borderBottom: idx < suggestions.length - 1 ? '1px solid #f8fafc' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-primary-light)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
            >
              <span style={{ fontSize: '1.1rem', marginTop: '2px' }}>📍</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)', wordBreak: 'break-word' }}>
                  {sug.road || sug.formatted.split(',')[0]}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', wordBreak: 'break-word' }}>
                  {sug.suburb ? `${sug.suburb} • ` : ''}{sug.city ? `${sug.city}` : ''}{sug.state ? ` - ${sug.state}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
