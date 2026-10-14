// Only bundled artwork is remapped. Uploaded/external photos keep their URLs.
const groups = {
  'about-assets': ['ai_hackathon', 'banner_notext'],
  'showcase-assets': ['crew', 'rover', 'vision', 'project-atlas', 'project-iris', 'project-dexter', 'project-pulse'],
};
const images = new Map();
for (const [folder, names] of Object.entries(groups)) {
  for (const name of names) {
    const base = `/${folder}/${name}`;
    const image = { src: `${base}-1280.webp`, srcset: `${base}-640.webp 640w, ${base}-1280.webp ${folder === 'about-assets' ? 1024 : 1280}w` };
    for (const suffix of ['.jpg', '-640.webp', '-1280.webp']) images.set(base + suffix, image);
  }
}
const bundledImage = value => typeof value === 'string' ? images.get(value.startsWith('/') ? value : `/${value}`) : undefined;
export const optimizedImage = value => bundledImage(value)?.src || value;
export const imageSrcSet = value => bundledImage(value)?.srcset || '';
