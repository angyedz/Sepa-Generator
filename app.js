/**
 * SEPA IBAN Generator & Validator
 * Client-Side JavaScript Logic
 */

// ===== DOM ELEMENTS =====
const tabGenerator = document.getElementById('tab-generator');
const tabValidator = document.getElementById('tab-validator');
const contentGenerator = document.getElementById('content-generator');
const contentValidator = document.getElementById('content-validator');

// Generator elements
const generatorForm = document.getElementById('generator-form');
const countrySelect = document.getElementById('country-select');
const customCountryGroup = document.getElementById('custom-country-group');
const customCountryCodeInput = document.getElementById('custom-country-code');
const bankCodeInput = document.getElementById('bank-code-input');
const bankHint = document.getElementById('bank-hint');
const accLengthInput = document.getElementById('acc-length-input');
const attemptsInput = document.getElementById('attempts-input');
const onlineCheckToggle = document.getElementById('online-check-toggle');
const delayInput = document.getElementById('delay-input');
const delayValue = document.getElementById('delay-value');
const btnGenerateStart = document.getElementById('btn-generate-start');

// Validator elements
const ibanValidateInput = document.getElementById('iban-validate-input');
const btnPasteIban = document.getElementById('btn-paste-iban');
const btnValidateSubmit = document.getElementById('btn-validate-submit');
const valResultContainer = document.getElementById('validation-result-container');
const valBadge = document.getElementById('val-badge');
const valIbanDisplay = document.getElementById('val-iban-display');
const valOfflineStatus = document.getElementById('val-offline-status');
const valOnlineStatus = document.getElementById('val-online-status');
const valBankName = document.getElementById('val-bank-name');
const valBic = document.getElementById('val-bic');
const valBankAddress = document.getElementById('val-bank-address');

// Progress & Results elements
const progressWrapper = document.getElementById('progress-wrapper');
const progressStatusText = document.getElementById('progress-status-text');
const progressPercent = document.getElementById('progress-percent');
const progressBar = document.getElementById('progress-bar');
const progressSubText = document.getElementById('progress-sub-text');
const btnCancelGeneration = document.getElementById('btn-cancel-generation');

const resultsFilterContainer = document.getElementById('results-filter-container');
const countAll = document.getElementById('count-all');
const countLive = document.getElementById('count-live');
const countDead = document.getElementById('count-dead');

const btnCopyFiltered = document.getElementById('btn-copy-filtered');
const btnExportMenu = document.getElementById('btn-export-menu');
const exportDropdown = document.getElementById('export-dropdown');
const exportTxtBtn = document.getElementById('export-txt');
const exportJsonBtn = document.getElementById('export-json');
const btnClearResults = document.getElementById('btn-clear-results');

const emptyStateMessage = document.getElementById('empty-state-message');
const resultsListElement = document.getElementById('results-list-element');
const notificationContainer = document.getElementById('notification-container');
const apiStatusIndicator = document.getElementById('api-status-indicator');

// ===== STATE MANAGEMENT =====
let generatedIbans = [];
let currentFilter = 'all';
let isGenerating = false;
let cancelGenerationFlag = false;

// Country Defaults Database
const countryDefaults = {
    DE: { bankCode: '50010517', accLength: 10, hint: 'ING-DiBa (Германия)' },
    FR: { bankCode: '3000207556', accLength: 11, hint: 'Société Générale (Франция)' },
    ES: { bankCode: '21000418', accLength: 10, hint: 'CaixaBank (Испания)' },
    IT: { bankCode: '0103001600', accLength: 12, hint: 'Intesa Sanpaolo (Италия)' },
    NL: { bankCode: 'INGB', accLength: 10, hint: 'ING Bank (Нидерланды)' },
    custom: { bankCode: '', accLength: 10, hint: 'Пользовательский формат' }
};

// ===== INITIALIZATION & EVENTS =====
document.addEventListener('DOMContentLoaded', () => {
    // Check API Status initially
    checkApiStatus();

    // Tab Navigation
    tabGenerator.addEventListener('click', () => switchTab('generator'));
    tabValidator.addEventListener('click', () => switchTab('validator'));

    // Country selection change
    countrySelect.addEventListener('change', handleCountryChange);

    // Delay range updates
    delayInput.addEventListener('input', (e) => {
        delayValue.textContent = `${e.target.value} мс`;
    });

    // Start generating
    generatorForm.addEventListener('submit', (e) => {
        e.preventDefault();
        startGenerationProcess();
    });

    // Cancel generating
    btnCancelGeneration.addEventListener('click', () => {
        cancelGenerationFlag = true;
        showNotification('Отмена генерации...', 'warning');
    });

    // Manual validation submit
    btnValidateSubmit.addEventListener('click', handleManualValidation);
    ibanValidateInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleManualValidation();
    });

    // Clipboard Paste for validator
    btnPasteIban.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            ibanValidateInput.value = text.trim();
            showNotification('Текст вставлен из буфера обмена', 'success');
        } catch (err) {
            showNotification('Не удалось вставить текст из буфера', 'error');
        }
    });

    // Results Filtering
    resultsFilterContainer.addEventListener('click', handleFilterChange);

    // Actions
    btnCopyFiltered.addEventListener('click', copyFilteredIbans);
    btnClearResults.addEventListener('click', clearResults);

    // Export Dropdown toggles
    btnExportMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        btnExportMenu.parentElement.classList.toggle('open');
    });
    
    document.addEventListener('click', () => {
        btnExportMenu.parentElement.classList.remove('open');
    });

    exportTxtBtn.addEventListener('click', () => exportResults('txt'));
    exportJsonBtn.addEventListener('click', () => exportResults('json'));
});

// ===== TAB SYSTEM =====
function switchTab(tab) {
    if (isGenerating) {
        showNotification('Нельзя переключить вкладку во время генерации', 'warning');
        return;
    }

    if (tab === 'generator') {
        tabGenerator.classList.add('active');
        tabGenerator.setAttribute('aria-selected', 'true');
        tabValidator.classList.remove('active');
        tabValidator.setAttribute('aria-selected', 'false');
        
        contentGenerator.classList.remove('hidden-field');
        contentValidator.classList.add('hidden-field');
    } else {
        tabValidator.classList.add('active');
        tabValidator.setAttribute('aria-selected', 'true');
        tabGenerator.classList.remove('active');
        tabGenerator.setAttribute('aria-selected', 'false');
        
        contentValidator.classList.remove('hidden-field');
        contentGenerator.classList.add('hidden-field');
    }
}

// ===== FORM LOGIC =====
function handleCountryChange() {
    const selected = countrySelect.value;
    
    if (selected === 'custom') {
        customCountryGroup.classList.remove('hidden-field');
    } else {
        customCountryGroup.classList.add('hidden-field');
    }

    const config = countryDefaults[selected] || countryDefaults['DE'];
    bankCodeInput.value = config.bankCode;
    accLengthInput.value = config.accLength;
    bankHint.textContent = config.hint;
}

// ===== SEPA ALGORITHM LOGIC =====

function letterToNumber(char) {
    return char.toUpperCase().charCodeAt(0) - 55;
}

function calculateCheckDigits(countryCode, bban) {
    // SEPA calculation check digits algorithm (MOD-97-10)
    // Rearranged structure: BBAN + CountryCode + "00"
    const rearranged = bban.toUpperCase() + countryCode.toUpperCase() + "00";
    let numeric = "";
    
    for (let i = 0; i < rearranged.length; i++) {
        const c = rearranged[i];
        if (/[a-zA-Z]/.test(c)) {
            numeric += letterToNumber(c);
        } else {
            numeric += c;
        }
    }
    
    try {
        const numericBigInt = BigInt(numeric);
        const check = 98n - (numericBigInt % 97n);
        return check.toString().padStart(2, '0');
    } catch (e) {
        // Fallback for environment without BigInt (unlikely for modern browsers)
        console.error("BigInt computation error", e);
        return "00";
    }
}

function generateSepaIban(countryCode, bankCode, accountLength) {
    const minAcc = 10n ** BigInt(accountLength - 1);
    const maxAcc = (10n ** BigInt(accountLength)) - 1n;
    
    // Generate secure/pseudo-random account number
    const range = maxAcc - minAcc + 1n;
    const array = new Uint32Array(2);
    window.crypto.getRandomValues(array);
    // Combine 2 random 32-bit values into one BigInt
    const randomBig = (BigInt(array[0]) << 32n) | BigInt(array[1]);
    const randOffset = randomBig % range;
    const account = (minAcc + randOffset).toString();
    
    const bban = bankCode + account;
    const check = calculateCheckDigits(countryCode, bban);
    return countryCode.toUpperCase() + check + bban;
}

function validateIbanOffline(iban) {
    iban = iban.replace(/\s+/g, "").toUpperCase();
    if (iban.length < 4) return false;
    
    const rearranged = iban.substring(4) + iban.substring(0, 4);
    let numeric = "";
    
    for (let i = 0; i < rearranged.length; i++) {
        const c = rearranged[i];
        if (/[a-zA-Z]/.test(c)) {
            numeric += letterToNumber(c);
        } else {
            numeric += c;
        }
    }
    
    try {
        return BigInt(numeric) % 97n === 1n;
    } catch (e) {
        return false;
    }
}

// ===== API / ONLINE CHECK =====

async function checkApiStatus() {
    try {
        const testIban = "DE89370400440532013000"; // Test invalid or dummy IBAN format
        const response = await fetch(`https://openiban.com/validate/${testIban}?getBIC=true`, { signal: AbortSignal.timeout(3000) });
        if (response.ok) {
            apiStatusIndicator.querySelector('.status-dot').className = 'status-dot online';
            apiStatusIndicator.querySelector('.status-text').textContent = 'OpenIBAN API Connected';
        }
    } catch (e) {
        apiStatusIndicator.querySelector('.status-dot').className = 'status-dot offline';
        apiStatusIndicator.querySelector('.status-text').textContent = 'OpenIBAN API Offline';
    }
}

async function validateIbanOnline(iban) {
    iban = iban.replace(/\s+/g, "").toUpperCase();
    const url = `https://openiban.com/validate/${iban}?getBIC=true&getBankData=true`;
    
    try {
        const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (!resp.ok) {
            if (resp.status === 429) {
                throw new Error("api_rate_limit");
            }
            throw new Error("api_failure");
        }
        const data = await resp.json();
        return {
            valid: data.valid || false,
            bankName: data.bankData?.name || null,
            bic: data.bankData?.bic || data.bic || null,
            city: data.bankData?.city || null,
            zip: data.bankData?.zip || null,
            error: null
        };
    } catch (err) {
        console.error("Online validation failed: ", err);
        return {
            valid: null,
            bankName: null,
            bic: null,
            city: null,
            zip: null,
            error: err.message || "network_error"
        };
    }
}

// ===== GENERATOR RUN LOGIC =====

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function startGenerationProcess() {
    // 1. Inputs reading
    const selectedCountry = countrySelect.value;
    let countryCode = "DE";
    if (selectedCountry === 'custom') {
        countryCode = customCountryCodeInput.value.trim().toUpperCase();
        if (countryCode.length !== 2 || !/^[A-Z]{2}$/.test(countryCode)) {
            showNotification('Код страны должен состоять из 2 латинских букв', 'error');
            return;
        }
    } else {
        countryCode = selectedCountry;
    }

    const bankCode = bankCodeInput.value.trim();
    if (!bankCode) {
        showNotification('Укажите код банка', 'error');
        return;
    }

    const accountLength = parseInt(accLengthInput.value);
    if (isNaN(accountLength) || accountLength < 5 || accountLength > 15) {
        showNotification('Длина счета должна быть от 5 до 15 цифр', 'error');
        return;
    }

    const attempts = parseInt(attemptsInput.value);
    if (isNaN(attempts) || attempts <= 0 || attempts > 100) {
        showNotification('Количество попыток должно быть от 1 до 100', 'error');
        return;
    }

    const onlineCheck = onlineCheckToggle.checked;
    const delay = parseInt(delayInput.value);

    // 2. Prep UI State
    isGenerating = true;
    cancelGenerationFlag = false;
    toggleFormDisabled(true);
    
    // Clear and reveal progress
    progressWrapper.classList.remove('hidden-field');
    updateProgress(0, attempts, 'Запуск...');
    
    // Clear old result list if starting fresh
    clearResultsDataOnly();

    // 3. Process loop
    let successes = 0;
    
    for (let i = 1; i <= attempts; i++) {
        if (cancelGenerationFlag) {
            progressSubText.textContent = 'Генерация прервана пользователем';
            break;
        }

        const iban = generateSepaIban(countryCode, bankCode, accountLength);
        updateProgress(i, attempts, `Генерация IBAN ${i} из ${attempts}...`);

        // Perform validation
        const offlineOk = validateIbanOffline(iban);
        let onlineOk = null;
        let bankInfo = null;
        let bicInfo = null;
        let locationInfo = null;

        if (offlineOk && onlineCheck) {
            progressSubText.textContent = `Проверка API: ${formatIbanSpaces(iban)}...`;
            const apiRes = await validateIbanOnline(iban);
            
            if (apiRes.error === 'api_rate_limit') {
                showNotification('Превышен лимит запросов API. Переключение в офлайн режим.', 'warning');
                onlineOk = null;
            } else if (apiRes.error) {
                onlineOk = null;
            } else {
                onlineOk = apiRes.valid;
                bankInfo = apiRes.bankName;
                bicInfo = apiRes.bic;
                if (apiRes.city) {
                    locationInfo = `${apiRes.zip || ''} ${apiRes.city}`.trim();
                }
            }
        }

        // Determine final category (Live/Dead)
        // If online check is active and succeeded/failed:
        // - live if: offline ok and (online is true or online could not be checked (null))
        // - dead if: offline is false or online is false
        const isLive = offlineOk && (onlineCheck ? (onlineOk !== false) : true);
        if (isLive) successes++;

        const itemObj = {
            index: generatedIbans.length + 1,
            iban: iban,
            offlineValid: offlineOk,
            onlineValid: onlineOk,
            isLive: isLive,
            bankName: bankInfo,
            bic: bicInfo,
            location: locationInfo
        };

        generatedIbans.push(itemObj);
        appendResultToList(itemObj);
        updateCounterBadges();
        
        // Wait delay before next
        if (i < attempts && !cancelGenerationFlag) {
            await sleep(delay);
        }
    }

    // 4. Wrap up UI State
    isGenerating = false;
    toggleFormDisabled(false);
    progressWrapper.classList.add('hidden-field');
    
    if (cancelGenerationFlag) {
        showNotification(`Генерация прервана. Найдено ${successes} живых IBAN.`, 'warning');
    } else {
        showNotification(`Генерация завершена. Найдено ${successes} живых IBAN!`, 'success');
    }
}

function toggleFormDisabled(disabled) {
    countrySelect.disabled = disabled;
    customCountryCodeInput.disabled = disabled;
    bankCodeInput.disabled = disabled;
    accLengthInput.disabled = disabled;
    attemptsInput.disabled = disabled;
    onlineCheckToggle.disabled = disabled;
    delayInput.disabled = disabled;
    btnGenerateStart.disabled = disabled;
    btnClearResults.disabled = disabled;
}

function updateProgress(current, total, statusText) {
    const percent = Math.round((current / total) * 100);
    progressStatusText.textContent = `Генерация: ${current}/${total}`;
    progressPercent.textContent = `${percent}%`;
    progressBar.style.width = `${percent}%`;
    progressSubText.textContent = statusText;
}

// ===== MANUAL VALIDATION LOGIC =====
async function handleManualValidation() {
    const rawIban = ibanValidateInput.value.trim();
    if (!rawIban) {
        showNotification('Введите IBAN для проверки', 'error');
        return;
    }

    // Prepare Result container
    valResultContainer.classList.remove('hidden-field');
    valIbanDisplay.textContent = formatIbanSpaces(rawIban);
    
    valBadge.className = 'result-badge badge-pending';
    valBadge.textContent = 'Проверка...';
    
    valOfflineStatus.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Вычисление...`;
    valOnlineStatus.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Запрос...`;
    valBankName.textContent = '-';
    valBic.textContent = '-';
    valBankAddress.textContent = '-';

    // Perform validation
    const offlineOk = validateIbanOffline(rawIban);
    
    // Offline status update
    if (offlineOk) {
        valOfflineStatus.innerHTML = `<span class="text-success"><i class="fa-solid fa-circle-check"></i> Корректный MOD-97</span>`;
    } else {
        valOfflineStatus.innerHTML = `<span class="text-error"><i class="fa-solid fa-circle-xmark"></i> Некорректный MOD-97</span>`;
        valOnlineStatus.innerHTML = `<span class="text-muted"><i class="fa-solid fa-ban"></i> Пропущено (Офлайн ошибка)</span>`;
        valBadge.className = 'result-badge badge-error';
        valBadge.textContent = 'НЕВАЛИДНЫЙ';
        showNotification('IBAN не прошел офлайн-валидацию по алгоритму MOD-97', 'error');
        return;
    }

    // Fetch online
    const apiRes = await validateIbanOnline(rawIban);
    
    if (apiRes.error) {
        valOnlineStatus.innerHTML = `<span class="text-warning"><i class="fa-solid fa-triangle-exclamation"></i> API Недоступен (${apiRes.error})</span>`;
        // Since offline was OK, we treat as potentially valid
        valBadge.className = 'result-badge badge-success';
        valBadge.textContent = 'ОФЛАЙН ВАЛИДНЫЙ';
        showNotification('Офлайн валидация успешна. Онлайн-проверка сорвалась.', 'warning');
    } else {
        if (apiRes.valid) {
            valOnlineStatus.innerHTML = `<span class="text-success"><i class="fa-solid fa-circle-check"></i> Подтвержден (200 OK)</span>`;
            valBadge.className = 'result-badge badge-success';
            valBadge.textContent = 'ЖИВОЙ / VALID';
            showNotification('IBAN полностью валиден и подтвержден!', 'success');
        } else {
            valOnlineStatus.innerHTML = `<span class="text-error"><i class="fa-solid fa-circle-xmark"></i> Не существует (404/Invalid)</span>`;
            valBadge.className = 'result-badge badge-error';
            valBadge.textContent = 'МЕРТВЫЙ / INVALID';
            showNotification('Данный IBAN не существует по данным банка', 'error');
        }
        
        // Fill bank data if present
        valBankName.textContent = apiRes.bankName || 'Неизвестный банк';
        valBic.textContent = apiRes.bic || 'Неизвестно';
        valBankAddress.textContent = apiRes.city ? `${apiRes.zip || ''} ${apiRes.city}`.trim() : 'Неизвестно';
    }
}

// ===== RESULTS & FILTER LOGIC =====

function formatIbanSpaces(iban) {
    return iban.replace(/\s+/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
}

function appendResultToList(item) {
    emptyStateMessage.classList.add('hidden-field');

    const li = document.createElement('li');
    li.id = `iban-item-${item.index}`;
    li.setAttribute('data-live', item.isLive ? 'true' : 'false');
    
    // Apply filters visually immediately
    if (currentFilter === 'live' && !item.isLive) {
        li.classList.add('hidden-field');
    } else if (currentFilter === 'dead' && item.isLive) {
        li.classList.add('hidden-field');
    }

    // Build badges
    let badgesHtml = '';
    if (item.offlineValid) {
        badgesHtml += `<span class="badge badge-offline-success" title="Контрольное число совпадает">Offline</span>`;
    } else {
        badgesHtml += `<span class="badge badge-error-status" title="Контрольное число не совпадает">Offline Err</span>`;
    }

    if (item.onlineValid === true) {
        badgesHtml += `<span class="badge badge-online-success" title="Банк подтверждает существование">Online</span>`;
    } else if (item.onlineValid === false) {
        badgesHtml += `<span class="badge badge-error-status" title="Банк отклонил существование счета">Online Err</span>`;
    } else if (item.onlineValid === null && item.offlineValid) {
        badgesHtml += `<span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-muted);" title="Онлайн проверка не выполнялась">Offline-Only</span>`;
    }

    // Tooltip detail info
    let hoverTitle = '';
    if (item.bankName) {
        hoverTitle = `${item.bankName} | BIC: ${item.bic || '-'}`;
        if (item.location) hoverTitle += ` (${item.location})`;
    }

    li.innerHTML = `
        <div class="item-left">
            <span class="item-index">#${item.index}</span>
            <span class="item-iban" title="${hoverTitle}">${formatIbanSpaces(item.iban)}</span>
            <div class="item-badges">
                ${badgesHtml}
            </div>
        </div>
        <div class="item-actions">
            <button class="btn btn-secondary btn-sm" onclick="copySingleIban('${item.iban}')" title="Копировать IBAN">
                <i class="fa-solid fa-copy"></i>
            </button>
        </div>
    `;

    resultsListElement.appendChild(li);
}

function updateCounterBadges() {
    const all = generatedIbans.length;
    const live = generatedIbans.filter(i => i.isLive).length;
    const dead = all - live;

    countAll.textContent = all;
    countLive.textContent = live;
    countDead.textContent = dead;

    // Enable/disable buttons
    const hasItems = all > 0;
    btnCopyFiltered.disabled = !hasItems;
    btnExportMenu.disabled = !hasItems;
    btnClearResults.disabled = !hasItems;
}

function handleFilterChange(e) {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;

    // Set active tab
    resultsFilterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    currentFilter = btn.getAttribute('data-filter');
    
    // Apply filters
    const listItems = resultsListElement.querySelectorAll('li');
    listItems.forEach(li => {
        const isItemLive = li.getAttribute('data-live') === 'true';
        
        if (currentFilter === 'all') {
            li.classList.remove('hidden-field');
        } else if (currentFilter === 'live') {
            if (isItemLive) {
                li.classList.remove('hidden-field');
            } else {
                li.classList.add('hidden-field');
            }
        } else if (currentFilter === 'dead') {
            if (!isItemLive) {
                li.classList.remove('hidden-field');
            } else {
                li.classList.add('hidden-field');
            }
        }
    });

    showNotification(`Фильтр изменен: ${btn.textContent.trim()}`, 'success');
}

// ===== ACTIONS & EXPORTS =====

window.copySingleIban = function(iban) {
    const raw = iban.replace(/\s+/g, "").toUpperCase();
    navigator.clipboard.writeText(raw)
        .then(() => showNotification('IBAN скопирован в буфер обмена', 'success'))
        .catch(() => showNotification('Не удалось скопировать', 'error'));
};

function copyFilteredIbans() {
    const filtered = getFilteredIbansArray();
    if (filtered.length === 0) {
        showNotification('Нет подходящих IBAN для копирования', 'warning');
        return;
    }

    const textToCopy = filtered.map(item => item.iban.replace(/\s+/g, "").toUpperCase()).join('\n');
    
    navigator.clipboard.writeText(textToCopy)
        .then(() => showNotification(`Скопировано IBAN в буфер: ${filtered.length}`, 'success'))
        .catch(() => showNotification('Ошибка копирования', 'error'));
}

function getFilteredIbansArray() {
    return generatedIbans.filter(item => {
        if (currentFilter === 'all') return true;
        if (currentFilter === 'live') return item.isLive;
        if (currentFilter === 'dead') return !item.isLive;
        return true;
    });
}

function clearResultsDataOnly() {
    generatedIbans = [];
    resultsListElement.innerHTML = '';
    emptyStateMessage.classList.remove('hidden-field');
    updateCounterBadges();
}

function clearResults() {
    if (isGenerating) return;
    clearResultsDataOnly();
    showNotification('Результаты очищены', 'success');
}

function exportResults(format) {
    const filtered = getFilteredIbansArray();
    if (filtered.length === 0) {
        showNotification('Список для экспорта пуст', 'warning');
        return;
    }

    let fileContent = '';
    let mimeType = 'text/plain';
    let fileExtension = 'txt';

    if (format === 'txt') {
        fileContent = filtered.map(item => item.iban.replace(/\s+/g, "").toUpperCase()).join('\r\n');
    } else if (format === 'json') {
        fileContent = JSON.stringify(filtered, null, 2);
        mimeType = 'application/json';
        fileExtension = 'json';
    }

    const blob = new Blob([fileContent], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    link.href = url;
    link.download = `sepa_ibans_${currentFilter}_${timestamp}.${fileExtension}`;
    
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification(`Файл экспортирован в формате ${format.toUpperCase()}`, 'success');
}

// ===== NOTIFICATION BANNERS =====

function showNotification(message, type = 'success') {
    const id = 'notif-' + Date.now();
    const notification = document.createElement('div');
    notification.id = id;
    notification.className = `notification ${type}`;
    
    let iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-exclamation';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation';
    if (type === 'info') iconClass = 'fa-circle-info';

    notification.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        <span>${message}</span>
    `;

    notificationContainer.appendChild(notification);

    // Slide out after 3.5s
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%) scale(0.9)';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3500);
}
