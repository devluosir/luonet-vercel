const CN_DIGITS = '零壹贰叁肆伍陆柒捌玖';

function convertSection(numStr: string): string {
  const n = numStr.padStart(4, '0');
  const units = ['仟', '佰', '拾', ''];
  let result = '';

  for (let i = 0; i < 4; i += 1) {
    const d = parseInt(n[i], 10);
    if (d !== 0) {
      result += CN_DIGITS[d] + units[i];
    } else if (result && !result.endsWith('零')) {
      result += '零';
    }
  }

  return result.replace(/零$/, '');
}

export function convertToRmbCapital(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return '';

  const fixed = amount.toFixed(2);
  const [intStr, decStr = ''] = fixed.split('.');
  const jiao = parseInt(decStr[0] || '0', 10);
  const fen = parseInt(decStr[1] || '0', 10);
  const intNum = Number(intStr);

  if (intNum > 999_999_999_999) return '金额超出范围（最大9999亿）';
  if (intNum === 0 && jiao === 0 && fen === 0) return '人民币零元整';

  let intResult = '';
  if (intNum > 0) {
    const yi = Math.floor(intNum / 1e8);
    const wan = Math.floor((intNum % 1e8) / 1e4);
    const ge = intNum % 1e4;

    if (yi > 0) {
      intResult += convertSection(String(yi)) + '亿';
    }
    if (wan > 0) {
      if (yi > 0 && wan < 1000) intResult += '零';
      intResult += convertSection(String(wan)) + '万';
    }
    if (ge > 0) {
      const prevNonZero = yi > 0 || wan > 0;
      if (prevNonZero && (ge < 1000 || (yi > 0 && wan === 0))) intResult += '零';
      intResult += convertSection(String(ge));
    }
  }

  let result = '人民币';
  if (intResult) result += `${intResult}元`;

  if (jiao === 0 && fen === 0) {
    result += '整';
  } else if (jiao === 0) {
    result += (intResult ? '零' : '') + CN_DIGITS[fen] + '分';
  } else {
    result += CN_DIGITS[jiao] + '角' + (fen > 0 ? CN_DIGITS[fen] + '分' : '整');
  }

  return result;
}

export function convertRmbInputToCapital(input: string): string {
  const cleaned = input.replace(/,/g, '').replace(/\s/g, '');
  if (!cleaned) return '';

  const normalized = cleaned.startsWith('.') ? `0${cleaned}` : cleaned;
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return '';

  return convertToRmbCapital(Number(normalized));
}
