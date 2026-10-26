import React, { useState } from 'react';
import { ArrowUpRight, Shirt } from 'lucide-react';
import { Notice } from './portal.jsx';

export function MemberMerchandise() {
    const [showMessage, setShowMessage] = useState(false);
    return <section className="panel" aria-labelledby="member-merchandise-title">
        <div className="panel-heading">
            <h2 id="member-merchandise-title">CYGNUS merchandise</h2>
            <Shirt size={22} aria-hidden="true" />
        </div>
        <button className="secondary wide" type="button" onClick={() => setShowMessage(true)}>
            Get merchandise <ArrowUpRight size={14} aria-hidden="true" />
        </button>
        {showMessage && <Notice>
            <strong>Something good is on the way.</strong><br />
            CYGNUS merchandise is coming soon. Stay tuned for the first drop!
        </Notice>}
    </section>;
}
