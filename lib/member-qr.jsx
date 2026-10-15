import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, QrCode } from 'lucide-react';
import { formatMobile, memberQRText } from './member-contact.mjs';

export function MemberQR({profile}) {
  const text = memberQRText(profile);
  const [result,setResult] = useState(null);
  useEffect(() => {
    let active = true;
    if (text) QRCode.toDataURL(text,{errorCorrectionLevel:'M',margin:4,width:640,color:{dark:'#203b2b',light:'#ffffff'}})
      .then(url=>{if(active)setResult({text,url});})
      .catch(()=>{if(active)setResult({text,error:true});});
    return () => {active=false;};
  },[text]);
  if (profile.status !== 'approved') return null;
  const current = result?.text === text ? result : null;
  return <section className="panel member-qr" aria-label="Member QR card">
    <div className="panel-heading"><div><span className="eyebrow">CYGNUS · THE TECHNICAL CLUB</span><h2>Member QR card</h2></div><QrCode size={22}/></div>
    {!text?<p className="small-note">{!profile.member_id?'Your QR card will be available once your member ID is assigned.':'Save your mobile number in your profile to create your QR card.'}</p>:<>
      <dl className="member-card-details"><div><dt>Name</dt><dd>{profile.name}</dd></div><div><dt>Member ID</dt><dd>{profile.member_id}</dd></div><div><dt>Mobile number</dt><dd><a href={`tel:${profile.mobile_number}`}>{formatMobile(profile.mobile_number)}</a></dd></div></dl>
      {current?.url?<><img className="member-qr-image" src={current.url} alt={`QR code with member details for ${profile.name}`} width="256" height="256"/><a className="secondary wide" href={current.url} download={`${profile.member_id}-QR.png`}><Download size={15}/> Download QR code</a></>:<p role={current?.error?'alert':'status'}>{current?.error?'Could not create the QR code. Refresh this page to try again.':'Creating your QR code…'}</p>}
      <p className="small-note">Scanning shares the name, member ID, and mobile number shown above. Download a new code after changing these details. This is a contact card, not live membership verification.</p>
    </>}
  </section>;
}
