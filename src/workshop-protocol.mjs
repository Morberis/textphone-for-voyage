// Parse only the current complete, visible proposal. The narrator supplies data,
// never consent, executable code, native grants, or a replacement configuration.
export function readWorkshopProposal(storyText, sequence, revision) {
  if (typeof storyText !== 'string' || storyText.length > 100000) return null;
  if (!Number.isSafeInteger(sequence) || !Number.isSafeInteger(revision) || sequence < 1 || revision < 1) return null;
  // Normalize only observed Markdown decoration of protocol markers/labels.
  // Preserve formatting and all other content inside the field values.
  storyText = storyText
    .replace(/^([ \t]*)\*\*(TEXTPHONE DRAFT \d+\.\d+|END DRAFT)\*\*[ \t]*$/gm, '$1$2')
    .replace(/^([ \t]*)\*\*(Name|Effect|Limits|Costs|Practice|Native card)\*\*([ \t]+[-–—][ \t]*)/gm, '$1$2$3');
  const marker = 'TEXTPHONE DRAFT ' + sequence + '.' + revision;
  const starts = storyText.split(marker);
  if (starts.length !== 2) return null;
  const ends = starts[1].split('END DRAFT');
  if (ends.length !== 2 || ends[0].length > 5000) return null;
  // Native narration may split a long field across paragraphs. Labels remain
  // ordered and unique; prose outside the bounded proposal is not imported.
  const body = ends[0].trim();
  const labels = ['Name', 'Effect', 'Limits', 'Costs', 'Practice'];
  if (/(?:^|\n)\s*Native card [-–—]/.test(body)) labels.push('Native card');
  // Narration can render the requested hyphen as an en/em dash. Accept these
  // separators only at field labels; preserve the actual field text verbatim.
  const positions = labels.map(label => [...body.matchAll(new RegExp('(?:^|\\n)\\s*'+label+' [-–—][ \\t]*', 'g'))]);
  if (positions.some(matches => matches.length !== 1)) return null;
  const startsAt = positions.map(matches => matches[0].index);
  if (startsAt[0] !== 0 || startsAt.some((start,index) => index && start <= startsAt[index-1])) return null;
  const result = {};
  for (let index=0; index<labels.length; index++) {
    const match = positions[index][0];
    const value = body.slice(match.index+match[0].length, startsAt[index+1] ?? body.length).trim();
    if (!value || /TEXTPHONE DRAFT|END DRAFT|(?:^|\n)\s*(?:Name|Effect|Limits|Costs|Practice|Native card)\s*[-–—:]/.test(value)) return null;
    result[labels[index] === 'Native card' ? 'nativeCard' : labels[index].toLowerCase()] = value;
  }
  return result;
}
