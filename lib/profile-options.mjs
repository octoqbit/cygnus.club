export const techEmojis = [
  ['robot', '🤖', 'Robot'],
  ['rocket', '🚀', 'Rocket'],
  ['satellite', '🛰️', 'Satellite'],
  ['gear', '⚙️', 'Gear'],
  ['brain', '🧠', 'Brain'],
  ['battery', '🔋', 'Battery'],
  ['microscope', '🔬', 'Microscope'],
  ['bulb', '💡', 'Light bulb'],
];
export const pronounOptions = [['he/him', 'He/Him'], ['she/her', 'She/Her']];
export const profilePronouns = profile => profile.pronouns || ({boy:'he/him', girl:'she/her'}[profile.avatar] ?? '');
export const memberEmoji = value => techEmojis.some(([id]) => id === value) ? value : 'robot';

// Use the same profile picture in the account page and public header.
export function profileAvatar({ avatar = 'robot', role = 'member', pronouns } = {}) {
  if (role === 'admin') {
    const isSheHer = pronouns === 'she/her' || (!pronouns && avatar === 'girl');
    return { emoji: isSheHer ? '👩‍💻' : '👨‍💻', label: 'Administrator technologist' };
  }
  const [, emoji, label] = techEmojis.find(([id]) => id === memberEmoji(avatar));
  return { emoji, label };
}
