import React from 'react';
import { Field } from './portal.jsx';
import { formatMobileInput, maskMobileInput, mobilePlaceholder } from './member-contact.mjs';
import './mobile-input.css';

export function MobileField({value,onChange,disabled=false,locked=false}) {
  return <Field label="Mobile number"><span className="mobile-input"><span className="mobile-prefix" aria-label="Country code +91, fixed">+91</span><input aria-label="Mobile number" name="mobile_number" type="tel" inputMode="numeric" autoComplete="tel-national" required placeholder={mobilePlaceholder} value={formatMobileInput(value)} disabled={disabled||locked} onChange={event=>onChange(maskMobileInput(event.target))}/></span>{locked&&<small className="mobile-locked-note">Locked after saving. Contact an administrator for database changes.</small>}</Field>;
}
