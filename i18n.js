(async function () {
    let wordsFromAdmin = true;
    let categoriesFromAdmin = true;

    const [translations, gameWords, categories] = await Promise.all([
        fetch('./locales/en.json').then(r => r.json()),
        fetch('/api/words').then(r => {
            if (r.ok) return r.json();
            wordsFromAdmin = false;
            return fetch('./data/words.json').then(r => r.json());
        }),
        fetch('/api/categories').then(r => {
            if (r.ok) return r.json();
            categoriesFromAdmin = false;
            return fetch('./data/categories.json').then(r => r.json());
        })
    ]);

    function t(key, vars = {}) {
        const value = key.split('.').reduce((obj, k) => obj?.[k], translations);
        if (!value) return key;
        return value.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
    }

    window.t = t;
    window.gameWords = gameWords;
    window.categories = categories;
    window.usingDefaultContent = !wordsFromAdmin && !categoriesFromAdmin;

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
