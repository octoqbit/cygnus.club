import React, { useEffect, useState } from 'react';
import { Plus, ArrowLeft, Check, Image as ImageIcon } from 'lucide-react';
import { supabase, checked, uploadImage } from './supabase.js';
import { imageURL } from './content.js';
import { Field, Notice } from './portal.jsx';

const categories = ['Workshops','Build sessions','Campus events','Team moments'];
const blankMemory = () => ({title:'',caption:'',image:'',image_alt:'',taken_on:'',category:'Team moments',sort_order:0,published:false});

export function MemoriesAdmin({onDirty}) {
  const [items,setItems] = useState([]), [draft,setDraft] = useState(null);
  const [loading,setLoading] = useState(true), [busy,setBusy] = useState(false);
  const [error,setError] = useState(''), [message,setMessage] = useState(''), [dirty,setDirty] = useState(false);
  useEffect(() => { onDirty(dirty); },[dirty,onDirty]);
  useEffect(() => () => onDirty(false),[onDirty]);
  useEffect(() => {
    const guard = event => { if(dirty) {event.preventDefault();event.returnValue='';} };
    addEventListener('beforeunload',guard); return () => removeEventListener('beforeunload',guard);
  },[dirty]);
  async function reload() {
    setLoading(true); setError('');
    try { setItems(checked(await supabase.from('memories').select('*').order('sort_order').order('taken_on',{ascending:false,nullsFirst:false}).order('id'))); }
    catch(e) { setError(e.code === 'PGRST205' || e.code === '42P01' ? 'Apply the club memories SQL migration to enable this album, then refresh.' : e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void reload(); },[]);
  function edit(item) { setDraft({...item,taken_on:item.taken_on||''}); setDirty(false); setMessage('');setError(''); }
  function change(key,value) { setDraft(current=>({...current,[key]:value})); setDirty(true); }
  function back() { if(dirty&&!confirm('Discard unsaved changes to this memory?'))return; setDraft(null);setDirty(false);setError(''); }
  async function save(event) {
    event.preventDefault(); setBusy(true);setError('');
    try {
      if(!imageURL(draft.image))throw new Error('Upload a photo or use an HTTPS image URL.');
      if(!Number.isSafeInteger(Number(draft.sort_order)))throw new Error('Display order must be a whole number.');
      const row = {title:draft.title.trim(),caption:draft.caption.trim(),image:draft.image.trim(),image_alt:draft.image_alt.trim(),taken_on:draft.taken_on||null,category:draft.category,sort_order:Number(draft.sort_order),published:draft.published};
      if(!row.title||!row.image_alt)throw new Error('Add a title and an image description.');
      const response = draft.id ? await supabase.from('memories').update(row).eq('id',draft.id).select('id').single() : await supabase.from('memories').insert(row).select('id').single();
      checked(response); setDirty(false);setDraft(null);setMessage(row.published?'Memory published to Life at CYGNUS.':'Memory saved as a draft.'); await reload();
    } catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  async function upload(event) {
    const file=event.target.files?.[0];if(!file)return;
    setBusy(true);setError('');setDirty(true);
    try { change('image',await uploadImage(file)); }
    catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  async function remove() {
    if(!confirm(`Delete “${draft.title}” from the album?`))return;
    setBusy(true);setError('');
    try { checked(await supabase.from('memories').delete().eq('id',draft.id).select('id').single());setDirty(false);setDraft(null);setMessage('Memory removed from the album.');await reload(); }
    catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  if(draft)return <div className="editor">
    <button className="text-button" onClick={back} disabled={busy}><ArrowLeft size={15}/> Back to memories</button>
    <div className="page-heading"><div><h1>{draft.id?'Edit memory':'New memory'}</h1><p>A photo, a few words, a moment worth keeping.</p></div><span className={`badge ${draft.published?'':'draft'}`}>{draft.published?'Published':'Draft'}</span></div>
    <Notice error>{error}</Notice>
    <form onSubmit={save}>
      <fieldset disabled={busy} style={{border:0,padding:0,margin:0,minWidth:0}}>
        <section className="panel"><h2>The photograph</h2>
          <Field label="Upload a photo · maximum 5 MB" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={upload}/>
          <Field label="Photo URL" value={draft.image} required onChange={e=>change('image',e.target.value)} placeholder="https://…"/>
          {imageURL(draft.image)&&<img className="image-preview" src={imageURL(draft.image)} alt="Memory preview"/>}
          <Field label="Image description (accessibility)" value={draft.image_alt} required maxLength={500} onChange={e=>change('image_alt',e.target.value)} placeholder="Describe the people, activity, and setting."/>
          <p className="small-note">Use club photos you have permission to share. Uploaded files use the existing public image library; draft album entries stay hidden.</p>
        </section>
        <section className="panel"><h2>The story</h2>
          <Field label="Memory title" value={draft.title} required maxLength={120} onChange={e=>change('title',e.target.value)}/>
          <Field label="Caption" area value={draft.caption} maxLength={1000} onChange={e=>change('caption',e.target.value)}/>
          <div className="form-grid"><Field label="Date taken (optional)" type="date" value={draft.taken_on} onChange={e=>change('taken_on',e.target.value)}/>
          <Field label="Category"><select aria-label="Category" value={draft.category} onChange={e=>change('category',e.target.value)}>{categories.map(category=><option key={category}>{category}</option>)}</select></Field></div>
          <Field label="Display order" type="number" step="1" min="-2147483648" max="2147483647" required value={draft.sort_order} onChange={e=>change('sort_order',e.target.value)}/>
          <p className="small-note">Lower numbers appear first. The first published photo is the featured image.</p>
          <label className="check"><input type="checkbox" checked={draft.published} onChange={e=>change('published',e.target.checked)}/> Publish on homepage</label>
        </section>
      </fieldset>
      <div className="editor-actions"><button className="secondary" type="button" disabled={busy} onClick={back}>Cancel</button><div className="button-row">{draft.id&&<button type="button" className="danger" disabled={busy} onClick={remove}>Delete memory</button>}<button className="primary" disabled={busy}><Check size={15}/>{busy?'Saving…':'Save memory'}</button></div></div>
    </form>
  </div>;
  return <>
    <div className="page-heading"><div><h1>Memories</h1><p>The photos and stories in Life at CYGNUS.</p></div><button className="primary" disabled={loading||!!error} onClick={()=>edit(blankMemory())}><Plus size={15}/> Add memory</button></div>
    <Notice error>{error}</Notice><Notice>{message}</Notice>
    <button className="text-button" disabled={loading} onClick={reload}>Refresh album</button>
    {loading?<p className="loading">Opening the album…</p>:<div className="panel table-wrap">
      {items.length?<table><thead><tr><th>Moment</th><th>Category / date</th><th>Visibility</th><th>Order</th><th>Actions</th></tr></thead><tbody>{items.map(item=><tr key={item.id}><td><strong>{item.title}</strong><small>{item.caption}</small></td><td>{item.category}<small>{item.taken_on||'No date'}</small></td><td><span className={`badge ${item.published?'':'draft'}`}>{item.published?'Published':'Draft'}</span></td><td>{item.sort_order}</td><td><button className="secondary" onClick={()=>edit(item)}>Edit</button></td></tr>)}</tbody></table>:<div className="empty"><ImageIcon size={28}/>{error?'The album is unavailable.':'Your first memory starts with a photo. Add one and publish it to the homepage.'}</div>}
    </div>}
  </>;
}
