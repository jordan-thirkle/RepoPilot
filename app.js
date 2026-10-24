'use strict';

const menuButton = document.querySelector('[data-menu-toggle]');
const mobileNav = document.querySelector('#mobile-nav');

function closeMobileNav() {
  if (!menuButton || !mobileNav) return;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
  mobileNav.hidden = true;
}

if (menuButton && mobileNav) {
  menuButton.addEventListener('click', () => {
    const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
    const shouldOpen = !isExpanded;

    menuButton.setAttribute('aria-expanded', String(shouldOpen));
    menuButton.setAttribute('aria-label', shouldOpen ? 'Close navigation' : 'Open navigation');
    mobileNav.hidden = !shouldOpen;
  });

  mobileNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMobileNav);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      closeMobileNav();
      menuButton.focus();
    }
  });

  const desktopLayout = window.matchMedia('(min-width: 48.001rem)');
  desktopLayout.addEventListener('change', (event) => {
    if (event.matches) closeMobileNav();
  });
}

const feedback = document.querySelector('#copy-feedback');

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
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
  const originalLabel = button.innerHTML;

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
        button.innerHTML = originalLabel;
        button.setAttribute('aria-label', button.dataset.copyLabel || 'Copy prompt');
      }, 1800);
    } catch {
      feedback.textContent = 'Copy was blocked by this browser. Select the prompt text and copy it manually.';
    }
  });
});
