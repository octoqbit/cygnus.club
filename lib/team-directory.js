import { supabase, checked } from './supabase.js';
import { teamGroups, teamPrefix, decodeTeamRows } from './team-data.mjs';

export function initializeTeamDirectory() {
  const dialog = document.querySelector('#team-directory');
  if (!dialog) return;
  const list = dialog.querySelector('.team-people');
  const status = dialog.querySelector('[data-team-status]');
  const retry = dialog.querySelector('[data-team-retry]');
  let opener, activeGroup, request = 0;

  function renderPerson(person,index) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'team-person-name';
    button.id = `team-person-name-${index}`;
    button.setAttribute('aria-expanded','false');
    button.setAttribute('aria-controls',`team-person-contact-${index}`);
    const name = document.createElement('span');
    name.textContent = person.name;
    const icon = document.createElement('span');
    icon.textContent = '+'; icon.setAttribute('aria-hidden','true');
    button.append(name,icon);
    const contact = document.createElement('div');
    contact.className = 'team-person-contact';
    contact.id = `team-person-contact-${index}`;
    contact.hidden = true;
    contact.setAttribute('role','region');
    contact.setAttribute('aria-labelledby',button.id);
    function link(label,text,href,external=false) {
      const row = document.createElement('div');
      const caption = document.createElement('span');
      caption.className = 'eyebrow'; caption.textContent = label;
      const anchor = document.createElement('a');
      anchor.textContent = text; anchor.href = href;
      if (external) { anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; }
      row.append(caption,anchor); contact.append(row);
    }
    if (person.email) link('Email',person.email,`mailto:${encodeURIComponent(person.email)}`);
    if (person.linkedin) link('LinkedIn',person.linkedin.replace(/^https:\/\/(www\.)?/,''),person.linkedin,true);
    if (!person.email && !person.linkedin) {
      const note = document.createElement('p');
      note.textContent = 'Contact details will be added soon.'; contact.append(note);
    }
    button.addEventListener('click',() => {
      const open = contact.hidden;
      list.querySelectorAll('.team-person-name').forEach(other => {
        other.setAttribute('aria-expanded','false');
        other.lastElementChild.textContent = '+';
        other.nextElementSibling.hidden = true;
      });
      contact.hidden = !open;
      button.setAttribute('aria-expanded',String(open));
      icon.textContent = open ? '−' : '+';
    });
    item.append(button,contact);
    return item;
  }

  async function loadPeople() {
    const thisRequest = ++request;
    const group = activeGroup;
    list.replaceChildren(); retry.hidden = true;
    status.hidden = false; status.textContent = 'Meeting the team…';
    try {
      const rows = supabase ? checked(await supabase.from('site_content').select('id,value').like('id',`${teamPrefix}%`)) : [];
      if (thisRequest !== request || !dialog.open) return;
      const people = decodeTeamRows(rows).filter(person => person.group === group.id);
      list.replaceChildren(...people.map(renderPerson));
      status.hidden = people.length > 0;
      status.textContent = `${group.name} lineup will appear here soon.`;
    } catch {
      if (thisRequest !== request || !dialog.open) return;
      status.textContent = 'The team list couldn’t load. Please try again.';
      retry.hidden = false;
    }
  }

  document.querySelectorAll('[data-detail]').forEach(button => {
    button.setAttribute('aria-haspopup','dialog');
    button.setAttribute('aria-controls',dialog.id);
    button.addEventListener('click',() => {
      activeGroup = teamGroups.find(group => group.id === button.dataset.detail);
      if (!activeGroup || dialog.open) return;
      opener = button;
      dialog.querySelector('#detail-kicker').textContent = activeGroup.area;
      dialog.querySelector('#detail-title').textContent = activeGroup.name;
      dialog.querySelector('#detail-description').textContent = activeGroup.description;
      dialog.showModal();
      document.body.classList.add('has-dialog');
      void loadPeople();
    });
  });
  retry.addEventListener('click',loadPeople);
  dialog.querySelector('.dialog-close').addEventListener('click',() => dialog.close());
  dialog.addEventListener('click',event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener('close',() => {
    request++;
    document.body.classList.remove('has-dialog');
    opener?.focus({preventScroll:true});
  });
}
