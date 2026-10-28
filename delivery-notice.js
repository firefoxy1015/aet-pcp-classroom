window.addEventListener('DOMContentLoaded', () => {
  if (window.AET_COURSE?.delivery?.ecg101TeachingIncluded) {
    const label = document.getElementById('build-label');
    if (label) label.textContent = 'ECG 101 INCLUDED';
    return;
  }
  if (window.AET_COURSE?.delivery?.excludedModule !== 'ECG 101') return;
  const label = document.getElementById('build-label');
  if (label) label.textContent = 'ECG 101 PENDING';
});
