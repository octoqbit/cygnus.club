import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMobile, formatMobile, memberQRText, memberQRPayload, parseMemberQR } from '../lib/member-contact.mjs';

test('Indian mobile numbers have one storage and display format',()=>{
  for (const input of ['9876543210','919876543210','+919876543210','+91 98765 43210',' 98765 43210 ']) {
    assert.equal(normalizeMobile(input),'+919876543210');
    assert.equal(formatMobile(input),'+91 98765 43210');
  }
  for (const input of ['',null,undefined,'123','+1 9876543210','call9876543210','98765432100','+91 98765 4321']) {
    assert.equal(normalizeMobile(input),'');
  }
});

test('QR details require approval, an assigned ID and a valid mobile number',()=>{
  const profile={name:'Sam\nMaker',member_id:'CYG-CS-001',mobile_number:'+919876543210',qr_token:'11111111-1111-4111-8111-111111111111',status:'approved'};
  assert.equal(memberQRText(profile),'CYGNUS · Member details\nName: Sam Maker\nMember ID: CYG-CS-001\nMobile: +91 98765 43210');
  for (const status of ['pending','rejected','suspended']) assert.equal(memberQRText({...profile,status}),'');
  assert.equal(memberQRText({...profile,mobile_number:null}),'');
  assert.equal(memberQRText({...profile,member_id:null}),'');
  const payload=memberQRPayload(profile);
  assert.equal(payload,'CYGNUS-MEMBER|CYG-CS-001|11111111-1111-4111-8111-111111111111');
  assert.deepEqual(parseMemberQR(payload),{memberId:'CYG-CS-001',token:'11111111-1111-4111-8111-111111111111'});
});
