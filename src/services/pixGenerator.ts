/**
 * Utilitário de Geração de Pix BR Code Oficial (Padrão EMVCo / Banco Central do Brasil)
 * Gera a string oficial "Copia e Cola" e o payload para QR Code em conformidade com as regras do Bacen.
 */

export interface PixPayloadOptions {
  pixKey: string;
  merchantName: string;
  merchantCity?: string;
  amount?: number;
  txId?: string;
  description?: string;
}

/**
 * Remove acentos e caracteres especiais para total compatibilidade com o padrão EMVCo
 */
export function sanitizeText(text: string, maxLength: number): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .toUpperCase()
    .substring(0, maxLength);
}

/**
 * Formata um campo no padrão EMV (ID + Tamanho com 2 dígitos + Valor)
 */
export function formatEMV(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id.padStart(2, '0')}${len}${value}`;
}

/**
 * Calcula o Checksum CRC16-CCITT (Polinômio 0x1021, valor inicial 0xFFFF)
 */
export function calculatePixCRC16(payload: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }

  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Normaliza e formata a Chave Pix
 */
export function normalizePixKey(key: string): string {
  const cleanKey = key.trim();
  
  // Se for apenas dígitos
  const digitsOnly = cleanKey.replace(/\D/g, '');
  
  // Se for CPF (11 dígitos)
  if (digitsOnly.length === 11 && !cleanKey.includes('@') && !cleanKey.startsWith('+')) {
    return digitsOnly;
  }
  
  // Se for CNPJ (14 dígitos)
  if (digitsOnly.length === 14 && !cleanKey.includes('@')) {
    return digitsOnly;
  }
  
  // Se for Telefone (começando com DDD)
  if ((digitsOnly.length === 10 || digitsOnly.length === 11) && (cleanKey.startsWith('(') || cleanKey.startsWith('+55') || cleanKey.startsWith('55'))) {
    const rawNumber = digitsOnly.startsWith('55') ? digitsOnly : `55${digitsOnly}`;
    return `+${rawNumber}`;
  }

  // E-mail ou Chave Aleatória (EVP)
  return cleanKey;
}

/**
 * Gera o payload oficial do Pix Copia e Cola (BR Code EMVCo)
 */
export function generatePixBrCode(options: PixPayloadOptions): string {
  const { pixKey, merchantName, merchantCity, amount, txId, description } = options;

  if (!pixKey) {
    throw new Error('Chave Pix é obrigatória para gerar o BR Code');
  }

  const normalizedKey = normalizePixKey(pixKey);
  const cleanName = sanitizeText(merchantName || 'IGREJA', 25) || 'IGREJA';
  const cleanCity = sanitizeText(merchantCity || 'BRASIL', 15) || 'BRASIL';
  const cleanTxId = txId ? sanitizeText(txId, 25).replace(/\s+/g, '') : '***';

  // 1. Tag 00: Payload Format Indicator (Sempre "01")
  let payload = formatEMV('00', '01');

  // 2. Tag 01: Point of Initiation Method ("12" para transação dinâmica/única com valor definido ou "11" para estática)
  payload += formatEMV('01', amount && amount > 0 ? '12' : '11');

  // 3. Tag 26: Merchant Account Information (GUI + Chave + Descrição opcional)
  let merchantAccountInfo = formatEMV('00', 'br.gov.bcb.pix');
  merchantAccountInfo += formatEMV('01', normalizedKey);
  if (description) {
    const cleanDesc = sanitizeText(description, 25);
    if (cleanDesc) {
      merchantAccountInfo += formatEMV('02', cleanDesc);
    }
  }
  payload += formatEMV('26', merchantAccountInfo);

  // 4. Tag 52: Merchant Category Code (0000 para igrejas / geral)
  payload += formatEMV('52', '0000');

  // 5. Tag 53: Transaction Currency (986 = Real BRL)
  payload += formatEMV('53', '986');

  // 6. Tag 54: Transaction Amount (Valor fixado se fornecido)
  if (amount !== undefined && amount > 0) {
    payload += formatEMV('54', amount.toFixed(2));
  }

  // 7. Tag 58: Country Code (BR)
  payload += formatEMV('58', 'BR');

  // 8. Tag 59: Merchant Name (Nome da Igreja)
  payload += formatEMV('59', cleanName);

  // 9. Tag 60: Merchant City (Cidade da Igreja)
  payload += formatEMV('60', cleanCity);

  // 10. Tag 62: Additional Data Field Template (TxID / Referência)
  const additionalData = formatEMV('05', cleanTxId || '***');
  payload += formatEMV('62', additionalData);

  // 11. Tag 63: CRC16 Checksum
  const payloadWithoutCRC = `${payload}6304`;
  const crc = calculatePixCRC16(payloadWithoutCRC);

  return `${payloadWithoutCRC}${crc}`;
}

/**
 * Gera a URL da imagem do QR Code a partir do payload oficial BR Code
 */
export function getPixQrCodeImageUrl(brCodePayload: string, size = 300): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(brCodePayload)}`;
}
