import { formatMobile } from './member-contact.mjs';

export const memberCardRole = role => role === 'core_member' ? 'CORE MEMBER' : role === 'admin' ? 'CLUB ADMIN' : 'CLUB MEMBER';

const headingFont = '"CYGNUS Card Heading", sans-serif';
const detailFont = '"CYGNUS Card Mono", monospace';
let cardFonts;
function loadCardFonts() {
    if (!cardFonts) {
        cardFonts = Promise.all([
            new FontFace('CYGNUS Card Heading', 'url(/fonts/quantico-bold.ttf)', { weight: '700' }).load(),
            new FontFace('CYGNUS Card Mono', 'url(/fonts/space-mono-bold.ttf)', { weight: '700' }).load(),
        ]).then(fonts => fonts.forEach(font => document.fonts.add(font))).catch(error => {
            cardFonts = null;
            throw error;
        });
    }
    return cardFonts;
}

function nameLines(context, name, size) {
    context.font = `700 ${size}px ${headingFont}`;
    const lines = [''];
    for (const word of name.split(' ')) {
        const last = lines.length - 1;
        const candidate = lines[last] ? `${lines[last]} ${word}` : word;
        if (context.measureText(candidate).width <= 660) lines[last] = candidate;
        else {
            if (lines[last]) lines.push('');
            // Also wrap long names without spaces so they stay within the card.
            for (const character of word) {
                const current = lines.length - 1;
                if (context.measureText(lines[current] + character).width > 660) lines.push(character);
                else lines[current] += character;
            }
        }
    }
    return lines;
}

export async function renderMemberCard(qrUrl, profile) {
    const qr = new Image();
    const logo = new Image();
    await Promise.all([
        loadCardFonts(),
        new Promise((resolve, reject) => {
            logo.onload = resolve;
            logo.onerror = () => reject(new Error('Could not load the CYGNUS logo.'));
            logo.src = '/brand/cygnus-symbol-web.png';
        }),
        new Promise((resolve, reject) => {
            qr.onload = resolve;
            qr.onerror = () => reject(new Error('Could not load the member QR code.'));
            qr.src = qrUrl;
        }),
    ]);
    const canvas = document.createElement('canvas');
    canvas.width = 760; canvas.height = 1080;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Card rendering is unavailable.');

    // Homepage paper, orange, grid and sticker-like shapes stay outside the QR.
    const paper = '#edece8', ink = '#191c1d', orange = '#ff6a13';
    context.fillStyle = paper;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#7c87871a';
    context.lineWidth = 1;
    context.beginPath();
    for (let x = 16; x < 760; x += 40) { context.moveTo(x, 16); context.lineTo(x, 1064); }
    for (let y = 16; y < 1080; y += 40) { context.moveTo(16, y); context.lineTo(744, y); }
    context.stroke();
    context.strokeStyle = '#adb1ae';
    context.strokeRect(16, 16, 728, 1048);

    function line(x1, y1, x2, y2, color = ink, width = 2) {
        context.strokeStyle = color; context.lineWidth = width;
        context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke();
    }
    function star(x, y, radius) {
        context.save(); context.translate(x, y); context.rotate(-0.15);
        context.fillStyle = orange; context.strokeStyle = ink; context.lineWidth = 2;
        context.beginPath();
        for (let i = 0; i < 24; i++) {
            const angle = i * Math.PI / 12, r = i % 2 ? radius * 0.54 : radius;
            const px = Math.cos(angle) * r, py = Math.sin(angle) * r;
            if (i === 0) context.moveTo(px, py); else context.lineTo(px, py);
        }
        context.closePath(); context.fill(); context.stroke(); context.restore();
    }
    context.fillStyle = ink;
    context.font = `700 70px ${headingFont}`;
    context.fillText('CYGNUS', 50, 106);
    line(50, 127, 337, 127, orange, 6);

    // The role badge and wordmark share a baseline and generous outer margins.
    context.fillRect(434, 61, 280, 50);
    context.fillStyle = orange;
    context.fillRect(430, 57, 280, 50);
    context.strokeStyle = ink; context.lineWidth = 2;
    context.strokeRect(430, 57, 280, 50);
    context.fillStyle = ink;
    context.font = `700 26px ${headingFont}`;
    context.textAlign = 'center';
    context.fillText(memberCardRole(profile.role), 570, 91);
    context.textAlign = 'left';

    star(674, 184, 46);
    context.save(); context.translate(68, 660); context.rotate(-Math.PI / 2);
    context.fillStyle = ink; context.font = `700 20px ${detailFont}`;
    context.fillText('IDEAS INTO REALITY', 0, 0);
    context.restore();
    // A small orbit and ascending blocks echo the homepage's playful geometry.
    context.strokeStyle = ink; context.lineWidth = 2;
    context.beginPath(); context.ellipse(65, 249, 27, 40, -0.5, 0, Math.PI * 2); context.stroke();
    context.fillStyle = orange;
    context.beginPath(); context.arc(80, 222, 9, 0, Math.PI * 2); context.fill();
    for (let i = 0; i < 5; i++) {
        context.fillStyle = i % 2 ? ink : orange;
        context.fillRect(671, 558 + i * 25, 18, 18);
    }
    line(666, 338, 699, 305, ink, 4);
    line(679, 305, 699, 305, ink, 4);
    line(699, 305, 699, 325, ink, 4);

    // A smaller QR retains its four-module quiet zone without any canvas resizing.
    context.fillStyle = ink;
    context.fillRect(125, 190, 522, 522);
    context.fillStyle = '#ffffff';
    context.fillRect(119, 184, 522, 522);
    context.strokeStyle = ink; context.lineWidth = 2;
    context.strokeRect(119, 184, 522, 522);
    context.imageSmoothingEnabled = false;
    context.drawImage(qr, 135, 200);

    // High error correction supports a small central logo, clear of finder patterns.
    // Only a 7 × 5 module patch is covered on the standard member QR.
    context.fillStyle = '#ffffff';
    context.fillRect(345, 420, 70, 50);
    context.imageSmoothingEnabled = true;
    context.drawImage(logo, 349, 429, 62, 31);

    // Calm, aligned detail rows balance the more playful scan area above.
    context.fillStyle = paper;
    context.fillRect(36, 730, 688, 276);
    function label(text, y) {
        context.fillStyle = '#626963';
        context.font = `700 21px ${detailFont}`;
        context.letterSpacing = '2px';
        context.fillText(text, 50, y);
        context.letterSpacing = '0px';
    }
    const name = (profile.name || 'CYGNUS member').replace(/\s+/g, ' ').trim();
    let size = 52;
    let lines = nameLines(context, name, size);
    while (lines.length > 2 && size > 14) lines = nameLines(context, name, --size);
    context.save();
    context.fillStyle = ink;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const nameTop = 790 - (lines.length - 1) * (size + 6) / 2;
    lines.forEach((line, index) => context.fillText(line, 380, nameTop + index * (size + 6)));
    context.restore();

    context.strokeStyle = '#adb1ae';
    context.beginPath(); context.moveTo(50, 853); context.lineTo(710, 853); context.stroke();
    label('MEMBER ID', 888);
    context.fillStyle = ink;
    context.font = `700 34px ${detailFont}`;
    context.fillText(profile.member_id, 50, 929, 660);
    label('MOBILE', 971);
    context.fillStyle = ink;
    context.font = `700 34px ${detailFont}`;
    context.fillText(formatMobile(profile.mobile_number), 50, 1012, 660);
    context.fillStyle = orange;
    context.fillRect(16, 1032, 728, 32);
    context.fillStyle = ink; context.font = `700 17px ${detailFont}`;
    context.textAlign = 'center';
    context.fillText('STAY CURIOUS. KEEP BUILDING.', 380, 1055);
    return canvas.toDataURL('image/png');
}
