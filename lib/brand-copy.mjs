// Keeps saved website copy consistent while the database migration is rolled out.
// URLs, emails, identifiers, storage keys and user profiles are not renamed here.
export function brandCopy(value) {
  if (typeof value !== 'string') return value;
  return value.split(/(https?:\/\/[^\s<>"']+|mailto:[^\s<>"']+|[\w.+-]+@[\w.-]+\.[a-z]{2,})/gi)
    .map((part, index) => index % 2 ? part : part
      .replace(/Sensing\s*(?:and|&amp;|&)\s*Automation Club/gi, 'CYGNUS')
      .replace(/\bSAC-((?:EC|ME|CS|EE|CE|BT|AI|RB|OT)-[0-9]{3,})\b/g, 'CYG-$1')
      .replace(/\bSAC\b/g, 'CYGNUS')
      .replace(/CYGNUS\s*\(CYGNUS\)/g, 'CYGNUS')
      .replace(/CYGNUS\s*\/\s*(?:CYGNUS|THE TECHNICAL CLUB)/gi, 'CYGNUS')
      .replace('Who can join the CYGNUS?', 'Who can join CYGNUS?'))
    .join('');
}
