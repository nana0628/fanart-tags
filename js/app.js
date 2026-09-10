const LS_FAV = 'fanart_favorites_v2';
const LS_ORDER = 'fanart_fav_order_v2';
/* =========================
状態
========================= */
let favorites = JSON.parse(localStorage.getItem(LS_FAV) || '[]');
let favOrder = JSON.parse(localStorage.getItem(LS_ORDER) || '[]');
let selectedYears = [];
let draggedId = null;
/* =========================
要素取得
========================= */
const $ = selector => document.querySelector(selector);
/* =========================
IDからデータを取得
========================= */
function getItemById(id) {
	return (UNITS.find(unit => unit.id === id) || MEMBERS.find(member => member.id === id));
}
/* =========================
グラデーション作成
========================= */
function getGradient(colors) {
	if (!colors || colors.length === 0) {
		return '#999';
	}
	if (colors.length === 1) {
		return colors[0];
	}
	const step = 100 / colors.length;
	const stops = colors.map((color, index) => {
		const start = index * step;
		const end = (index + 1) * step;
		return `${color} ${start}% ${end}%`;
	});
	return `linear-gradient(135deg, ${stops.join(', ')})`;
}
/* =========================
行の色設定
========================= */
function getReadableColor(hex) {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	/* 色の明るさを計算 */
	const brightness = (r * 299 + g * 587 + b * 114) / 1000;
	/* 明るすぎなければ、そのまま */
	if (brightness < 235) {
		return hex;
	}
	/* 明るすぎる場合は少し暗くする */
	const factor = 0.9;
	const nr = Math.round(r * factor);
	const ng = Math.round(g * factor);
	const nb = Math.round(b * factor);
	return '#' + nr.toString(16).padStart(2, '0') + ng.toString(16).padStart(2, '0') + nb.toString(16).padStart(2, '0');
}

function setItemColors(row, item) {
	/* メンバー */
	if (item.color) {
		const readableColor = getReadableColor(item.color);
		row.style.setProperty('--person-color', readableColor);
		row.style.setProperty('--person-soft', `${item.color}18`);
		row.style.setProperty('--person-border', `${item.color}55`);
		return;
	}
	/* ユニット */
	if (item.colors) {
		const gradient = getGradient(item.colors);
		row.style.setProperty('--person-color', gradient);
		row.style.setProperty('--person-soft', '#f4f6f8');
		row.style.setProperty('--person-border', '#d8dde5');
	}
}
/* =========================
カラーマーカー
========================= */
function createColorMarker(item) {
	const marker = document.createElement('span');
	marker.className = 'color-marker';
	/* メンバー */
	if (item.color) {
		marker.style.background = item.color;
		return marker;
	}
	/* ユニット */
	if (item.colors) {
		marker.classList.add('unit-color-marker');
		marker.style.background = getGradient(item.colors);
	}
	return marker;
}
/* =========================
お気に入り
========================= */
function isFavorite(id) {
	return favorites.includes(id);
}

function saveFavorites() {
	localStorage.setItem(LS_FAV, JSON.stringify(favorites));
	localStorage.setItem(LS_ORDER, JSON.stringify(favOrder));
}

function toggleFavorite(id) {
	if (isFavorite(id)) {
		favorites = favorites.filter(favoriteId => favoriteId !== id);
		favOrder = favOrder.filter(favoriteId => favoriteId !== id);
	} else {
		favorites.push(id);
		favOrder.push(id);
	}
	saveFavorites();
	render();
}
/* =========================
コピー
========================= */
async function copyText(text, button) {
	try {
		await navigator.clipboard.writeText(text);
	} catch (error) {
		const textarea = document.createElement('textarea');
		textarea.value = text;
		document.body.appendChild(textarea);
		textarea.select();
		document.execCommand('copy');
		textarea.remove();
	}
	if (button) {
		const originalText = button.textContent;
		button.textContent = 'コピー済み';
		button.classList.add('copied');
		setTimeout(() => {
			button.textContent = originalText;
			button.classList.remove('copied');
		}, 1500);
	}
	showToast(`${text}をコピーしました`);
}
/* =========================
Toast
========================= */
function showToast(message) {
	const toast = $('#toast');
	if (!toast) {
		return;
	}
	toast.textContent = message;
	toast.classList.add('show');
	clearTimeout(showToast.timer);
	showToast.timer = setTimeout(() => {
		toast.classList.remove('show');
	}, 2000);
}
/* =========================
行を作成
========================= */
function createItemRow(item, options = {}) {
	const {
		draggable = false,
			showDragHandle = false
	} = options;
	const row = document.createElement('div');
	row.className = 'row';
	row.dataset.id = item.id;
	setItemColors(row, item);
	/* お気に入り */
	const favButton = document.createElement('button');
	favButton.className = 'fav';
	favButton.type = 'button';
	if (isFavorite(item.id)) {
		favButton.textContent = '★';
		favButton.classList.add('active');
	} else {
		favButton.textContent = '☆';
	}
	favButton.addEventListener('click',
		() => {
			toggleFavorite(item.id);
		});
	/* カラー */
	const colorMarker = createColorMarker(item);
	/* 名前 */
	const nameArea = document.createElement('div');
	const name = document.createElement('div');
	name.className = 'name';
	name.textContent = item.name;
	const kana = document.createElement('div');
	kana.className = 'kana';
	kana.textContent = item.kana;
	nameArea.append(name, kana);
	/* タグ */
	const tagWrap = document.createElement('div');
	tagWrap.className = 'tag-wrap';
	const tag = document.createElement('div');
	tag.className = 'tag';
	tag.textContent = item.tag;
	tagWrap.appendChild(tag);
	/* コピー */
	const copyButton = document.createElement('button');
	copyButton.className = 'copy';
	copyButton.type = 'button';
	copyButton.textContent = 'コピー';
	copyButton.addEventListener('click',
		() => {
			copyText(item.tag, copyButton);
		});
	/* お気に入りの並べ替え */
	if (showDragHandle) {
		const dragHandle = document.createElement('button');
		dragHandle.className = 'drag';
		dragHandle.type = 'button';
		dragHandle.textContent = '≡';
		row.draggable = draggable;
		row.append(dragHandle, favButton, colorMarker, nameArea, tagWrap, copyButton);
	} else {
		row.append(favButton, colorMarker, nameArea, tagWrap, copyButton);
	}
	return row;
}
/* =========================
セクション作成
========================= */
function createSection(titleText, options = {}) {
	const {
		debut = null,
			className = '',
			sectionId = '',
	} = options;
	const section = document.createElement('section');
	section.className = `panel section ${className}`.trim();
	if (sectionId) {
		section.dataset.sectionId = sectionId;
	}
	/* ヘッダー */
	const header = document.createElement('div');
	header.className = 'section-head';
	const toggle = document.createElement('button');
	toggle.className = 'chev';
	toggle.type = 'button';
	toggle.textContent = '〉';
	const title = document.createElement('div');
	title.className = 'section-title';
	title.textContent = titleText;
	header.append(toggle, title);
	/* デビュー日 */
	if (debut) {
		const debutElement = document.createElement('div');
		debutElement.className = 'debut';
		debutElement.textContent = `${debut} デビュー`;
		header.appendChild(debutElement);
	}
	/* 本体 */
	const body = document.createElement('div');
	body.className = 'section-body';
	/* 開閉 */
	function toggleSection() {
		section.classList.toggle('open');
	}
	toggle.addEventListener('click', event => {
		event.stopPropagation();
		toggleSection();
	});
	header.addEventListener('click', toggleSection);
	section.append(header, body);
	return {
		section,
		body
	};
}
/* =========================
ユニット
========================= */
function renderUnits() {
	const container = $('#groups');
	if (!UNITS || UNITS.length === 0) {
		return;
	}
	const {
		section,
		body
	} = createSection('ユニット', {
		className: 'unit-section',
		sectionId: 'units'
	});
	UNITS.forEach(unit => {
		body.appendChild(createItemRow(unit));
	});
	container.appendChild(section);
}
/* =========================
メンバーグループ
========================= */
function renderMemberGroups() {
	const container = $('#groups');
	const groups = [...new Set(MEMBERS.map(member => {
		if (member.group === '-') {
			return `${member.debut}`;
		}
		return `${member.group}`;
	}))];
	groups.forEach(groupName => {
		const members = MEMBERS.filter(member => {
			if (member.group === '-') {
				return `${member.debut}` === groupName;
			}
			return `${member.group}` === groupName;
		});
		/* 年フィルター */
		const filteredMembers = members.filter(member => {
			if (selectedYears.length === 0) {
				return true;
			}
			const year = new Date(member.debut).getFullYear();
			return selectedYears.includes(year);
		});
		if (filteredMembers.length === 0) {
			return;
		}
		const {
			section,
			body
		} = createSection(groupName.includes('/') ? '-' : groupName, {
			debut: filteredMembers[0].debut,
			sectionId: `group-${groupName}`
		});
		filteredMembers.forEach(member => {
			body.appendChild(createItemRow(member));
		});
		container.appendChild(section);
	});
}
/* =========================
お気に入り
========================= */
function renderFavorites() {
	const favList = $('#favList');
	if (!favList) {
		return;
	}
	favList.innerHTML = '';
	const orderedIds = [...favOrder.filter(id => favorites.includes(id)), ...favorites.filter(id => !favOrder.includes(id))];
	const items = orderedIds.map(id => getItemById(id)).filter(Boolean);
	/* 件数 */
	const favCount = $('#favCount');
	if (favCount) {
		favCount.textContent = `${items.length}件`;
	}
	/* 空 */
	if (items.length === 0) {
		const empty = document.createElement('div');
		empty.className = 'empty';
		empty.textContent = 'お気に入りはまだありません';
		favList.appendChild(empty);
		return;
	}
	/* お気に入り一覧 */
	items.forEach(item => {
		const row = createItemRow(item, {
			draggable: true,
			showDragHandle: true
		});
		addDragEvents(row);
		favList.appendChild(row);
	});
}
/* =========================
すべて開く・閉じる
========================= */
function toggleAllGroups() {
	const sections = document.querySelectorAll('#groups .section');
	const button = $('#toggleAllGroups');
	if (sections.length === 0) {
		return;
	}
	const shouldOpen = button.dataset.state !== 'open';
	sections.forEach(section => {
		section.classList.toggle('open', shouldOpen);
	});
	button.dataset.state = shouldOpen ? 'open' : 'closed';
	button.textContent = shouldOpen ? 'すべて閉じる' : 'すべて開く';
}
const toggleAllButton = $('#toggleAllGroups');
if (toggleAllButton) {
	toggleAllButton.addEventListener('click', toggleAllGroups);
}
/* =========================
ドラッグ＆ドロップ
========================= */
function addDragEvents(row) {
	row.addEventListener('dragstart', event => {
		draggedId = row.dataset.id;
		event.dataTransfer.effectAllowed = 'move';
		row.classList.add('dragging');
	});
	row.addEventListener('dragend',
		() => {
			row.classList.remove('dragging');
			draggedId = null;
			document.querySelectorAll('.drop-target').forEach(element => {
				element.classList.remove('drop-target');
			});
		});
	row.addEventListener('dragover', event => {
		event.preventDefault();
		row.classList.add('drop-target');
	});
	row.addEventListener('dragleave',
		() => {
			row.classList.remove('drop-target');
		});
	row.addEventListener('drop', event => {
		event.preventDefault();
		row.classList.remove('drop-target');
		const targetId = row.dataset.id;
		if (!draggedId || draggedId === targetId) {
			return;
		}
		const fromIndex = favOrder.indexOf(draggedId);
		const toIndex = favOrder.indexOf(targetId);
		if (fromIndex === -1 || toIndex === -1) {
			return;
		}
		favOrder.splice(fromIndex, 1);
		favOrder.splice(toIndex, 0, draggedId);
		saveFavorites();
		renderFavorites();
	});
}
/* =========================
年フィルター
========================= */
function renderYears() {
	const yearsContainer = $('#years');
	if (!yearsContainer) {
		return;
	}
	yearsContainer.innerHTML = '';
	const years = [...new Set(MEMBERS.map(member => new Date(member.debut).getFullYear()))].sort(
		(a, b) => a - b);
	years.forEach(year => {
		const label = document.createElement('label');
		label.className = 'year';
		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.checked = selectedYears.includes(year);
		checkbox.addEventListener('change',
			() => {
				if (checkbox.checked) {
					selectedYears.push(year);
				} else {
					selectedYears = selectedYears.filter(selectedYear => selectedYear !== year);
				}
				render();
			});
		const text = document.createElement('span');
		text.textContent = `${year}年`;
		label.append(checkbox, text);
		yearsContainer.appendChild(label);
	});
	/* 解除ボタン */
	const clearButton = $('#clearYears');
	if (clearButton) {
		clearButton.onclick = () => {
			selectedYears = [];
			renderYears();
			render();
		};
	}
}
/* =========================
お気に入り開閉
========================= */
function setupFavoriteToggle() {
	const section = $('#favoriteSection');
	const toggle = $('#favoriteToggle');
	if (!section || !toggle) {
		return;
	}
	toggle.addEventListener('click', event => {
		event.stopPropagation();
		section.classList.toggle('open');
	});
	const header = section.querySelector('.section-head');
	header.addEventListener('click',
		() => {
			section.classList.toggle('open');
		});
}
/* =========================
開いているグループを保存
========================= */
function getOpenSections() {
	return [...document.querySelectorAll('#groups .section.open')].map(section => section.dataset.sectionId).filter(Boolean);
}
/* =========================
全体描画
========================= */
function render() {
	const openSections = getOpenSections();
	const groups = $('#groups');
	if (groups) {
		groups.innerHTML = '';
	}
	renderFavorites();
	renderUnits();
	renderMemberGroups();
	// 再描画後に開いていたグループを復元
	openSections.forEach(sectionId => {
		const section = document.querySelector(`#groups .section[data-section-id="${sectionId}"]`);
		if (section) {
			section.classList.add('open');
		}
	});
}
/* =========================
初期化
========================= */
function init() {
	renderYears();
	setupFavoriteToggle();
	render();
}
init();