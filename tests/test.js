const results = document.getElementById('results');
let passed = 0;
let failed = 0;

export function describe(name, fn) {
    const h2 = document.createElement('h2');
    h2.textContent = name;
    results.appendChild(h2);
    fn();
}

export function test(name, fn) {
    const div = document.createElement('div');
    try {
        fn();
        div.className = 'pass';
        div.textContent = `  PASS: ${name}`;
        passed++;
    } catch (e) {
        div.className = 'fail';
        div.textContent = `  FAIL: ${name} — ${e.message}`;
        failed++;
    }
    results.appendChild(div);
}

export function assert(condition, msg = 'Assertion failed') {
    if (!condition) throw new Error(msg);
}

export function assertEqual(actual, expected, msg) {
    if (actual !== expected) {
        throw new Error(msg || `Expected ${expected}, got ${actual}`);
    }
}

export function assertDeepEqual(actual, expected, msg) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(msg || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

// Summary at end
window.addEventListener('load', () => {
    setTimeout(() => {
        const summary = document.createElement('h2');
        summary.style.color = failed > 0 ? '#f00' : '#0f0';
        summary.textContent = `Results: ${passed} passed, ${failed} failed`;
        results.appendChild(summary);
    }, 100);
});
