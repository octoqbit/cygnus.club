import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, QrCode } from 'lucide-react';
import { formatMobile, memberQRPayload, memberQRText } from './member-contact.mjs';

async function downloadableCard(qrUrl, profile) {
  const image = new Image();
  await new Promise((resolve,reject) => {
    image.onload=resolve;
    image.onerror=reject;
    image.src=qrUrl;
  });
  const canvas=document.createElement('canvas');
  canvas.width=760;
  canvas.height=860;
  const context=canvas.getContext('2d');
  context.fillStyle='#ffffff';
  context.fillRect(0,0,canvas.width,canvas.height);
  context.drawImage(image,60,40,640,640);
  context.fillStyle='#203b2b';
  context.font='600 24px Arial, sans-serif';
  context.fillText('CYGNUS · THE TECHNICAL CLUB',50,730);
  context.font='20px Arial, sans-serif';
  context.fillText(`Name: ${profile.name}`,50,765);
  context.fillText(`Member ID: ${profile.member_id}`,50,800);
  context.fillText(`Mobile: ${formatMobile(profile.mobile_number)}`,50,835);
  return canvas.toDataURL('image/png');
}

export function MemberQR({profile}) {
  const text = memberQRPayload(profile);
  const [result,setResult] = useState(null);
  useEffect(() => {
    let active = true;
    if (text) QRCode.toDataURL(text,{errorCorrectionLevel:'M',margin:4,width:640,color:{dark:'#203b2b',light:'#ffffff'}})
      .then(async url=>({text,url,downloadUrl:await downloadableCard(url,profile)}))
      .then(card=>{if(active)setResult(card);})
      .catch(()=>{if(active)setResult({text,error:true});});
    return () => {active=false;};
  },[text]);
  if (profile.status !== 'approved') return null;
  const current = result?.text === text ? result : null;
  return <section className="panel member-qr" aria-label="Member QR card">
    <div className="panel-heading"><div><span className="eyebrow">CYGNUS · THE TECHNICAL CLUB</span><h2>Member QR card</h2></div><QrCode size={22}/></div>
    {!text?<p className="small-note">{!profile.member_id?'Your QR card will be available once your member ID is assigned.':'Save your mobile number in your profile to create your QR card.'}</p>:<>
      <dl className="member-card-details"><div><dt>Name</dt><dd>{profile.name}</dd></div><div><dt>Member ID</dt><dd>{profile.member_id}</dd></div><div><dt>Mobile number</dt><dd><a href={`tel:${profile.mobile_number}`}>{formatMobile(profile.mobile_number)}</a></dd></div></dl>
      {current?.url?<><img className="member-qr-image" src={current.url} alt={`QR code with member details for ${profile.name}`} width="256" height="256"/><a className="secondary wide" href={current.downloadUrl||current.url} download={`${profile.member_id}-QR.png`}><Download size={15}/> Download QR code</a></>:<p role={current?.error?'alert':'status'}>{current?.error?'Could not create the QR code. Refresh this page to try again.':'Creating your QR code…'}</p>}
      <p className="small-note">This QR contains a database-issued authenticity token. Core members and administrators can scan it to verify the current membership details.</p>
    </>}
  </section>;
}
