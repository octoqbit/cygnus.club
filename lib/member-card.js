import { formatMobile } from './member-contact.mjs';

export const memberCardRole = role => role === 'core_member' ? 'CORE MEMBER' : role === 'admin' ? 'CLUB ADMIN' : 'CLUB MEMBER';
const assets = new Map();
function loadImage(url) {
    if (!assets.has(url)) assets.set(url, new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => { assets.delete(url); reject(new Error('Could not load card artwork.')); };
        image.src = url;
    }));
    return assets.get(url);
}

function nameLines(context, name, size) {
    context.font = `700 ${size}px Arial, sans-serif`;
    const lines = [''];
    for (const character of name) {
        const last = lines.length - 1;
        if (context.measureText(lines[last] + character).width > 540) lines.push(character);
        else lines[last] += character;
    }
    return lines;
}

export async function renderMemberCard(qrUrl, profile) {
    const [art, logo, qr] = await Promise.all([
        loadImage('/brand/member-card-front.svg'), loadImage('/brand/cygnus-dark-web.webp'),
        new Promise((resolve, reject) => {
            const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = qrUrl;
        }),
    ]);
    const canvas = document.createElement('canvas');
    canvas.width = 1000; canvas.height = 1560;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Card rendering is unavailable.');
    context.drawImage(art, 0, 0, 1000, 1560);
    context.save();
    context.globalCompositeOperation = 'screen';
    context.drawImage(logo, 75, 307, 620, 140, 130, 350, 740, 167);
    context.restore();

    const [rolePrefix, roleSuffix] = memberCardRole(profile.role).split(' ');
    context.font = '900 74px Arial, sans-serif';
    context.fillStyle = '#f00815';
    context.fillText(rolePrefix, 105, 755);
    const prefixWidth = context.measureText(rolePrefix).width;
    context.fillStyle = '#f7f8f4';
    context.fillText(roleSuffix, 130 + prefixWidth, 755);

    function label(text, y) {
        context.fillStyle = '#686d6d';
        context.font = '700 24px Arial, sans-serif';
        context.letterSpacing = '4px';
        context.fillText(text, 105, y);
        context.letterSpacing = '0px';
    }
    label('NAME', 925);
    const name = (profile.name || 'CYGNUS member').replace(/\s+/g, ' ').trim();
    let size = 42;
    let lines = nameLines(context, name, size);
    while (lines.length > 2 && size > 18) lines = nameLines(context, name, --size);
    context.fillStyle = '#171c1f';
    lines.forEach((line, index) => context.fillText(line.trim(), 105, 975 + index * (size + 5)));
    context.strokeStyle = '#d0d2cc'; context.lineWidth = 2;
    context.beginPath(); context.moveTo(105, 1045); context.lineTo(620, 1045); context.stroke();

    label('MEMBER ID', 1100);
    context.fillStyle = '#171c1f';
    context.font = '700 34px Arial, sans-serif';
    context.fillText(profile.member_id, 105, 1155, 500);
    context.beginPath(); context.moveTo(105, 1190); context.lineTo(600, 1190); context.stroke();
    label('CONTACT', 1250);
    context.fillStyle = '#171c1f';
    context.font = '700 34px Arial, sans-serif';
    context.fillText(formatMobile(profile.mobile_number), 105, 1305, 495);

    // Keep a white quiet zone and sharp modules for reliable scanning in both themes.
    context.fillStyle = '#fff'; context.fillRect(633, 1173, 284, 284);
    context.imageSmoothingEnabled = false;
    context.drawImage(qr, 633, 1173, 284, 284);
    context.strokeStyle = '#ef1420'; context.lineWidth = 5;
    for (const [x, y, dx, dy] of [[623,1163,1,1],[927,1163,-1,1],[623,1467,1,-1],[927,1467,-1,-1]]) {
        context.beginPath(); context.moveTo(x, y + dy * 28); context.lineTo(x, y); context.lineTo(x + dx * 28, y); context.stroke();
    }
    return canvas.toDataURL('image/png');
}
