(async function () {
    const res = await fetch('./locales/en.json');
    const translations = await res.json();

    function t(key, vars = {}) {
        const value = key.split('.').reduce((obj, k) => obj?.[k], translations);
        if (!value) return key;
        return value.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
    }

    window.t = t;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    });

    document.title = t('page.title');
    document.querySelector('meta[name="description"]').content = t('page.description');

    document.dispatchEvent(new Event('i18n:ready'));
})();
