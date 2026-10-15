import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, Upload, ShieldCheck } from 'lucide-react';
import { parseMemberQR, formatMobile } from './member-contact.mjs';
import { checked, supabase } from './supabase.js';
import './member-scanner.css';

export function MemberScanner() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream,setStream] = useState(null);
  const [result,setResult] = useState(null);
  const [error,setError] = useState('');
  useEffect(() => () => stream?.getTracks().forEach(track=>track.stop()), [stream]);
  async function verify(value) {
    const parsed=parseMemberQR(value);
    if (!parsed) { setResult(null); setError('This is not a CYGNUS member QR code.'); return; }
    try {
      setError('');
      const rows=checked(await supabase.rpc('verify_member_qr',{target_member_id:parsed.memberId,target_token:parsed.token}));
      const member=Array.isArray(rows)?rows[0]:rows;
      if (!member) throw new Error('This QR code is not authentic or the membership is no longer approved.');
      setResult(member);
    } catch (e) { setResult(null); setError(e.message.includes('approved')||e.message.includes('authentic') ? 'Not approved or QR code is not authentic.' : e.message); }
  }
  async function startCamera() {
    try {
      setError('');
      const next=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});
      setStream(next);
      const scan=()=> {
        const video=videoRef.current, canvas=canvasRef.current;
        if (!video||!canvas||!next.active) return;
        if (video.readyState>=2) {
          canvas.width=video.videoWidth; canvas.height=video.videoHeight;
          const code=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height);
          const decoded=jsQR(code.data,code.width,code.height);
          if (decoded) { next.getTracks().forEach(track=>track.stop()); setStream(null); verify(decoded.data); return; }
        }
        requestAnimationFrame(scan);
      };
      video.srcObject=next; await video.play(); requestAnimationFrame(scan);
    } catch (e) { setError(e.name==='NotAllowedError'?'Camera permission was denied. Use Upload QR image instead.':e.message); }
  }
  function upload(event) {
    const file=event.target.files?.[0]; if (!file) return;
    const image=new Image();
    image.onload=()=>{const canvas=canvasRef.current;canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);const code=context.getImageData(0,0,canvas.width,canvas.height);const decoded=jsQR(code.data,code.width,code.height);if(decoded)verify(decoded.data);else setError('No QR code was found in that image.');URL.revokeObjectURL(image.src);};
    image.src=URL.createObjectURL(file);
  }
  return <section className="panel member-scanner" aria-label="Verify a CYGNUS member QR code">
    <div className="panel-heading"><div><span className="eyebrow">ADMIN / CORE MEMBER ACCESS</span><h2>Verify member QR</h2></div><ShieldCheck size={22}/></div>
    <p className="small-note">Administrators and approved core members can verify QR codes. Administrators do not need core-member status. Verification checks the live database record, not just the printed QR text.</p>
    <video ref={videoRef} className={stream?'scanner-video':'scanner-video hidden'} muted playsInline aria-label="QR scanner camera"/>
    <canvas ref={canvasRef} className="scanner-canvas" aria-hidden="true"/>
    <div className="button-row"><button className="primary" onClick={startCamera} disabled={Boolean(stream)}><Camera size={15}/> {stream?'Scanning…':'Open camera'}</button><label className="secondary"><Upload size={15}/> Upload QR image<input type="file" accept="image/*" onChange={upload}/></label></div>
    {error&&<p className="notice error" role="alert">{error}</p>}
    {result&&<div className="scanner-result"><strong><ShieldCheck size={16}/> Authentic approved member</strong><dl><div><dt>Name</dt><dd>{result.name}</dd></div><div><dt>Member ID</dt><dd>{result.member_id}</dd></div><div><dt>Department</dt><dd>{result.department||'Not provided'}</dd></div><div><dt>Mobile</dt><dd>{formatMobile(result.mobile_number)||'Not provided'}</dd></div></dl></div>}
  </section>;
}
