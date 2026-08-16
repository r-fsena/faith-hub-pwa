import React, { useState } from 'react';

interface CreditCardFormProps {
  totalAmount: number;
  onSubmit: (cardData: {
    number: string;
    holderName: string;
    expDate: string;
    cvv: string;
    cpf: string;
    installments: number;
  }) => void;
  isLoading?: boolean;
}

export const CreditCardForm: React.FC<CreditCardFormProps> = ({ totalAmount, onSubmit, isLoading = false }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [holderName, setHolderName] = useState('');
  const [expDate, setExpDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cpf, setCpf] = useState('');
  const [installments, setInstallments] = useState(1);

  // Format Card Number: 0000 0000 0000 0000
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // Format Expiration Date: MM/AA
  const handleExpDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setExpDate(`${raw.slice(0, 2)}/${raw.slice(2, 4)}`);
    } else {
      setExpDate(raw);
    }
  };

  // Format CPF: 000.000.000-00
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    const formatted = raw
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    setCpf(formatted);
  };

  // Detect Brand
  const detectBrand = (num: string) => {
    const clean = num.replace(/\s/g, '');
    if (/^4/.test(clean)) return { name: 'Visa', color: '#1a1f71', icon: '💳 Visa' };
    if (/^5[1-5]/.test(clean)) return { name: 'Mastercard', color: '#eb001b', icon: '💳 Mastercard' };
    if (/^(4011|4389|4514|4576|5041|5066|5090|6277|6362|6363)/.test(clean)) return { name: 'Elo', color: '#00a4e8', icon: '💳 Elo' };
    if (/^3[47]/.test(clean)) return { name: 'Amex', color: '#007bc1', icon: '💳 Amex' };
    return { name: 'Card', color: '#64748b', icon: '💳 Cartão de Crédito' };
  };

  const brand = detectBrand(cardNumber);

  // Generate Installment Options
  const installmentOptions = [];
  const maxInstallments = totalAmount >= 100 ? (totalAmount >= 300 ? 12 : 6) : (totalAmount >= 50 ? 3 : 1);
  
  for (let i = 1; i <= maxInstallments; i++) {
    const installmentValue = (totalAmount / i).toFixed(2).replace('.', ',');
    installmentOptions.push({
      count: i,
      label: i === 1 ? `1x de R$ ${installmentValue} (à vista sem juros)` : `${i}x de R$ ${installmentValue} sem juros`
    });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !holderName || !expDate || !cvv || !cpf) {
      alert("Por favor, preencha todos os campos do cartão.");
      return;
    }

    onSubmit({
      number: cardNumber.replace(/\s/g, ''),
      holderName: holderName.trim().toUpperCase(),
      expDate,
      cvv,
      cpf: cpf.replace(/\D/g, ''),
      installments
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      
      {/* Visual Mini Card Preview */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '16px 20px',
          boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '130px',
          marginBottom: '6px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.70rem', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.8 }}>
            CARTÃO DE CRÉDITO
          </span>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#38bdf8' }}>
            {brand.icon}
          </span>
        </div>

        <div style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '0.12em', fontFamily: 'monospace' }}>
          {cardNumber || '•••• •••• •••• ••••'}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', opacity: 0.9 }}>
          <div>
            <div style={{ fontSize: '0.58rem', opacity: 0.7, textTransform: 'uppercase' }}>TITULAR</div>
            <div style={{ fontWeight: 700 }}>{holderName || 'SEU NOME'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.58rem', opacity: 0.7, textTransform: 'uppercase' }}>VALIDADE</div>
            <div style={{ fontWeight: 700 }}>{expDate || 'MM/AA'}</div>
          </div>
        </div>
      </div>

      {/* Número do Cartão */}
      <div>
        <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
          Número do Cartão *
        </label>
        <input 
          type="text" 
          className="input-pwa" 
          placeholder="0000 0000 0000 0000" 
          value={cardNumber} 
          onChange={handleCardNumberChange} 
          required 
        />
      </div>

      {/* Nome no Cartão */}
      <div>
        <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
          Nome Impresso no Cartão *
        </label>
        <input 
          type="text" 
          className="input-pwa" 
          placeholder="Como está gravado no cartão" 
          value={holderName} 
          onChange={e => setHolderName(e.target.value.toUpperCase())} 
          required 
        />
      </div>

      {/* Validade e CVV */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        <div>
          <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
            Validade (MM/AA) *
          </label>
          <input 
            type="text" 
            className="input-pwa" 
            placeholder="12/28" 
            value={expDate} 
            onChange={handleExpDateChange} 
            required 
          />
        </div>
        <div>
          <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
            Código CVV *
          </label>
          <input 
            type="password" 
            className="input-pwa" 
            placeholder="123" 
            maxLength={4}
            value={cvv} 
            onChange={e => setCvv(e.target.value.replace(/\D/g, ''))} 
            required 
          />
        </div>
      </div>

      {/* CPF do Titular */}
      <div>
        <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
          CPF do Titular *
        </label>
        <input 
          type="text" 
          className="input-pwa" 
          placeholder="000.000.000-00" 
          value={cpf} 
          onChange={handleCpfChange} 
          required 
        />
      </div>

      {/* Parcelamento */}
      <div>
        <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
          Opções de Parcelamento *
        </label>
        <select 
          className="input-pwa"
          value={installments}
          onChange={e => setInstallments(Number(e.target.value))}
          style={{ background: '#ffffff', cursor: 'pointer' }}
        >
          {installmentOptions.map(opt => (
            <option key={opt.count} value={opt.count}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <button 
        type="submit" 
        className="btn-pwa-primary"
        disabled={isLoading}
        style={{ marginTop: '8px' }}
      >
        {isLoading ? 'Processando Pagamento...' : `Pagar R$ ${totalAmount.toFixed(2).replace('.', ',')} no Cartão`}
      </button>

      <div style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
        🔒 Pagamento processado de forma 100% segura via Gateway Pagar.me
      </div>
    </form>
  );
};
