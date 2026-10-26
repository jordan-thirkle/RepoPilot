'use strict';

const feedback = document.querySelector('#copy-feedback');

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall back when the browser exposes but blocks Clipboard API access.
    }
  }

  const fallback = document.createElement('textarea');
  fallback.value = text;
  fallback.setAttribute('readonly', '');
  fallback.setAttribute('aria-hidden', 'true');
  fallback.style.position = 'fixed';
  fallback.style.insetInlineStart = '-9999px';
  document.body.append(fallback);
  fallback.select();

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  } finally {
    fallback.remove();
  }

  return copied;
}

document.querySelectorAll('[data-copy]').forEach((button) => {
  const originalMarkup = button.innerHTML;
  const originalAriaLabel = button.getAttribute('aria-label') || 'Copy prompt';

  button.addEventListener('click', async () => {
    const text = button.getAttribute('data-copy');
    if (!text || !feedback) return;

    try {
      const copied = await copyText(text);
      if (!copied) throw new Error('Clipboard unavailable');

      feedback.textContent = 'Prompt copied. Paste it into ChatGPT.';
      button.innerHTML = 'Copied <span aria-hidden="true">✓</span>';
      button.setAttribute('aria-label', 'Prompt copied');
      window.setTimeout(() => {
        button.innerHTML = originalMarkup;
        button.setAttribute('aria-label', originalAriaLabel);
      }, 1800);
    } catch {
      feedback.textContent = 'Copy was blocked by this browser. Select the prompt text and copy it manually.';
    }
  });
});
