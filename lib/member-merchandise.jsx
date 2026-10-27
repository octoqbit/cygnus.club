import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Shirt, IdCard, Package } from 'lucide-react';

export function MemberMerchandise() {
    const [expanded, setExpanded] = useState(false);
    return <section className="panel member-merchandise" aria-labelledby="member-merchandise-title">
        <div className="panel-heading">
            <h2 id="member-merchandise-title">CYGNUS merchandise</h2>
            <Shirt size={22} aria-hidden="true" />
        </div>
        <button className="secondary wide" type="button" aria-expanded={expanded}
            aria-controls="member-merchandise-details" onClick={() => setExpanded(open => !open)}>
            Get merchandise {expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        </button>
        <div id="member-merchandise-details" className="merchandise-details" hidden={!expanded}>
            <p className="small-note" role="status">CYGNUS merchandise is coming soon.</p>
            <div className="merchandise-item">
                <span className="merchandise-item-icon"><IdCard size={28} aria-hidden="true" /></span>
                <div className="merchandise-item-copy">
                    <h3>ID card</h3>
                    <p className="small-note">Your physical CYGNUS member card.</p>
                </div>
                <span className="merchandise-coming-soon">Coming soon</span>
            </div>
            <div className="merchandise-item">
                <span className="merchandise-item-icon"><Package size={28} aria-hidden="true" /></span>
                <div className="merchandise-item-copy">
                    <h3>More merchandise</h3>
                    <p className="small-note">The rest of the collection is on its way.</p>
                </div>
                <span className="merchandise-coming-soon">Awaiting</span>
            </div>
        </div>
    </section>;
}
