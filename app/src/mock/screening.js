// Screening tests — including the one a lot of quantified-self people buy and
// then misread: a multi-cancer early-detection (MCED) blood test.
//
// The Galleri result is "no cancer signal detected". Stored alongside it are the
// numbers that decide what that sentence is worth: overall sensitivity ~51.5%,
// stage-I sensitivity ~16.8%, specificity 99.5%. A negative moves the needle far
// less than the marketing implies, and it replaces exactly zero of the screening
// he is actually due for. Those caveats live in the record, not in an answer's
// prose, so any answer that quotes the result is forced to carry them.

export const screenings = [
  {
    id: 'scr-galleri', kind: 'mced', name: 'Grail Galleri (MCED)', date: '2025-04-28',
    result: 'No cancer signal detected', flag: 'ok',
    orderedBy: 'Self-pay via telehealth prescriber', cost: '$949',
    method: 'Targeted methylation sequencing of cell-free DNA, >100k methylation regions.',
    performance: {
      sensitivityOverall: 51.5, sensitivityStage1: 16.8, sensitivityStage2: 40.4,
      sensitivityStage3: 77.0, sensitivityStage4: 90.1, specificity: 99.5,
      ppvPathfinder: 43.1, npv: 98.6, csoAccuracy: 88.7,
    },
    caveats: [
      'A negative result is not a clean bill of health. At 16.8% stage-I sensitivity, the test misses roughly five of every six earliest-stage cancers — the ones where finding them would matter most.',
      'It detects no signal for many common cancers at any usable rate, and it is not validated as a replacement for colonoscopy, mammography, low-dose CT or cervical screening.',
      'No randomised trial has yet shown that MCED screening reduces mortality. The evidence supports "detects signal", not "saves lives".',
      'A positive would have started an imaging cascade with its own harms; the PPV in PATHFINDER was 43%, so roughly half of positives were false.',
    ],
    evidence: 'low',
  },
  {
    id: 'scr-colonoscopy', kind: 'endoscopy', name: 'Screening colonoscopy', date: '2023-09-14',
    result: 'Normal — 2 diminutive hyperplastic polyps removed', flag: 'ok',
    facility: 'Marin GI Associates', prepQuality: 'Boston score 8/9',
    cecalIntubation: true, withdrawalMin: 9.4,
    nextDue: '2033-09-14',
    note: 'Hyperplastic polyps do not shorten the interval. Ten years is the correct next date, and no blood test changes it.',
    evidence: 'high',
  },
  {
    id: 'scr-skin', kind: 'exam', name: 'Full-body dermatological exam', date: '2025-02-11',
    result: 'Benign — 2 lesions photographed for interval comparison', flag: 'ok',
    facility: 'Bay Dermatology', nextDue: '2026-02-11', evidence: 'moderate',
  },
  {
    id: 'scr-sleep-study', kind: 'device', name: 'Home sleep apnoea test (WatchPAT)', date: '2024-10-02',
    result: 'AHI 3.1/h — no obstructive sleep apnoea', flag: 'ok',
    note: 'Ordered because the ring flagged low overnight SpO₂; the flag did not reproduce on a validated device. Kept in the record precisely because it is a negative that closes a question.',
    evidence: 'high',
  },
  {
    id: 'scr-eye', kind: 'exam', name: 'Dilated eye exam + OCT', date: '2024-12-03',
    result: 'Normal optic discs, IOP 15/16 mmHg', flag: 'ok',
    facility: 'Peninsula Eye', nextDue: '2026-12-03', evidence: 'moderate',
  },
]

export const galleri = screenings[0]

// What is actually due, computed against the persona's "today". Deliberately
// small — a due-date engine is out of scope; this is the honest subset.
export const screeningDue = [
  { id: 'due-colonoscopy', name: 'Colonoscopy', due: '2033-09-14', status: 'not due', basis: 'scr-colonoscopy' },
  { id: 'due-skin', name: 'Skin exam', due: '2026-02-11', status: 'not due', basis: 'scr-skin' },
  { id: 'due-dexa', name: 'DEXA (body composition)', due: '2026-07-19', status: 'not due', basis: 'dexa-2025-07-19' },
  { id: 'due-vo2', name: 'VO₂max lab retest', due: '2026-06-14', status: 'not due', basis: 'vo2-2025-06-14' },
  { id: 'due-lipids', name: 'Lipid panel recheck (ApoB)', due: '2025-11-01', status: 'due soon', basis: 'obs-apob' },
]

export const screeningStats = {
  tests: screenings.length,
  rows: screenings.length + screeningDue.length,
  span: '2023-09-14 → 2025-04-28',
}
