const input = document.querySelector('#version-search');
const sections = [...document.querySelectorAll('.year-section')];
const empty = document.querySelector('#empty-state');

input?.addEventListener('input', () => {
  const query = input.value.trim().toLowerCase();
  let visible = 0;
  for (const section of sections) {
    let sectionVisible = 0;
    for (const card of section.querySelectorAll('.release-card')) {
      const matches = card.dataset.version.toLowerCase().includes(query);
      card.hidden = !matches;
      if (matches) sectionVisible++;
    }
    section.hidden = sectionVisible === 0;
    visible += sectionVisible;
  }
  empty.hidden = visible !== 0;
});
