import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Download, QrCode } from 'lucide-react';
import { formatMobile, memberQRPayload } from './member-contact.mjs';
import { memberCardRole, renderMemberCard } from './member-card.js';
import './member-qr.css';

export function MemberQR({profile}) {
  const text = memberQRPayload(profile);
  const cardProfile = useMemo(() => ({name:profile.name, member_id:profile.member_id, mobile_number:profile.mobile_number, role:profile.role}),
    [profile.name, profile.member_id, profile.mobile_number, profile.role]);
  const key = JSON.stringify([text, cardProfile]);
  const [result,setResult] = useState(null);
  useEffect(() => {
    let active = true;
    if (text) QRCode.toDataURL(text,{errorCorrectionLevel:'H',margin:4,width:490,color:{dark:'#000000',light:'#ffffff'}})
      .then(url => renderMemberCard(url, cardProfile))
      .then(url => { if(active) setResult({key,url}); })
      .catch(() => { if(active) setResult({key,error:true}); });
    return () => {active=false;};
  },[text,cardProfile,key]);
  if (profile.status !== 'approved') return null;
  const current = result?.key === key ? result : null;
  return <section className="panel member-qr" aria-label="Member QR card">
    <div className="panel-heading"><div><span className="eyebrow">YOUR CYGNUS IDENTITY</span><h2>Member QR card</h2></div><QrCode size={22} aria-hidden="true"/></div>
    {!text?<p className="small-note">{!profile.member_id?'Your QR card will be available once your member ID is assigned.':'Save your mobile number in your profile to create your QR card.'}</p>:<>
      {current?.url?<>
        <img className="member-qr-image member-id-front" src={current.url}
          alt={`QR code with member details for ${profile.name}. ${memberCardRole(profile.role)}. Member ID: ${profile.member_id}. Contact: ${formatMobile(profile.mobile_number)}.`}
          width="760" height="1080"/>
        <a className="secondary wide" href={current.url} download={`${profile.member_id}-card.png`}><Download size={15}/> Download member card</a>
      </>:<p role={current?.error?'alert':'status'}>{current?.error?'Could not create the member card. Refresh this page to try again.':'Creating your member card…'}</p>}
      <p className="small-note">Show this card at club events. Core members and administrators can scan the QR to verify your current membership.</p>
    </>}
  </section>;
}
