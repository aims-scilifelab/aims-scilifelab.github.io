/**
 * AiMS — Join / Application form + automated triage.
 * Google Apps Script. Run ONCE: open https://script.google.com → New project →
 * paste this file → Run ▸ setUp (authorise when prompted). It will:
 *   1. create the application Google Form,
 *   2. create a Drive folder for the responses + uploads,
 *   3. install an on-submit trigger that runs an automatic check and emails
 *      the chosen PI (if it passes) or you (if it needs manual review),
 *   4. send the applicant a confirmation.
 *
 * ── ONE MANUAL STEP (Apps Script can't create file-upload questions) ──
 * After setUp runs, open the form it prints, and add two "File upload" questions
 * titled EXACTLY:
 *     "CV (PDF)"
 *     "Transcripts (PDF)"
 * (Forms will put the uploads in a Drive folder automatically.) The triage below
 * finds them by those titles. File-upload questions require respondents to be
 * signed in to a Google account — if many applicants won't have one, ask for a
 * shareable link instead (there is a text question for that too).
 */

// ─────────────────────────── CONFIG — EDIT THESE ───────────────────────────
const ADMIN_EMAIL = 'smith.kevin.charles@gmail.com';   // gets anything needing manual review
const PI_EMAILS = {
  'Kevin Smith (medical imaging, ML methods)'      : 'REPLACE@kth.se',
  'Jens Lagergren (probabilistic ML, comp. biology)': 'REPLACE@kth.se',
  'Gisele Miranda (cellular & spatial biology)'     : 'REPLACE@kth.se',
  'Golnaz Taheri (ML for biology, precision med.)'  : 'REPLACE@kth.se',
  'Not sure / the lab in general'                   : ADMIN_EMAIL,
};
const MIN_STATEMENT_CHARS = 200;   // research-statement length to auto-forward
const REQUIRE_CV = true;           // require a CV (upload or link) to auto-forward
const FORM_TITLE = 'AiMS — Join / Application';
// ────────────────────────────────────────────────────────────────────────────

function setUp() {
  const folder = DriveApp.createFolder('AiMS Applications ' + new Date().getFullYear());
  const form = FormApp.create(FORM_TITLE);
  form.setDescription(
    'Interested in joining AiMS (KTH · SciLifeLab)? Tell us about yourself and what you want to work on. ' +
    'We review applications and route them to the most relevant group leader.'
  ).setCollectEmail(true).setLimitOneResponsePerUser(false);

  form.addTextItem().setTitle('Full name').setRequired(true);

  form.addListItem().setTitle('Position you are interested in')
    .setChoiceValues(['PhD student', 'Postdoc', 'Researcher', "Master's thesis", 'Visiting / other'])
    .setRequired(true);

  form.addListItem().setTitle('Which group / PI?')
    .setChoiceValues(Object.keys(PI_EMAILS)).setRequired(true);

  form.addParagraphTextItem()
    .setTitle('Your research interests and ideas')
    .setHelpText('A few sentences: what you want to work on and why AiMS. (Min ~' + MIN_STATEMENT_CHARS + ' characters.)')
    .setRequired(true);

  form.addTextItem().setTitle('Link to CV or portfolio (optional if you upload below)')
    .setHelpText('A shareable link (Google Drive, Dropbox, personal site). Use this if you cannot upload.');

  // NOTE: add the two "File upload" questions by hand — see header.

  // Install the submit trigger (idempotent: clears old ones first).
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'onJoinSubmit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onJoinSubmit').forForm(form).onFormSubmit().create();

  Logger.log('Form created — EDIT it to add the two file-upload questions:');
  Logger.log('  Edit:   ' + form.getEditUrl());
  Logger.log('  Share:  ' + form.getPublishedUrl());
  Logger.log('Uploads/responses folder: ' + folder.getUrl());
}

function onJoinSubmit(e) {
  const byTitle = {};
  e.response.getItemResponses().forEach(r => { byTitle[r.getItem().getTitle()] = r.getResponse(); });
  const email = e.response.getRespondentEmail() || '(not collected)';
  const name = byTitle['Full name'] || '(no name)';
  const position = byTitle['Position you are interested in'] || '';
  const piChoice = byTitle['Which group / PI?'] || 'Not sure / the lab in general';
  const statement = byTitle['Your research interests and ideas'] || '';
  const cvLink = byTitle['Link to CV or portfolio (optional if you upload below)'] || '';

  // File-upload answers come back as arrays of Drive file IDs.
  const fileLink = (ids) => (Array.isArray(ids) ? ids : ids ? [ids] : [])
    .map(id => { try { return DriveApp.getFileById(id).getUrl(); } catch (_) { return null; } })
    .filter(Boolean);
  const cvFiles = fileLink(byTitle['CV (PDF)']);
  const transcripts = fileLink(byTitle['Transcripts (PDF)']);

  // ── Automatic check ──
  const reasons = [];
  if (REQUIRE_CV && !cvFiles.length && !cvLink) reasons.push('no CV uploaded or linked');
  if ((statement || '').length < MIN_STATEMENT_CHARS) reasons.push('research statement too short');
  if (!PI_EMAILS[piChoice]) reasons.push('no group selected');
  const passed = reasons.length === 0;

  const lines = [
    'Name: ' + name,
    'Email: ' + email,
    'Position: ' + position,
    'Group / PI: ' + piChoice,
    '',
    'Research interests / ideas:',
    statement,
    '',
    'CV: ' + (cvFiles.join('  ') || cvLink || '—'),
    'Transcripts: ' + (transcripts.join('  ') || '—'),
  ].join('\n');

  const to = passed ? PI_EMAILS[piChoice] : ADMIN_EMAIL;
  const subject = (passed ? '[AiMS application] ' : '[AiMS application — needs review] ')
    + name + ' · ' + position;
  const body = (passed
      ? 'A new application passed the automatic check and is routed to you.\n\n'
      : 'A new application needs manual review (' + reasons.join('; ') + ').\n\n')
    + lines;
  MailApp.sendEmail({ to: to, replyTo: email !== '(not collected)' ? email : ADMIN_EMAIL, subject: subject, body: body });

  // Confirmation to the applicant.
  if (email && email.indexOf('@') > 0) {
    MailApp.sendEmail({ to: email, subject: 'Thanks for your interest in AiMS',
      body: 'Hi ' + name + ',\n\nThanks for applying to AiMS. We have received your application'
        + ' and will be in touch. \n\n— AiMS (KTH · SciLifeLab)' });
  }
}
