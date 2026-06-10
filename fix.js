
const fs = require('fs');

const fixes = [
  {
    file: 'components/notes/NotesScreen.tsx',
    replacements: [
      { line: 331, color: 'visibility === o.value ? HP_TOKENS.blue : HP_TOKENS.ink' },
      { line: 368, color: 'sharedPermission === o.value ? HP_TOKENS.blue : HP_TOKENS.ink' }
    ]
  },
  {
    file: 'components/modals/ManagePrioritiesModal.tsx',
    replacements: [
      { line: 525, color: 'selectedKpiId === \'\' ? HP_TOKENS.blue : HP_TOKENS.ink' },
      { line: 550, color: 'isSelected ? HP_TOKENS.blue : HP_TOKENS.ink' },
      { line: 587, color: 'isSelected ? HP_TOKENS.blue : HP_TOKENS.ink' }
    ]
  },
  {
    file: 'components/modals/ManageKPIModal.tsx',
    replacements: [
      { line: 140, color: 'month === (i + 1) ? HP_TOKENS.blue : HP_TOKENS.ink' },
      { line: 170, color: 'year === y ? HP_TOKENS.blue : HP_TOKENS.ink' },
      { line: 313, color: 'assignTo === \'\' ? HP_TOKENS.blue : HP_TOKENS.ink' },
      { line: 326, color: 'assignTo === m.id ? HP_TOKENS.blue : HP_TOKENS.ink' }
    ]
  },
  {
    file: 'components/modals/GoalModal.tsx',
    replacements: [
      { line: 397, color: 'parentId === \'\' ? HP_TOKENS.blue : HP_TOKENS.ink' },
      { line: 414, color: 'parentId === p.id ? HP_TOKENS.blue : HP_TOKENS.ink' },
      { line: 435, color: 'parentId === p.id ? HP_TOKENS.blue : HP_TOKENS.ink' },
      { line: 456, color: 'parentId === p.id ? HP_TOKENS.blue : HP_TOKENS.ink' }
    ]
  },
  {
    file: 'components/home/CalendarScreen.tsx',
    replacements: [
      { line: 515, color: 'recurrence === o.value ? HP_TOKENS.blue : HP_TOKENS.ink' },
      { line: 548, color: 'offset === Number(o.value) ? HP_TOKENS.blue : HP_TOKENS.ink' },
      { line: 592, color: 'visibility === o.value ? HP_TOKENS.blue : HP_TOKENS.ink' }
    ]
  }
];

fixes.forEach(fix => {
  if (fs.existsSync(fix.file)) {
    let lines = fs.readFileSync(fix.file, 'utf8').split('\n');
    fix.replacements.forEach(rep => {
      // line is 1-indexed
      let lineIdx = rep.line - 1;
      lines[lineIdx] = lines[lineIdx].replace('color: ,', 'color: ' + rep.color + ',');
    });
    fs.writeFileSync(fix.file, lines.join('\n'));
    console.log('Fixed ' + fix.file);
  }
});

