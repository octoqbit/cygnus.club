export const mobilePlaceholder = '00000 00000';
export const mobileError = 'Enter a 10-digit Indian mobile number, for example +91 98765 43210.';

export function formatMobileInput(value) {
  let input = typeof value === 'string' ? value.trim() : '';
  if (input.startsWith('+91')) input = input.slice(3);
  let digits = input.replace(/[^0-9]/g,'');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  digits = digits.slice(0,10);
  return digits.length > 5 ? `${digits.slice(0,5)} ${digits.slice(5)}` : digits;
}

export function maskMobileInput(input) {
  const beforeCursor = input.value.slice(0,input.selectionStart ?? input.value.length);
  const digitCount = formatMobileInput(beforeCursor).replace(/ /g,'').length;
  input.value = formatMobileInput(input.value);
  const cursor = Math.min(input.value.length,digitCount + (digitCount > 5 ? 1 : 0));
  input.setSelectionRange(cursor,cursor);
  return input.value;
}

export function normalizeMobile(value) {
  const compact = typeof value === 'string' ? value.replace(/\s/g, '') : '';
  if (/^[0-9]{10}$/.test(compact)) return `+91${compact}`;
  if (/^\+?91[0-9]{10}$/.test(compact)) return compact.startsWith('+') ? compact : `+${compact}`;
  return '';
}

export function formatMobile(value) {
  const mobile = normalizeMobile(value);
  return mobile ? `+91 ${mobile.slice(3,8)} ${mobile.slice(8)}` : '';
}

export function memberQRText(profile) {
  const mobile = formatMobile(profile.mobile_number);
  if (profile.status !== 'approved' || !profile.member_id || !profile.name?.trim() || !mobile) return '';
  const name = profile.name.replace(/[\r\n\t]+/g,' ').trim();
  return `CYGNUS · Member details\nName: ${name}\nMember ID: ${profile.member_id}\nMobile: ${mobile}`;
}

export function memberQRPayload(profile) {
  if (profile.status !== 'approved' || !profile.member_id || !profile.qr_token) return '';
  return `CYGNUS-MEMBER|${profile.member_id}|${profile.qr_token}`;
}

export function parseMemberQR(value) {
  const match = typeof value === 'string' && value.trim().match(/^CYGNUS-MEMBER\|([A-Z0-9-]+)\|([0-9a-f-]{36})$/i);
  return match ? { memberId: match[1], token: match[2] } : null;
}
