export const teamPrefix = 'team-person-';
export const teamGroups = [
  {id:'hardware',name:'The Builders',area:'Hardware & Robotics',description:'Meet the people building circuits, mechanisms, and robots.'},
  {id:'code',name:'The Thinkers',area:'Software & AI',description:'Meet the people bringing ideas to life through code.'},
  {id:'design',name:'The Shapers',area:'Design & Experience',description:'Meet the people making complicated things feel simple.'},
  {id:'community',name:'The Connectors',area:'Community & Events',description:'Meet the people bringing the club together.'},
  {id:'story',name:'The Storytellers',area:'Media & Storytelling',description:'Meet the people capturing and sharing our stories.'},
];

export function teamEmail(value) {
  const email = typeof value === 'string' ? value.trim() : '';
  return email.length <= 254 && /^[^\s<>@?&#]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email) ? email : '';
}

export function teamLinkedIn(value) {
  try {
    const input = typeof value === 'string' ? value.trim() : '';
    if (!input || /[\s\\\u0000-\u001f\u007f]/.test(input)) return '';
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    if (!['http:','https:'].includes(url.protocol) || !/^(?:[a-z0-9-]+\.)*linkedin\.com$/.test(url.hostname) || url.port || url.username || url.password || !/^\/in\/[^/]+\/?$/.test(url.pathname)) return '';
    // Store one HTTPS form for pasted desktop, regional, and scheme-less links.
    return `https://www.linkedin.com${url.pathname}`;
  } catch { return ''; }
}

export function decodeTeamRows(rows) {
  return (rows || []).flatMap(row => {
    if (!row.id?.startsWith(teamPrefix)) return [];
    try {
      const item = JSON.parse(row.value);
      if (typeof item.name !== 'string' || !item.name.trim() || !teamGroups.some(group => group.id === item.group)) return [];
      const sort_order = Number.isSafeInteger(item.sort_order) && item.sort_order >= 0 ? item.sort_order : 0;
      return [{id:row.id,name:item.name.trim(),group:item.group,sort_order,email:teamEmail(item.email),linkedin:teamLinkedIn(item.linkedin)}];
    } catch { return []; }
  }).sort((a,b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
