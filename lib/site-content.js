import { supabase, checked } from './supabase.js';
import slots from '../content-slots.json';
import { imageURL, setContentImage } from './content.js';
import { brandCopy } from './brand-copy.mjs';
export async function loadSiteValues(){
  if(!supabase)return {};
  const rows=checked(await supabase.from('site_content').select('id,value'));
  return Object.fromEntries(rows.map(r=>[r.id,slots.find(slot=>slot.id===r.id)?.type==='image'?r.value:brandCopy(r.value)]));
}
export async function applySiteContent(){
  try{
    const values=await loadSiteValues();
    for(const slot of slots){
      if(!(slot.id in values)||!slot.selector)continue;
      const element=document.querySelector(slot.selector);if(!element)continue;
      if(slot.type==='image'){const url=imageURL(values[slot.id]);if(url)setContentImage(element,values[slot.id]);}
      else{
        const text=[...element.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE)[slot.part];
        if(text)text.nodeValue=text.nodeValue.match(/^\s*/)[0]+values[slot.id].trim()+text.nodeValue.match(/\s*$/)[0];
        if(element.hasAttribute('data-original'))element.dataset.original=element.textContent.trim();
      }
    }
  }catch(error){console.error('Website text could not be loaded:',error.message);}
}
