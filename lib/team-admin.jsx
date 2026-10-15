import React, { useEffect, useState } from 'react';
import { Plus, ArrowLeft, Check, Users } from 'lucide-react';
import { supabase, checked } from './supabase.js';
import { Field, Notice } from './portal.jsx';
import { teamGroups, teamPrefix, decodeTeamRows, teamEmail, teamLinkedIn } from './team-data.mjs';

export function TeamAdmin({onDirty}) {
  const [people,setPeople] = useState([]), [draft,setDraft] = useState(null);
  const [loading,setLoading] = useState(true), [busy,setBusy] = useState(false), [dirty,setDirty] = useState(false);
  const [error,setError] = useState(''), [message,setMessage] = useState('');
  const [groupFilter,setGroupFilter] = useState('all'), [query,setQuery] = useState('');
  useEffect(() => { onDirty(dirty); },[dirty,onDirty]);
  useEffect(() => () => onDirty(false),[onDirty]);
  useEffect(() => {
    const guard = event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    addEventListener('beforeunload',guard);
    return () => removeEventListener('beforeunload',guard);
  },[dirty]);
  async function reload() {
    setLoading(true); setError('');
    try { setPeople(decodeTeamRows(checked(await supabase.from('site_content').select('id,value').like('id',`${teamPrefix}%`)))); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void reload(); },[]);
  function edit(person) { setDraft({...person}); setDirty(false); setError(''); setMessage(''); }
  function change(key,value) { setDraft(current => ({...current,[key]:value})); setDirty(true); }
  function back() {
    if (dirty && !confirm('Discard unsaved changes to this person?')) return;
    setDraft(null); setDirty(false); setError('');
  }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const name = draft.name.trim();
      if (!name || name.length > 120) throw new Error('Enter a name of up to 120 characters.');
      if (!teamGroups.some(group => group.id === draft.group)) throw new Error('Choose a team category.');
      const sort_order = Number(draft.sort_order);
      if (String(draft.sort_order).trim() === '' || !Number.isSafeInteger(sort_order) || sort_order < 0) throw new Error('Display order must be a whole number starting at 0.');
      const email = teamEmail(draft.email), linkedin = teamLinkedIn(draft.linkedin);
      if (draft.email.trim() && !email) throw new Error('Enter a valid email address.');
      if (draft.linkedin.trim() && !linkedin) throw new Error('Enter a LinkedIn profile link, such as linkedin.com/in/your-name.');
      const row = {id:draft.id || `${teamPrefix}${crypto.randomUUID()}`,value:JSON.stringify({name,group:draft.group,sort_order,email,linkedin}),updated_at:new Date().toISOString()};
      const saved = checked(await supabase.from('site_content').upsert([row]).select('id'));
      if (!saved?.length) throw new Error('The person could not be saved. Refresh and try again.');
      setGroupFilter(draft.group); setQuery(''); setDraft(null); setDirty(false); await reload(); setMessage(`${name} is now listed on the Team page.`);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!confirm(`Remove ${draft.name} from the public Team page?`)) return;
    setBusy(true); setError('');
    try {
      const removed = checked(await supabase.from('site_content').delete().eq('id',draft.id).select('id'));
      if (!removed?.length) throw new Error('The person could not be removed. Refresh and try again.');
      setDraft(null); setDirty(false); await reload(); setMessage('Person removed from the Team page.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  if (draft) return <div className="editor">
    <button className="text-button" onClick={back} disabled={busy}><ArrowLeft size={15}/> Back to team</button>
    <div className="page-heading"><div><h1>{draft.id?'Edit person':'Add a person'}</h1><p>Introduce the people behind the club.</p></div></div>
    <Notice error>{error}</Notice>
    <form onSubmit={save}>
      <fieldset disabled={busy} style={{border:0,padding:0,margin:0,minWidth:0}}>
        <section className="panel">
          <Field label="Full name" required maxLength={120} value={draft.name} onChange={event=>change('name',event.target.value)}/>
          <Field label="Team category"><select aria-label="Team category" value={draft.group} onChange={event=>change('group',event.target.value)}>{teamGroups.map(group=><option key={group.id} value={group.id}>{group.name} · {group.area}</option>)}</select></Field>
          <Field label="Display order" type="number" min="0" step="1" max={Number.MAX_SAFE_INTEGER} required value={draft.sort_order} onChange={event=>change('sort_order',event.target.value)} aria-describedby="team-order-help"/>
          <p className="small-note" id="team-order-help">Position within this team category: 0 first, then 1, 2, 3, and so on. People with the same number appear alphabetically.</p>
          <Field label="Public email (optional)" type="email" maxLength={254} value={draft.email} onChange={event=>change('email',event.target.value)} placeholder="name@example.com"/>
          <Field label="LinkedIn profile URL (optional)" type="text" inputMode="url" autoCapitalize="none" spellCheck={false} maxLength={500} value={draft.linkedin} onChange={event=>change('linkedin',event.target.value)} placeholder="linkedin.com/in/your-name"/>
          {teamLinkedIn(draft.linkedin)&&<p className="small-note"><a href={teamLinkedIn(draft.linkedin)} target="_blank" rel="noopener noreferrer">Open LinkedIn profile ↗</a></p>}
          <p className="small-note">These details appear publicly on the Team page. Add the contact information this person wants to share. You can leave either contact field blank and add it later.</p>
        </section>
      </fieldset>
      <div className="editor-actions"><button className="secondary" type="button" disabled={busy} onClick={back}>Cancel</button><div className="button-row">{draft.id&&<button className="danger" type="button" disabled={busy} onClick={remove}>Remove person</button>}<button className="primary" disabled={busy}><Check size={15}/>{busy?'Saving…':draft.id?'Save person':'Publish person'}</button></div></div>
    </form>
  </div>;
  const visiblePeople = people.filter(person => (groupFilter==='all'||person.group===groupFilter) && `${person.name} ${person.email}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <>
    <div className="page-heading"><div><h1>Team</h1><p>Organize people by team / department and choose their display order.</p></div><button className="primary" disabled={loading||!!error} onClick={()=>edit({name:'',group:groupFilter==='all'?'hardware':groupFilter,sort_order:0,email:'',linkedin:''})}><Plus size={15}/> Add person</button></div>
    <Notice error>{error}</Notice><Notice>{message}</Notice>
    <button className="text-button" onClick={reload} disabled={loading}>Refresh team</button>
    <div className="toolbar">
      <input aria-label="Search team" placeholder="Search name or public email…" value={query} onChange={event=>setQuery(event.target.value)}/>
      <select aria-label="Filter team by department" value={groupFilter} onChange={event=>setGroupFilter(event.target.value)}><option value="all">All departments</option>{teamGroups.map(group=><option key={group.id} value={group.id}>{group.area}</option>)}</select>
    </div>
    {loading?<p className="loading">Loading the team…</p>:visiblePeople.length?teamGroups.filter(group=>visiblePeople.some(person=>person.group===group.id)).map(group=><section className="panel table-wrap" key={group.id} aria-label={group.name}>
      <div className="panel-heading"><div><h2>{group.name}</h2><p>{group.area} · {visiblePeople.filter(person=>person.group===group.id).length} people</p></div></div>
      <table><thead><tr><th>Order</th><th>Name</th><th>Public contact</th><th>Action</th></tr></thead><tbody>{visiblePeople.filter(person=>person.group===group.id).map(person=><tr key={person.id}><td>{person.sort_order}</td><td><strong>{person.name}</strong></td><td><small>{person.email||'No email added'}</small><small>{person.linkedin?'LinkedIn added':'No LinkedIn added'}</small></td><td><button className="secondary" onClick={()=>edit(person)}>Edit</button></td></tr>)}</tbody></table>
    </section>):<div className="panel empty"><Users size={28}/>{error?'The team list is unavailable.':people.length?'No people match this search or department.':'No people added yet. Add a person to introduce your team.'}</div>}
  </>;
}
