// Fixed display order for teachers across the admin UI, set once by the
// admin (gabrielcalmet2@gmail.com) rather than sorted by amount or
// alphabetically — so the list reads the same way every time, regardless
// of which month or figures are being shown. A teacher not on this list
// (a brand-new hire, or a name typo'd here) sorts after everyone who is,
// in whatever order the query itself already provides — never dropped,
// just unordered among themselves until someone adds them here.
const TEACHER_DISPLAY_ORDER = [
  "Teacher Samuel",
  "Gabriela Teacher",
  "Angie Teacher",
  "Laura Teacher",
  "Patricia Teacher",
  "Flavia Teacher",
  "Eliza Teacher",
  "Juliana Teacher",
  "David Alesson",
  "Amanda Teacher",
  "Joe Teacher",
  "Gabes Teacher",
];

export function teacherOrderIndex(teacherName: string): number {
  const i = TEACHER_DISPLAY_ORDER.indexOf(teacherName);
  return i === -1 ? TEACHER_DISPLAY_ORDER.length : i;
}
