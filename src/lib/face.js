// ===========================================================================
// Cartoon face generator for the People page gaze tiles — built in layers:
//   1. HEAD silhouette (the foundation shape)
//   2. FACE features placed on head landmarks (eyes, nose, mouth, brows) —
//      their GEOMETRY varies per person; that is what makes people individual.
//   3. HAIR / BEARD / GLASSES fitted to the head + features (clipped to head)
//   4. BODY — one shared torso for everyone + a neck that transitions into it
// Driven by a per-person `face` config (see src/content/config.ts). People with
// no config fall back to seedToConfig(name) so they still look varied.
// viewBox 100x120.  Authored + tuned with the `people-cartoon-face` skill.
// ===========================================================================

// ---- 1. HEAD -------------------------------------------------------------
const HEADS = {
  oval:   'M50 17 C 33 17 27 33 27 50 C 27 67 36 85 50 85 C 64 85 73 67 73 50 C 73 33 67 17 50 17 Z',
  round:  'M50 19 C 31 19 25 36 25 52 C 25 67 35 80 50 86 C 65 80 75 67 75 52 C 75 36 69 19 50 19 Z',
  long:   'M50 14 C 35 14 29 31 29 48 C 29 65 34 80 50 93 C 66 80 71 65 71 48 C 71 31 65 14 50 14 Z',
  square: 'M50 17 C 32 17 28 32 28 51 C 28 66 34 79 50 86 C 66 79 72 66 72 51 C 72 32 68 17 50 17 Z',
  wide:   'M50 19 C 29 19 23 36 23 51 C 23 67 35 80 50 85 C 65 80 77 67 77 51 C 77 36 71 19 50 19 Z',
};
const EAR_X = { oval: 27, round: 25, long: 29, square: 28, wide: 23 };

// ---- 2. FACE LANDMARKS ---------------------------------------------------
const EYE_Y = 54, EYE_DX = 10, NOSE_TOP = 56, NOSE_BOT = 65, MOUTH_Y = 74, BROW_Y = 39;

// ---- 3a. HAIR ------------------------------------------------------------
// [foreheadY, sideY]: hairline recedes high across the forehead but the hair
// comes DOWN the sides toward the ears. Clipped to the head so edges = head.
const HAIRLINE = { shaved:[26,40], buzz:[25,47], short:[36,51], receding:[23,45],
                   medium:[36,53], long:[36,53], bun:[36,50],
                   afro:[36,55], coily:[37,54], curly:[37,53], wavy:[36,53] };
function hairBand(style, hc, line) {
  const [fc, sd] = line || HAIRLINE[style] || HAIRLINE.short;
  return `<path d="M0 0 H100 V${sd} C 79 ${sd} 73 ${sd-3} 69 ${sd-9} C 63 ${fc+5} 57 ${fc} 50 ${fc} C 43 ${fc} 37 ${fc+5} 31 ${sd-9} C 27 ${sd-3} 21 ${sd} 0 ${sd} Z" fill="${hc}"/>`;
}
const puff = (arr, hc) => arr.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${hc}"/>`).join('');
function hairBack(style, hc) {
  switch (style) {
    case 'medium': return `<path d="M16 98 C 8 36 28 13 50 13 C 72 13 92 36 84 98 L 68 98 C 70 56 64 50 50 50 C 36 50 30 56 32 98 Z" fill="${hc}"/>`;
    case 'long':   return `<path d="M13 118 C 5 36 27 12 50 12 C 73 12 95 36 87 118 L 68 118 C 72 56 64 50 50 50 C 36 50 28 56 32 118 Z" fill="${hc}"/>`;
    case 'bun':    return `<circle cx="50" cy="15" r="7.5" fill="${hc}"/>`;
    case 'wavy':   return `<path d="M14 100 C 4 34 26 12 50 12 C 74 12 96 34 86 100 L 68 100 C 72 56 64 50 50 50 C 36 50 28 56 32 100 Z" fill="${hc}"/>`
                          + puff([[30,22,12],[50,15,13],[70,22,12],[20,38,11],[80,38,11],[18,56,10],[82,56,10]], hc);
    case 'afro':   return puff([[50,18,19],[28,27,14],[72,27,14],[20,44,12],[80,44,12],[24,58,10],[76,58,10],[50,9,14]], hc);
    case 'coily':  return puff([[50,21,14],[32,27,11],[68,27,11],[26,41,9],[74,41,9],[29,54,8],[71,54,8]], hc);
    case 'curly':  return puff([[50,19,12],[34,23,9],[66,23,9],[27,36,8],[73,36,8],[29,49,7],[71,49,7]], hc);
    default:       return '';
  }
}

// ---- 3b. BEARD -----------------------------------------------------------
const BEARDLINE = { full:[59,66], shortBeard:[73,66], stubble:[76,69] };
function beardBand(style, bc, line) {
  const mustache = `<path d="M39 69 q11 5 22 0 q-3.5 4.5 -11 4.5 q-7.5 0 -11 -4.5z" fill="${bc}"/>`;
  if (style === 'none') return {};
  if (style === 'mustache') return { front: mustache };
  if (style === 'goatee')
    return { front: `${mustache}<path d="M43 77 q7 9 14 0 q-1.5 8 -7 9 q-5.5 -1 -7 -9z" fill="${bc}"/>` };
  const [s, c] = line || BEARDLINE[style] || BEARDLINE.shortBeard;
  return { clip: `<path d="M0 120 H100 V${s} C 70 ${s} 60 ${c} 50 ${c} C 40 ${c} 30 ${s} 0 ${s} Z" fill="${bc}"/>` };
}

// ---- 3c. GLASSES ---------------------------------------------------------
function glassesSVG(style) {
  switch (style) {
    case 'none': return '';
    case 'round': return `<g stroke="#20232b" stroke-width="1.4" fill="none" opacity=".88"><circle cx="40" cy="54" r="7.3"/><circle cx="60" cy="54" r="7.3"/><path d="M47.3 53 h5.4"/><path d="M32.7 52 l-5 -1.5"/><path d="M67.3 52 l5 -1.5"/></g>`;
    case 'thick': return `<g stroke="#20232b" stroke-width="2.3" fill="none" opacity=".9"><rect x="31.5" y="48" width="16" height="11" rx="3"/><rect x="52.5" y="48" width="16" height="11" rx="3"/><path d="M47.5 53 h5"/></g>`;
    case 'bold': return `<g stroke="#17191f" stroke-width="3" fill="none"><rect x="29" y="46" width="19" height="14" rx="2.5"/><rect x="52" y="46" width="19" height="14" rx="2.5"/><path d="M48 52.5 h4"/><path d="M29 50 l-5 -1.5"/><path d="M71 50 l5 -1.5"/></g>`;
    case 'rect':
    default: return `<g stroke="#20232b" stroke-width="1.4" fill="none" opacity=".85"><rect x="32.5" y="49" width="15" height="10" rx="4"/><rect x="52.5" y="49" width="15" height="10" rx="4"/><path d="M47.5 53 h5"/></g>`;
  }
}

function mouthSVG(expr, surprised, lip) {
  if (surprised) return `<ellipse cx="50" cy="75" rx="3.7" ry="4.9" fill="#3a2632"/>`;
  switch (expr) {
    case 'neutral': return `<path d="M43 ${MOUTH_Y+1} h14" stroke="${lip}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    case 'slight':  return `<path d="M44 ${MOUTH_Y} q6 3 13 0" stroke="${lip}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    case 'grin':    return `<path d="M41 ${MOUTH_Y-1} q9 7 18 0 q-9 3 -18 0z" fill="#fff" stroke="${lip}" stroke-width="1.6" stroke-linejoin="round"/>`;
    case 'smile':
    default:        return `<path d="M43.5 ${MOUTH_Y} q6.5 4.5 13 0" stroke="${lip}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }
}

// Skin opening behind the mouth when a beard is present: hugs the mouth tightly
// (thin even margin) and matches the expression, so the mouth reads as a mouth
// in the beard rather than a pale patch. Scaled horizontally with the mouth.
function mouthMask(expr, surprised, skin) {
  if (surprised) return `<ellipse cx="50" cy="75" rx="5" ry="6" fill="${skin}"/>`;
  switch (expr) {
    case 'neutral': return `<ellipse cx="50" cy="${MOUTH_Y+0.6}" rx="8.0" ry="2.3" fill="${skin}"/>`;
    case 'slight':  return `<ellipse cx="50" cy="${MOUTH_Y+0.8}" rx="8.2" ry="2.7" fill="${skin}"/>`;
    case 'grin':    return `<ellipse cx="50" cy="${MOUTH_Y+1.8}" rx="9.8" ry="4.2" fill="${skin}"/>`;
    case 'smile':
    default:        return `<ellipse cx="50" cy="${MOUTH_Y+1}" rx="8.4" ry="3.0" fill="${skin}"/>`;
  }
}

// ---- 4. BODY -------------------------------------------------------------
const TORSO = 'M10 120 C 11 99 27 92 41 92 C 44 97 56 97 59 92 C 73 92 89 99 90 120 Z';
const NECK  = 'M44 79 C 44 89 44 93 46 95 C 48 96 52 96 54 95 C 56 93 56 89 56 79 Z';

const darken = (hex, f) => {
  const n = parseInt(String(hex).slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

let _cid = 0;
export function faceSVG2(cfg, dx, dy, surprised, blink) {
  cfg = cfg || {};
  // Per-person hover mood: `hoverMood: "mad"` replaces the surprised look with
  // an angry one (V brows, squint, frown, red flush and an anger mark).
  const hovering = !!surprised;
  const mad = hovering && cfg.hoverMood === 'mad';
  if (mad) surprised = false;
  // `hoverMood: "sleepy"`: eyes shut, head droops and tilts, small "o" mouth, Zzz.
  const sleepy = hovering && cfg.hoverMood === 'sleepy';
  if (sleepy) { surprised = false; blink = true; dx = 0; dy = 0; }
  // `hoverMood: "music"`: headphones on, eyes happily shut, head tilted, notes.
  const music = hovering && cfg.hoverMood === 'music';
  if (music) { surprised = false; blink = false; dx = 0; dy = 0; }
  // `hoverMood: "thinking"`: eyes up to the side, one brow raised, "hmm" mouth,
  // math symbols floating around the head.
  const thinking = hovering && cfg.hoverMood === 'thinking';
  if (thinking) { surprised = false; blink = false; dx = 0; dy = 0; }
  const skin  = cfg.skin || '#e3b79a';
  const hairC = (cfg.hair && cfg.hair.color) || '#2b2b33';
  const hairS = (cfg.hair && cfg.hair.style) || 'short';
  const beardC= (cfg.beard && cfg.beard.color) || hairC;
  const beardS= (cfg.beard && cfg.beard.style) || 'none';
  const browC = cfg.brows || hairC;
  const eyeC  = cfg.eyes  || '#5b4636';
  const shirt = cfg.shirt || '#2a2c3a';
  const glass = cfg.glasses || 'none';
  const expr  = cfg.expression || 'smile';
  const shape = HEADS[cfg.face] ? cfg.face : 'oval';
  const lip = darken(skin, 0.62);
  const noseInk = darken(skin, 0.8);
  const isHijab = hairS === 'hijab';
  const cid = 'hc' + (++_cid);

  const head = HEADS[shape];
  const earX = EAR_X[shape];
  // When mad, the ears get the same red flush as the face.
  const earPair = (fill, extra = '') => `<ellipse cx="${earX}" cy="58" rx="3.2" ry="5" fill="${fill}"${extra}/><ellipse cx="${100-earX}" cy="58" rx="3.2" ry="5" fill="${fill}"${extra}/>`;
  const ears = isHijab ? '' : earPair(skin) + (mad ? earPair('#e0302a', ' opacity=".16"') : '');
  const hijab = isHijab
    ? `<path fill-rule="evenodd" d="M50 11 C 89 11 95 72 83 118 L 17 118 C 5 72 11 11 50 11 Z M50 31 C 32 31 28 47 28 63 C 28 80 37 89 50 89 C 63 89 72 80 72 63 C 72 47 68 31 50 31 Z" fill="${hairC}"/>
       <path d="M50 31 C 42 31 35 32 30 34 C 33 30 41 29 50 29 C 59 29 67 30 70 34 C 65 32 58 31 50 31 Z" fill="${darken(hairC, 0.85)}"/>`
    : '';

  // FEATURE GEOMETRY — the per-person individuating levers.
  const eScale = ({ sm:0.82, md:1, lg:1.22, xl:1.44 }[cfg.eyeSize]) || 1;
  const eGap   = ({ close:8.2, mid:10, wide:11.8 }[cfg.eyeSpacing]) || EYE_DX;
  const eRatio = ({ round:1, almond:0.8, narrow:0.62, wide:1.14, hooded:0.74 }[cfg.eyeShape]) || 1;
  const hooded = cfg.eyeShape === 'hooded';
  const bW     = ({ thin:1.2, med:1.6, thick:2.5, xthick:3.3 }[cfg.browWeight]) || 1.6;
  const bShape = cfg.browShape || 'soft';
  const nSz    = ({ sm:0.78, md:1, lg:1.3, xl:1.62 }[cfg.noseSize]) || 1;
  const nWd    = ({ narrow:0.66, med:1, wide:1.45, xwide:1.85 }[cfg.noseWidth]) || 1;
  const mW     = ({ narrow:0.82, med:1, wide:1.28, xl:1.5 }[cfg.mouthWidth]) || 1;

  const px = thinking ? 2.4 : dx * 3.2, py = thinking ? -2.2 : dy * 2.9;
  const eyeRx = (surprised ? 7.0 : 5.9) * eScale, eyeRy = (surprised ? 6.6 : 4.3) * eScale * eRatio * (mad ? 0.72 : 1);
  const pupR = (surprised ? 2.4 : 2.5) * Math.min(eScale, 1.1), irisR = pupR + 1.5;
  const eyeL = 50 - eGap, eyeR = 50 + eGap;
  const browCurveBase = ({ straight:-0.6, soft:-2.4, arched:-4.6, angled:-2.4 }[bShape]) ?? -2.4;
  const browY = BROW_Y + dy * 1.5 - (surprised ? 5 : 0) + (mad ? 2 : 0);
  const browCurve = (surprised ? browCurveBase - 2.6 : browCurveBase);
  const lidInk = darken(skin, 0.68);
  const eyes = music
    ? `<path d="M${eyeL-6} ${EYE_Y+1.5} q6 -4.4 12 0" stroke="#20232b" stroke-width="1.8" fill="none" stroke-linecap="round"/>
       <path d="M${eyeR-6} ${EYE_Y+1.5} q6 -4.4 12 0" stroke="#20232b" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
    : blink
    ? `<path d="M${eyeL-6} ${EYE_Y} q6 3.4 12 0" stroke="#20232b" stroke-width="1.8" fill="none" stroke-linecap="round"/>
       <path d="M${eyeR-6} ${EYE_Y} q6 3.4 12 0" stroke="#20232b" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="${eyeL}" cy="${EYE_Y}" rx="${eyeRx.toFixed(2)}" ry="${eyeRy.toFixed(2)}" fill="#fff"/>
       <ellipse cx="${eyeR}" cy="${EYE_Y}" rx="${eyeRx.toFixed(2)}" ry="${eyeRy.toFixed(2)}" fill="#fff"/>
       <circle cx="${eyeL+px}" cy="${EYE_Y+py}" r="${irisR.toFixed(2)}" fill="${eyeC}"/>
       <circle cx="${eyeR+px}" cy="${EYE_Y+py}" r="${irisR.toFixed(2)}" fill="${eyeC}"/>
       <circle cx="${eyeL+px}" cy="${EYE_Y+py}" r="${pupR.toFixed(2)}" fill="#20232b"/>
       <circle cx="${eyeR+px}" cy="${EYE_Y+py}" r="${pupR.toFixed(2)}" fill="#20232b"/>
       ${hooded ? `<path d="M${(eyeL-eyeRx).toFixed(1)} ${(EYE_Y-eyeRy*0.5).toFixed(1)} q${eyeRx.toFixed(1)} ${(-eyeRy).toFixed(1)} ${(eyeRx*2).toFixed(1)} 0" stroke="${lidInk}" stroke-width="1" fill="none" opacity=".6"/><path d="M${(eyeR-eyeRx).toFixed(1)} ${(EYE_Y-eyeRy*0.5).toFixed(1)} q${eyeRx.toFixed(1)} ${(-eyeRy).toFixed(1)} ${(eyeRx*2).toFixed(1)} 0" stroke="${lidInk}" stroke-width="1" fill="none" opacity=".6"/>` : ''}`;
  const brows = mad
    ? `<path d="M${eyeL-6} ${browY-2} L${eyeL+6} ${browY+3}" stroke="${browC}" stroke-width="${bW+0.8}" fill="none" stroke-linecap="round"/>
       <path d="M${eyeR-6} ${browY+3} L${eyeR+6} ${browY-2}" stroke="${browC}" stroke-width="${bW+0.8}" fill="none" stroke-linecap="round"/>`
    : bShape === 'angled'
    ? `<path d="M${eyeL-6} ${browY+1.2} L${eyeL+1} ${browY-2.2} L${eyeL+6} ${browY}" stroke="${browC}" stroke-width="${bW}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
       <path d="M${eyeR-6} ${browY} L${eyeR-1} ${browY-2.2} L${eyeR+6} ${browY+1.2}" stroke="${browC}" stroke-width="${bW}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<path d="M${eyeL-6} ${browY} q6 ${browCurve} 12 0" stroke="${browC}" stroke-width="${bW}" fill="none" stroke-linecap="round"/>
       <path d="M${eyeR-6} ${browY} q6 ${browCurve} 12 0" stroke="${browC}" stroke-width="${bW}" fill="none" stroke-linecap="round"/>`;
  const thinkBrows = `<path d="M${eyeL-6} ${browY+1.2} q6 -0.4 12 -1.2" stroke="${browC}" stroke-width="${bW}" fill="none" stroke-linecap="round"/>
       <path d="M${eyeR-6} ${browY-2.5} q6 ${browCurve-1.8} 12 0" stroke="${browC}" stroke-width="${bW}" fill="none" stroke-linecap="round"/>`;
  const nLen = (NOSE_BOT - NOSE_TOP) * nSz, nTip = 2.5 * nWd;
  const nose = `<path d="M50 ${NOSE_TOP} l${(-nTip).toFixed(1)} ${nLen.toFixed(1)} q${nTip.toFixed(1)} 2 ${(nTip*2).toFixed(1)} 0" stroke="${noseInk}" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".55"/>`;
  const beard = beardBand(beardS, beardC, cfg.beard && cfg.beard.line);
  const beardClip  = beard.clip  ? `<g clip-path="url(#${cid})">${beard.clip}</g>` : '';
  const beardFront = beard.front || '';
  const hasBeard = !!beard.clip;
  const mouth = `<g transform="translate(50 0) scale(${mW} 1) translate(-50 0)">${hasBeard ? mouthMask((mad || thinking) ? 'neutral' : expr, surprised, skin) : ''}${mad ? `<path d="M43.5 ${MOUTH_Y+2} q6.5 -4 13 0" stroke="${lip}" stroke-width="2" fill="none" stroke-linecap="round"/>`
    : thinking ? `<path d="M46 ${MOUTH_Y+1.4} q4 -0.6 8.5 -2.4" stroke="${lip}" stroke-width="2" fill="none" stroke-linecap="round"/>`
    : sleepy ? `<ellipse cx="50" cy="${MOUTH_Y+1}" rx="1.9" ry="2.3" fill="#3a2632"/>`
    : mouthSVG(expr, surprised, lip)}</g>`;
  const flush = mad ? `<path d="${head}" fill="#e0302a" opacity=".16"/>` : '';
  const angerMark = mad ? `<g transform="translate(66 30)" stroke="#e23b3b" stroke-width="1.6" fill="none" stroke-linecap="round">
       <path d="M-4 -1.2 q2.8 0 2.8 -2.8"/><path d="M1.2 -4 q0 2.8 2.8 2.8"/><path d="M4 1.2 q-2.8 0 -2.8 2.8"/><path d="M-1.2 4 q0 -2.8 -2.8 -2.8"/></g>` : '';
  // The mouth opening in the beard is drawn with the mouth itself (mouthMask).
  const mouthHole = '';
  const hairMain   = (hairS === 'bald' || isHijab) ? '' : `<g clip-path="url(#${cid})">${hairBand(hairS, hairC, cfg.hair && cfg.hair.line)}</g>`;

  // Gag modes: `tall` crops the frame to just the chin (head up & off-frame, a
  // big torso fills it); `short` sits the figure low so the top of the head AND
  // the eyes peek over the bottom edge. Both drop back to normal on hover.
  const tall = !!cfg.tall && !hovering, short = !!cfg.short && !hovering;
  const headYOff = tall ? 52 : (short ? -44 : 0);
  const bodyTall = tall
    ? `<path d="M16 120 C 19 74 31 37 50 37 C 69 37 81 74 84 120 Z" fill="${shirt}"/>
       <path d="M44 21 C 44 28 44 34 46 37 C 48 38 52 38 54 37 C 56 34 56 28 56 21 Z" fill="${skin}"/>`
    : '';
  const hx = dx * 2.4, hy = dy * 2.2 - (surprised ? 1.6 : 0) + (sleepy ? 2.5 : 0) - headYOff, rot = dx * 3.0 + (sleepy ? 9 : 0) + (music ? -7 : 0) + (thinking ? 4 : 0);
  // Music notes (drawn as shapes, not font glyphs) floating beside the head.
  const note = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})"><ellipse cx="0" cy="0" rx="2.6" ry="1.9" transform="rotate(-22)"/><rect x="1.7" y="-11" width="1.1" height="11"/><path d="M2.3 -11 q4.6 1.8 3.4 6.4 q-0.6 -3.2 -3.4 -3.6z"/></g>`;
  const mathSyms = thinking ? `<g fill="#cfd6e6" font-family="'Times New Roman', Times, serif" font-style="italic">
      <text x="5" y="33" font-size="11">∑</text><text x="7" y="56" font-size="10">π</text>
      <text x="80" y="30" font-size="9.5">x²</text><text x="84" y="55" font-size="12">∫</text>
      <text x="64" y="20" font-size="10" font-style="normal" font-family="Helvetica, Arial, sans-serif" font-weight="700">?</text></g>` : '';
  const notes = music ? `<g fill="#cfd6e6">${note(13, 44, 1.05)}${note(20, 29, 0.85)}${note(86, 36, 0.95)}</g>` : '';
  const zzz = sleepy ? `<g fill="#cfd6e6" font-family="Helvetica, Arial, sans-serif" font-weight="700">
      <text x="70" y="42" font-size="7">z</text><text x="77" y="33" font-size="9.5">Z</text><text x="85" y="23" font-size="12">Z</text></g>` : '';
  const collar = (tall || short || cfg.collar === false) ? '' : `
    <path d="M42 90 L50 101 L58 90 Z" fill="${darken(shirt, 0.55)}"/>
    <path d="M35 89 L51 97 L51 92 L44 89 Z" fill="${shirt}" stroke="${darken(shirt, 0.8)}" stroke-width="0.8" stroke-linejoin="round"/>
    <path d="M65 89 L49 97 L49 92 L56 89 Z" fill="${shirt}" stroke="${darken(shirt, 0.8)}" stroke-width="0.8" stroke-linejoin="round"/>`;

  const neckBits = (tall || short) ? '' : `<path d="${NECK}" fill="${skin}"/>
      <path d="M44 88 Q50 92 56 88" stroke="#00000016" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  const headInner = `${neckBits}
      ${hairBack(hairS, hairC)}
      ${ears}
      <path d="${head}" fill="${skin}"/>
      ${flush}
      ${beardClip}
      ${beardFront}
      ${mouthHole}
      ${hairMain}
      ${hijab}
      ${eyes}
      ${thinking ? thinkBrows : brows}
      ${nose}
      ${(cfg.canadian || cfg.noMouth) ? '' : mouth}
      ${glassesSVG(glass)}
      ${angerMark}
      ${music ? `<path d="M${earX-0.5} 55 C ${earX-3} 4 ${103-earX} 4 ${100.5-earX} 55" stroke="#2a2d36" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <rect x="${earX-5.5}" y="49" width="8" height="16" rx="3.5" fill="#d9475a"/><rect x="${earX-4}" y="52" width="2.4" height="10" rx="1.2" fill="#2a2d36"/>
      <rect x="${97.5-earX}" y="49" width="8" height="16" rx="3.5" fill="#d9475a"/><rect x="${101.6-earX}" y="52" width="2.4" height="10" rx="1.2" fill="#2a2d36"/>` : ''}`;

  // Canadian mode (South Park): the head is cut in half. Eyes/nose on the top
  // flap, mouth/chin on the bottom. A thin dark seam shows the cut at rest, and
  // the People-page CSS flaps the top open on hover (`.ca-top` / `.ca-bot`).
  if (cfg.canadian) {
    const SP = 70; // split line a little above the mouth, closer to the nose
    const topC = 'ct' + cid, botC = 'cb' + cid, gapC = 'cg' + cid;
    return `<svg viewBox="0 0 100 120" preserveAspectRatio="xMidYMid slice">
    <defs>
      <clipPath id="${cid}"><path d="${head}"/></clipPath>
      <clipPath id="${topC}"><rect x="-10" y="-10" width="120" height="${SP + 10}"/></clipPath>
      <clipPath id="${botC}"><rect x="-10" y="${SP}" width="120" height="${130 - SP}"/></clipPath>
      <clipPath id="${gapC}"><path d="${head}"/></clipPath>
    </defs>
    <rect width="100" height="120" fill="#12131a"/>
    ${tall ? bodyTall : (short ? '' : `<path d="${TORSO}" fill="${shirt}"/>`)}
    ${collar}
    <g clip-path="url(#${gapC})"><rect class="ca-gap" x="0" y="${SP - 11}" width="100" height="26" fill="#12131a"/></g>
    <g class="ca-bot" clip-path="url(#${botC})">${headInner}</g>
    <g class="ca-top" clip-path="url(#${topC})">${headInner}
      <rect class="ca-cut" x="0" y="${SP - 1.9}" width="100" height="1.9" fill="#0a0a0d" clip-path="url(#${cid})"/></g>
  </svg>`;
  }

  return `<svg viewBox="0 0 100 120" preserveAspectRatio="xMidYMid slice">
    <defs><clipPath id="${cid}"><path d="${head}"/></clipPath></defs>
    <rect width="100" height="120" fill="#12131a"/>
    ${tall ? bodyTall : (short ? '' : `<path d="${TORSO}" fill="${shirt}"/>`)}
    ${collar}
    <g transform="translate(${hx} ${hy}) rotate(${rot} 50 60)">
      ${headInner}
    </g>${zzz}${notes}${mathSyms}</svg>`;
}

// ---- Seed fallback -------------------------------------------------------
// People with no `face:` config still get a varied (not identical) face,
// deterministic from their name. Uses neutral styles only — a placeholder
// until a real photo-built config is added. NOT meant to be a likeness.
export function seedToConfig(seed) {
  let s = (seed >>> 0) || 1;
  const nx = () => { s = (s * 1664525 + 1013904223) >>> 0; return s; };
  const pick = (a) => a[nx() % a.length];
  return {
    skin: pick(['#f0d4b4','#ecc8a6','#e3b488','#d9a878','#c89a6e','#b98a5f','#a8754e','#8d5f42','#6e4a33','#5a3c2a']),
    face: pick(['oval','round','long','square','wide']),
    hair: { style: pick(['short','buzz','medium','receding','curly','wavy']), color: pick(['#2b2b33','#1c1c22','#3a2a1e','#4a3327','#6b4a2f','#8a7a60','#9a9088','#b0a89c','#2a3340']) },
    eyes: pick(['#5b4636','#3a2a1f','#6d8192','#4a5a44','#2a2018']),
    glasses: nx() % 4 === 0 ? 'rect' : 'none',
    shirt: pick(['#415a66','#4a5565','#5a6a7a','#6a5a7a','#52664f','#6a5a46','#4a4f58','#7a5a6a','#466a5a']),
    eyeSize: pick(['sm','md','md','lg']),
    eyeShape: pick(['round','round','almond','narrow']),
    browWeight: pick(['thin','med','med','thick']),
    browShape: pick(['soft','soft','straight','arched']),
    noseSize: pick(['sm','md','md','lg']),
    noseWidth: pick(['narrow','med','med','wide']),
    mouthWidth: pick(['med','med','wide']),
  };
}
